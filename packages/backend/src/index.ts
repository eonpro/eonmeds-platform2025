
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patients.routes';
import webhookRoutes from './routes/webhook.routes';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'EONMeds API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      test: '/api/v1/test'
    }
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

// Basic test route
app.get('/api/v1/test', (_req, res) => {
  res.json({
    message: 'Backend API is working!',
    auth0Domain: process.env.AUTH0_DOMAIN ? 'configured' : 'not configured'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
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