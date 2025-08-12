-- Migration: Ensure all Stripe webhook tables exist
-- This migration is idempotent - safe to run multiple times

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

-- 3. External payment mirrors table
CREATE TABLE IF NOT EXISTS external_payment_mirrors (
    charge_id TEXT PRIMARY KEY,
    stripe_customer_id TEXT,
    matched_patient_id VARCHAR(20),
    created_invoice_id TEXT,
    mode TEXT NOT NULL CHECK (mode IN ('created_invoice', 'imported_invoice', 'unmatched', 'failed')),
    email TEXT,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_extpay_email ON external_payment_mirrors (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_extpay_created_at ON external_payment_mirrors (created_at);
CREATE INDEX IF NOT EXISTS idx_extpay_mode ON external_payment_mirrors (mode);
CREATE INDEX IF NOT EXISTS idx_extpay_matched_patient ON external_payment_mirrors (matched_patient_id);
