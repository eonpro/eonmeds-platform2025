
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { testDatabaseConnection, ensureSOAPNotesTable, pool } from './config/database';
import { ENV } from './config/env';
import { logger } from './utils/logger';
import { applySecurityMiddleware, corsOptions } from './config/security.config';

// HIPAA SECURITY: Initialize log sanitization FIRST
import { initializeHIPAALogging } from './utils/log-sanitizer';
initializeHIPAALogging();

// HIPAA SECURITY: Import emergency auth middleware
import { emergencyAuthCheck } from './middleware/emergency-auth';

// Load environment variables only in local development
if (!process.env.RAILWAY_STATIC_URL) {
  // local dev only; Railway injects envs for us
  dotenv.config();
}

// Import routes
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import practitionerRoutes from './routes/practitioner.routes';
import appointmentRoutes from './routes/appointment.routes';
import documentRoutes from './routes/document.routes';
import webhookRoutes from './routes/webhook.routes';
import stripeWebhookRoutes from './routes/stripe-webhook.routes';
import auditRoutes from './routes/audit.routes';
import paymentRoutes from './routes/payment.routes';
import packageRoutes from './routes/package.routes';
import aiRoutes from './routes/ai.routes';
import invoiceRoutes from './routes/invoice.routes';

const app = express();
const PORT = ENV.PORT || process.env.PORT || 8080;

// Trust Railway proxy BEFORE any IP/rate-limit/security middleware
app.set('trust proxy', 1);

// Stamp running build/commit (visible in Deploy Logs)
console.info('DEPLOY_VERSION:', process.env.BUILD_ID || process.env.RAILWAY_GIT_COMMIT_SHA || 'unknown');


// Load environment variables
dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

// Apply security middleware (includes CORS, rate limiting, etc.)
if (process.env.NODE_ENV === 'production') {
  app.use(cors(corsOptions));
  applySecurityMiddleware(app);
} else {
  // Development CORS settings
  const corsOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : [
      'http://localhost:3000',
      'http://localhost:3001', 
      'https://intuitive-learning-production.up.railway.app',
      'https://eonmeds-platform2025-production.up.railway.app'
    ];
  
  logger.info(" CORS Origins configured:", corsOrigins);
  
  app.use(cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Session-Expires-In']
  }));
}

// Request logging middleware (before body parsing)
app.use((req, _res, next) => {
  logger.info(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Stripe webhook route (must be before body parsing middleware)
// Stripe requires raw body for webhook signature verification
app.use("/api/v1/webhooks/stripe", stripeWebhookRoutes);
app.use("/api/v1/payments/webhook/stripe", stripeWebhookRoutes);
logger.info(" Stripe webhook route loaded (requires raw body)");

// Body parsing middleware for all routes
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });

// --- Build/health probes (no auth) ---
app.get("/version", (_req, res) => {
  res.json({
    commit: process.env.RAILWAY_GIT_COMMIT_SHA || null,
    buildId: process.env.BUILD_ID || null,
    ts: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

app.get("/api/v1/tracking/test", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
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
app.use("/api/v1/webhooks", webhookRoutes);
logger.info(" Webhook routes loaded (always available - no auth required)");

// Register all routes (with database check inside each route)
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use("/api/v1/practitioners", practitionerRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/audit", auditRoutes);
// Payment routes - but webhook is already registered above
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/payments/invoices', invoiceRoutes);
app.use('/api/v1/packages', packageRoutes);
app.use('/api/v1/ai', aiRoutes);

// Payment methods routes (Phase 2)
const paymentMethodsRoutes = require('./routes/payment-methods.routes').default;
app.use('/api/v1/payment-methods', paymentMethodsRoutes);

// Financial dashboard routes (Admin only)
const financialDashboardRoutes = require('./routes/financial-dashboard.routes').default;
app.use('/api/v1/financial-dashboard', financialDashboardRoutes);

// Stripe test routes (only in development)
if (process.env.NODE_ENV !== 'production') {
  const stripeTestRoutes = require('./routes/stripe-test.routes').default;
  app.use('/api/v1/stripe-test', stripeTestRoutes);
  logger.info(' Stripe test routes loaded (development only)');
}

logger.info(' All routes registered (database check happens per route)');

// Start server
app.listen(PORT, async () => {
  logger.info(' Server is running!');
  logger.info(` Listening on port ${PORT}`);
  logger.info(' EONMeds Backend API');
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Database Host: ${process.env.DB_HOST ? ' Configured' : ' Missing'}`);
  logger.info(`Database Name: ${process.env.DB_NAME ? ' Configured' : ' Missing'}`);
  logger.info(`JWT Secret: ${process.env.JWT_SECRET ? ' Configured' : ' Missing'}`);
  logger.info(`Port: ${PORT}`);

  await testDatabaseConnection();
  await ensureSOAPNotesTable();
});

// Initialize database and routes
let databaseConnected = false;

async function initializeDatabase() {
  logger.info('Attempting database connection...');
  
  try {
    const isConnected = await testDatabaseConnection();

    if (isConnected) {
      logger.info(" Database connected successfully");
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

        // Call ensureSOAPNotesTable to create the table with correct schema
        const { ensureSOAPNotesTable } = await import("./config/database");
        await ensureSOAPNotesTable();
        
        logger.info(' Database tables verified/created');
      } catch (tableError) {
        logger.info(
          "Note: Could not verify/create tables:",
          (tableError as Error).message,
        );
      }
    } else {
      logger.info(
        "  Database connection failed - some functionality may be limited",
      );
    }
  } catch (error) {
    logger.error(" Error during database initialization:", error);
  }
}

// Initialize database connection
initializeDatabase();

// Export database connection status for routes to check

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    database: databaseConnected ? 'connected' : 'not connected'
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Error:', err);

  // Always include useful debugging info in output
  const responseBody: any = {
    error: err.message || 'Internal Server Error',
    // Only include stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    // Always include status and path for debugging
    status: err.status || 500,
    path: req.path,
    method: req.method
  };

  res.status(err.status || 500).json(responseBody);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});


// NOTE: If express-jwt is applied globally, exclude these paths:
// app.use(jwt({ secret, algorithms: ['HS256'] }).unless({
//   path: ['/health','/version','/api/v1/tracking/test','/api/v1/webhooks/stripe','/api/v1/payments/webhook/stripe']
// }));

// Fix: Ensure proper export for both ES modules and CommonJS
export default app;
export { databaseConnected };
