
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { pool } from './config/database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

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

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Import routes
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patients.routes';
import userRoutes from './routes/users.routes';
import webhookRoutes from './routes/webhook.routes';
import appointmentRoutes from './routes/appointments.routes';
import prescriptionRoutes from './routes/prescriptions.routes';
import paymentRoutes from './routes/payments.routes';
import notificationRoutes from './routes/notifications.routes';
import communicationRoutes from './routes/communications.routes';
import auditRoutes from './routes/audit.routes';

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/prescriptions', prescriptionRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/communications', communicationRoutes);
app.use('/api/v1/audit', auditRoutes);

// Basic route
app.get('/', (_req, res) => {
  res.json({ 
    message: 'EONMeds Backend API',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check endpoint
app.get('/health', async (_req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'unknown'
  };

  // Test database connection without crashing
  try {
    const { testDatabaseConnection } = await import('./config/database');
    const dbConnected = await testDatabaseConnection();
    health.database = dbConnected ? 'connected' : 'disconnected';
  } catch (error) {
    health.database = 'error';
    console.error('Health check DB test failed:', error);
  }

  res.json(health);
});

// API test endpoint
app.get('/api/v1/test', (_req, res) => {
  res.json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  // Force Railway rebuild with Babel configuration
  console.log('🚀 Server is running!');
  console.log(`📡 Listening on port ${PORT}`);
  console.log('🏥 EONMeds Backend API');
  
  // Log environment info for debugging
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Database Host:', process.env.DB_HOST ? '✓ Configured' : '✗ Missing');
  console.log('Database Name:', process.env.DB_NAME ? '✓ Configured' : '✗ Missing');
  console.log('JWT Secret:', process.env.JWT_SECRET ? '✓ Configured' : '✗ Missing');
  console.log('Port:', PORT);

  // Health check: http://localhost:${PORT}/health
  // API test: http://localhost:${PORT}/api/v1/test
}); 