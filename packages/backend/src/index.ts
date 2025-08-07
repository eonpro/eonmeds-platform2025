
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testDatabaseConnection, ensureSOAPNotesTable } from './config/database';
// Remove the audit middleware import for now since it's not used

// Import routes
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import practitionerRoutes from './routes/practitioner.routes';
import appointmentRoutes from './routes/appointment.routes';
import documentRoutes from './routes/document.routes';
import webhookRoutes from './routes/webhook.routes';
import auditRoutes from './routes/audit.routes';
import paymentRoutes from './routes/payment.routes';
import packageRoutes from './routes/package.routes';
import aiRoutes from './routes/ai.routes';
import invoiceRoutes from './routes/invoice.routes';

// Force redeployment - Auth0 configuration update
const app = express();

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5002;

// CORS must be before all routes
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : [
    'http://localhost:3000',
    'http://localhost:3001', 
    'https://intuitive-learning-production.up.railway.app',
    'https://eonmeds-platform2025-production.up.railway.app'
  ];

console.log('🔒 CORS Origins configured:', corsOrigins);

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count']
}));

// Request logging middleware (before body parsing)
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// IMPORTANT: Stripe webhook endpoint MUST be registered before body parsing middleware
// This is because Stripe requires the raw body for signature verification
app.post('/api/v1/payments/webhook/stripe', 
  express.raw({ type: 'application/json' }), 
  (req, res) => {
    // Import and use the webhook handler directly
    const { handleStripeWebhook } = require('./controllers/stripe-webhook.controller');
    handleStripeWebhook(req, res);
  }
);

// NOW we can add body parsing middleware for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
// IMPORTANT: This must be before any auth middleware
app.use('/api/v1/webhooks', webhookRoutes);
console.log('✅ Webhook routes loaded (always available - no auth required)');

// Register all routes (with database check inside each route)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/practitioners', practitionerRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/audit', auditRoutes);
// Payment routes - but webhook is already registered above
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/payments/invoices', invoiceRoutes);
app.use('/api/v1/packages', packageRoutes);
app.use('/api/v1/ai', aiRoutes);
console.log('✅ All routes registered (database check happens per route)');

// Start server
app.listen(PORT, async () => {
  console.log('🚀 Server is running!');
  console.log(`📡 Listening on port ${PORT}`);
  console.log('🏥 EONMeds Backend API');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database Host: ${process.env.DB_HOST ? '✓ Configured' : '✗ Missing'}`);
  console.log(`Database Name: ${process.env.DB_NAME ? '✓ Configured' : '✗ Missing'}`);
  console.log(`JWT Secret: ${process.env.JWT_SECRET ? '✓ Configured' : '✗ Missing'}`);
  console.log(`Port: ${PORT}`);
  
  await testDatabaseConnection();
  await ensureSOAPNotesTable();
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
        
        // SOAP notes table is now handled by database.ts with correct schema
        
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
        
        // Create invoices table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS invoices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_number VARCHAR(50) UNIQUE NOT NULL,
            stripe_invoice_id VARCHAR(255) UNIQUE,
            patient_id VARCHAR(20) NOT NULL REFERENCES patients(patient_id),
            stripe_customer_id VARCHAR(255),
            invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
            due_date DATE NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'draft',
            subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
            tax_amount DECIMAL(10,2) DEFAULT 0,
            discount_amount DECIMAL(10,2) DEFAULT 0,
            total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            amount_paid DECIMAL(10,2) DEFAULT 0,
            amount_due DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
            currency VARCHAR(3) DEFAULT 'USD',
            payment_method VARCHAR(50),
            payment_date TIMESTAMP,
            stripe_payment_intent_id VARCHAR(255),
            description TEXT,
            notes TEXT,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            paid_at TIMESTAMP,
            voided_at TIMESTAMP
          );
        `);

        // Create invoice_items table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS invoice_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
            description VARCHAR(500) NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            unit_price DECIMAL(10,2) NOT NULL,
            amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
            service_type VARCHAR(100),
            stripe_price_id VARCHAR(255),
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW()
          );
        `);

        // Call ensureSOAPNotesTable to create the table with correct schema
        const { ensureSOAPNotesTable } = await import('./config/database');
        await ensureSOAPNotesTable();
        
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