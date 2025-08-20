import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { testDatabaseConnection, ensureSOAPNotesTable, pool } from './config/database';
import { ENV } from './config/env';
import { logger } from './lib/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = ENV.PORT;

// Trust Railway's reverse proxy *before* any middleware that reads IPs
app.set('trust proxy', 1);

// Stamp current build/commit for verification
console.info(
  "DEPLOY_VERSION:",
  process.env.BUILD_ID || process.env.RAILWAY_GIT_COMMIT_SHA || "unknown"
);

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN 
  ? (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN).split(',').map(origin => origin.trim())
  : [
    'http://localhost:3000',
    'http://localhost:3001', 
    'https://eonmeds-platform2025-production.up.railway.app'
  ];

logger.info("🔒 CORS Origins configured:", corsOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps)
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
  exposedHeaders: ['X-Total-Count']
}));

// Request logging middleware
app.use((req, _res, next) => {
  logger.info(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Import Stripe webhook route early (needs raw body)
import stripeWebhookRoutes from './routes/stripe-webhook.routes';

// Stripe webhook MUST come before body parsing middleware  
app.use("/api/v1/webhooks", stripeWebhookRoutes);
logger.info("✅ Stripe webhook route loaded at /api/v1/webhooks/stripe (requires raw body)");

// Compat alias → forward to the actual stripe webhook router
app.use('/api/v1/payments/webhook/stripe', stripeWebhookRoutes);

// Body parsing middleware for all other routes
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// --- Build/health probes (no auth) ---
app.get('/version', (_req, res) => {
  res.json({
    commit: process.env.RAILWAY_GIT_COMMIT_SHA || null,
    buildId: process.env.BUILD_ID || null,
    ts: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/v1/tracking/test', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});



// API root endpoint
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
      invoices: '/api/v1/invoices',
      tracking: '/api/v1/tracking',
      billing: '/api/v1/billing',
      'billing-stripe': '/api/v1/billing/stripe',
      packages: '/api/v1/packages',
      ai: '/api/v1/ai'
    }
  });
});

// Import all routes
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import practitionerRoutes from './routes/practitioner.routes';
import appointmentRoutes from './routes/appointment.routes';
import documentRoutes from './routes/document.routes';
import webhookRoutes from './routes/webhook.routes';
import auditRoutes from './routes/audit.routes';
import paymentRoutes from './routes/payment.routes';
import invoiceRoutes from './routes/invoice.routes';
import invoicePaymentRoutes from './routes/invoice-payment.routes';
import trackingRoutes from './routes/tracking';
import packageRoutes from './routes/package.routes';
import aiRoutes from './routes/ai.routes';
import billingRoutes from './routes/billing.routes';
import billingMetricsRoutes from './routes/billing-metrics.routes';
import stripeBillingRoutes from './routes/stripe-billing.routes';

// General webhook routes (no auth) 
app.use("/api/v1/webhooks/general", webhookRoutes);
logger.info("✅ General webhook routes loaded at /api/v1/webhooks/general (no auth required)");

// All other API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use("/api/v1/practitioners", practitionerRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/audit", auditRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/invoices", invoiceRoutes); // Direct invoice routes
app.use("/api/v1/invoice-payments", invoicePaymentRoutes);
app.use("/api/v1/tracking", trackingRoutes);
app.use("/api/v1/packages", packageRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1/billing-metrics", billingMetricsRoutes);
app.use("/api/v1/billing/stripe", stripeBillingRoutes);

logger.info('✅ All API routes registered');

// Payment methods routes
try {
  const paymentMethodsRoutes = require('./routes/payment-methods.routes').default;
  app.use('/api/v1/payment-methods', paymentMethodsRoutes);
} catch (error) {
  logger.warn('Payment methods routes not found, skipping...');
}

// Financial dashboard routes
try {
  const financialDashboardRoutes = require('./routes/financial-dashboard.routes').default;
  app.use('/api/v1/financial-dashboard', financialDashboardRoutes);
} catch (error) {
  logger.warn('Financial dashboard routes not found, skipping...');
}

// Comprehensive Billing System routes (if available)
try {
  const { createBillingSystemRoutes } = require('./routes/billing-system.routes');
  const { BillingSystemService } = require('./services/billing-system.service');
  const { getStripeClient } = require('./config/stripe.config');
  
  const billingSystemService = new BillingSystemService(pool, getStripeClient());
  const billingSystemRoutes = createBillingSystemRoutes(billingSystemService);
  app.use('/api/v1/billing-system', billingSystemRoutes);
  logger.info('✅ Comprehensive billing system routes loaded');
} catch (error) {
  logger.warn('Billing system routes not found, skipping...');
}

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  
  // Handle React routing
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
  });
  logger.info('✅ Serving frontend static files');
}

