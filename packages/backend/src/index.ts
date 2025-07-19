
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testDatabaseConnection } from './config/database';
// Remove the audit middleware import for now since it's not used

// Import all routes at the top
import webhookRoutes from './routes/webhook.routes';
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import practitionerRoutes from './routes/practitioner.routes';
import appointmentRoutes from './routes/appointment.routes';
import documentRoutes from './routes/document.routes';
import auditRoutes from './routes/audit.routes';
import paymentRoutes from './routes/payment.routes';
import packageRoutes from './routes/package.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API version endpoint
app.get('/api/v1', (_req, res) => {
  res.json({ 
    version: '1.0.0',
    endpoints: {
      webhooks: '/api/v1/webhooks',
      auth: '/api/v1/auth',
      patients: '/api/v1/patients',
      practitioners: '/api/v1/practitioners',
      appointments: '/api/v1/appointments',
      documents: '/api/v1/documents',
      audit: '/api/v1/audit',
      payments: '/api/v1/payments',
      packages: '/api/v1/packages'
    }
  });
});

// Webhook routes (always available - no auth required)
app.use('/api/v1/webhooks', webhookRoutes);
console.log('✅ Webhook routes loaded (always available)');

// Register all routes immediately (with database check inside each route)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/practitioners', practitionerRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/packages', packageRoutes);
console.log('✅ All routes registered (database check happens per route)');

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
      
      // Ensure critical tables exist
      try {
        // Import pool for direct queries
        const { pool } = await import('./config/database');
        
        // Create invoice_payments table if it doesn't exist
        await pool.query(`
          CREATE TABLE IF NOT EXISTS invoice_payments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_id UUID NOT NULL REFERENCES invoices(id),
            amount DECIMAL(10,2) NOT NULL,
            payment_method VARCHAR(50) NOT NULL,
            payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
            stripe_payment_intent_id VARCHAR(255),
            stripe_charge_id VARCHAR(255),
            status VARCHAR(50) NOT NULL DEFAULT 'succeeded',
            failure_reason TEXT,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW()
          );
        `);
        
        // Create indexes
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_payment_invoice ON invoice_payments(invoice_id);
        `);
        
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_payment_date ON invoice_payments(payment_date);
        `);
        
        console.log('✅ Database tables verified/created');
      } catch (tableError) {
        console.log('Note: Could not verify/create tables:', (tableError as Error).message);
      }
    } else {
      console.log('⚠️  Database connection failed - some functionality may be limited');
    }
  } catch (error) {
    console.error('❌ Error during database initialization:', error);
  }
}

// Initialize database connection
initializeDatabase();

// Export database connection status for routes to check
export { databaseConnected };

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    database: databaseConnected ? 'connected' : 'not connected'
  });
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
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