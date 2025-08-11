-- Stripe Webhook Tables Migration
-- Run this to set up all necessary tables for Stripe webhook processing

-- 1. Processed events table for idempotency
CREATE TABLE IF NOT EXISTS processed_events (
  event_id VARCHAR(255) PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_processed_events_processed_at ON processed_events(processed_at);

-- 2. Billing events table for storing webhook payloads
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for billing events
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_events_event_id ON billing_events(event_id);

-- 3. Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(50),
  status VARCHAR(50) NOT NULL,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  default_payment_method VARCHAR(255),
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_patient ON subscriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 4. Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255),
  patient_id VARCHAR(50),
  status VARCHAR(50) NOT NULL,
  amount_due INTEGER NOT NULL DEFAULT 0,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  amount_refunded INTEGER DEFAULT 0,
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  payment_intent_status VARCHAR(50),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_at ON invoices(paid_at);

-- 5. Add stripe_customer_id to patients table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE patients ADD COLUMN stripe_customer_id VARCHAR(255);
    CREATE INDEX idx_patients_stripe_customer ON patients(stripe_customer_id);
  END IF;
END $$;

-- 6. Create a view to link patients with their subscriptions
CREATE OR REPLACE VIEW patient_subscriptions AS
SELECT 
  p.id as patient_id,
  p.first_name,
  p.last_name,
  p.email,
  s.stripe_subscription_id,
  s.status as subscription_status,
  s.current_period_end,
  s.cancel_at_period_end
FROM patients p
LEFT JOIN subscriptions s ON p.stripe_customer_id = s.stripe_customer_id
WHERE s.id IS NOT NULL;

-- 7. Create a view to link patients with their invoices
CREATE OR REPLACE VIEW patient_invoices AS
SELECT 
  p.id as patient_id,
  p.first_name,
  p.last_name,
  p.email,
  i.stripe_invoice_id,
  i.status as invoice_status,
  i.amount_due,
  i.amount_paid,
  i.paid_at,
  i.hosted_invoice_url
FROM patients p
LEFT JOIN invoices i ON p.stripe_customer_id = i.stripe_customer_id
WHERE i.id IS NOT NULL;

-- 8. Cleanup function for old processed events (optional, run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_processed_events() RETURNS void AS $$
BEGIN
  -- Delete processed events older than 30 days
  DELETE FROM processed_events WHERE processed_at < NOW() - INTERVAL '30 days';
  
  -- Delete billing events older than 90 days (adjust as needed)
  DELETE FROM billing_events WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Example: Create a scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-processed-events', '0 2 * * *', 'SELECT cleanup_old_processed_events();');