// Database initialization
let databaseConnected = false;

async function initializeDatabase() {
    logger.info('Attempting database connection...');
  
  try {
    const isConnected = await testDatabaseConnection();
    
    if (isConnected) {
      logger.info("✅ Database connected successfully");
      databaseConnected = true;

      // Ensure critical tables exist
      await ensureSOAPNotesTable();
      await ensureInvoiceTables();
      await ensureTrackingTables();
      
      logger.info('✅ Database tables verified/created');
    } else {
      logger.info("⚠️  Database connection failed - some functionality may be limited");
    }
  } catch (error) {
    logger.error("❌ Error during database initialization:", error);
  }
}

async function ensureInvoiceTables() {
  try {
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

    // Create sequence for invoice numbers
    await pool.query(`
      CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1000;
    `);

    // Create function to generate invoice numbers
    await pool.query(`
      CREATE OR REPLACE FUNCTION generate_invoice_number()
      RETURNS VARCHAR AS $$
      DECLARE
        new_number VARCHAR;
      BEGIN
        new_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::text, 5, '0');
        RETURN new_number;
      END;
      $$ LANGUAGE plpgsql;
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

    // Create invoice_payments table
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
      CREATE INDEX IF NOT EXISTS idx_payment_date ON invoice_payments(payment_date);
      CREATE INDEX IF NOT EXISTS idx_invoice_patient ON invoices(patient_id);
      CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoices(status);
    `);

    logger.info('✅ Invoice tables created/verified');
  } catch (error) {
    logger.error('Error creating invoice tables:', error);
  }
}

async function ensureTrackingTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tracking_forms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id VARCHAR(20) NOT NULL,
        form_type VARCHAR(50) NOT NULL,
        form_data JSONB NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tracking_patient ON tracking_forms(patient_id);
      CREATE INDEX IF NOT EXISTS idx_tracking_created ON tracking_forms(created_at);
    `);

    logger.info('✅ Tracking tables created/verified');
  } catch (error) {
    logger.error('Error creating tracking tables:', error);
  }
}

// Start server
app.listen(PORT, async () => {
  logger.info('🚀 Server is running!');
  logger.info(`📡 Listening on port ${PORT}`);
  logger.info('🏥 EONMeds Backend API v2.0');
  logger.info(`Environment: ${ENV.NODE_ENV}`);
  logger.info(`Database: ${process.env.DB_HOST ? '✓ Configured' : '✗ Missing'}`);
  
  await initializeDatabase();
});

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
  logger.error('Error:', err);

  const responseBody: any = {
    error: err?.message || 'Internal Server Error',
    status: err?.status || 500,
    path: _req.path,
    method: _req.method,
  };

  if (process.env.NODE_ENV === 'development' && err?.stack) {
    responseBody.stack = err.stack;
  }

  res.status(responseBody.status).json(responseBody);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

// Fix: Ensure proper export for both ES modules and CommonJS, and avoid duplicate exports
const exported = { app, databaseConnected };
// Fix: Ensure both ES module and CommonJS compatibility, and avoid duplicate exports.
// Use named export for databaseConnected, and default export for app.
// Also, attach databaseConnected to the CommonJS export for require() users.

export default app;
export { databaseConnected };

// For CommonJS consumers:
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = app;
  module.exports.databaseConnected = databaseConnected;
}

// For CommonJS require() support
module.exports = exported;
