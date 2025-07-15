
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Log startup
console.log('🚀 Starting EONMeds Backend...');
console.log('Port:', PORT);
console.log('Environment:', process.env.NODE_ENV);

// Trust proxy for Railway
app.set('trust proxy', true);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint (NO DATABASE REQUIRED)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// API test endpoint (always available)
app.get('/api/test', (_req, res) => {
  res.json({ message: 'Backend API is working!' });
});

// Load webhook routes ALWAYS (no database required)
import webhookRoutes from './routes/webhook.routes';
app.use('/api/v1/webhook', webhookRoutes);
console.log('✅ Webhook routes loaded (always available)');

// Lazy load database-dependent routes
let databaseConnected = false;

async function loadDatabaseRoutes() {
  try {
    console.log('Attempting to connect to database...');
    console.log('DB Config:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      ssl: process.env.DB_SSL
    });
    
    const { pool } = await import('./config/database');
    
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connected successfully');
    databaseConnected = true;
    
    // Import routes that need database
    const authRoutes = await import('./routes/auth.routes');
    const patientRoutes = await import('./routes/patient.routes');
    const practitionerRoutes = await import('./routes/practitioner.routes');
    const appointmentRoutes = await import('./routes/appointment.routes');
    const documentRoutes = await import('./routes/document.routes');
    const auditRoutes = await import('./routes/audit.routes');
    
    // Register routes
    app.use('/api/v1/auth', authRoutes.default);
    app.use('/api/v1/patients', patientRoutes.default);
    app.use('/api/v1/practitioners', practitionerRoutes.default);
    app.use('/api/v1/appointments', appointmentRoutes.default);
    app.use('/api/v1/documents', documentRoutes.default);
    app.use('/api/v1/audit', auditRoutes.default);
    
    console.log('✅ All database routes loaded successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    console.error('Service will continue running without database routes');
  }
}

// Database status endpoint
app.get('/api/v1/status', (_req, res) => {
  res.json({
    service: 'running',
    database: databaseConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    database: databaseConnected ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    path: req.path
  });
});

// Start server FIRST, then try database
app.listen(PORT, () => {
  console.log('🚀 Server is running!');
  console.log(`📡 Listening on port ${PORT}`);
  console.log('🏥 EONMeds Backend API');
  
  // Log environment info for debugging
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Database Host:', process.env.DB_HOST ? '✓ Configured' : '✗ Missing');
  console.log('Database Name:', process.env.DB_NAME ? '✓ Configured' : '✗ Missing');
  console.log('JWT Secret:', process.env.JWT_SECRET ? '✓ Configured' : '✗ Missing');
  console.log('Port:', PORT);
  
  // Try to connect to database after server is running
  setTimeout(() => {
    console.log('Attempting database connection...');
    loadDatabaseRoutes();
  }, 2000);
});

export default app; 