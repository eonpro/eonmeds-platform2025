
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testDatabaseConnection } from './config/database';
import auditMiddleware from './middleware/audit';

// Import all routes at the top
import webhookRoutes from './routes/webhook.routes';
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patients.routes';
import practitionerRoutes from './routes/practitioner.routes';
import appointmentRoutes from './routes/appointment.routes';
import documentRoutes from './routes/document.routes';
import auditRoutes from './routes/audit.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API version endpoint
app.get('/api/v1', (req, res) => {
  res.json({ 
    version: '1.0.0',
    endpoints: {
      webhooks: '/api/v1/webhooks',
      auth: '/api/v1/auth',
      patients: '/api/v1/patients',
      practitioners: '/api/v1/practitioners',
      appointments: '/api/v1/appointments',
      documents: '/api/v1/documents',
      audit: '/api/v1/audit'
    }
  });
});

// Webhook routes (always available - no auth required)
app.use('/api/v1/webhooks', webhookRoutes);
console.log('✅ Webhook routes loaded (always available)');

// Start server
app.listen(PORT, () => {
  console.log('🚀 Server is running!');
  console.log(`📡 Listening on port ${PORT}`);
  console.log('🏥 EONMeds Backend API');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database Host: ${process.env.DB_HOST ? '✓ Configured' : '✗ Missing'}`);
  console.log(`Database Name: ${process.env.DB_NAME ? '✓ Configured' : '✗ Missing'}`);
  console.log(`JWT Secret: ${process.env.JWT_SECRET ? '✓ Configured' : '✗ Missing'}`);
  console.log(`Port: ${PORT}`);
});

// Initialize database and routes
let databaseConnected = false;

async function initializeDatabase() {
  console.log('Attempting database connection...');
  
  try {
    const isConnected = await testDatabaseConnection();
    
    if (isConnected) {
      console.log('✅ Database connected successfully');
      databaseConnected = true;
      
      // Register database-dependent routes
      app.use('/api/v1/auth', authRoutes);
      app.use('/api/v1/patients', patientRoutes);
      app.use('/api/v1/practitioners', practitionerRoutes);
      app.use('/api/v1/appointments', appointmentRoutes);
      app.use('/api/v1/documents', documentRoutes);
      app.use('/api/v1/audit', auditMiddleware, auditRoutes);
      
      console.log('✅ All database routes loaded successfully');
    } else {
      console.log('⚠️  Database connection failed - routes requiring database will not be available');
    }
  } catch (error) {
    console.error('❌ Error during database initialization:', error);
  }
}

// Initialize database connection
initializeDatabase();

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    database: databaseConnected ? 'connected' : 'not connected'
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

export default app; 