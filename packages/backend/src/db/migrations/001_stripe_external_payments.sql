-- Migration: Add Stripe external payment tracking tables
-- This migration is idempotent - safe to run multiple times

-- Create processed_events table for webhook idempotency
CREATE TABLE IF NOT EXISTS processed_events (
    event_id TEXT PRIMARY KEY,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index on processed_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_processed_events_processed_at ON processed_events (processed_at);

-- Create external_payment_mirrors table for tracking external Stripe payments
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

-- Add foreign key constraint if patients table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'patients'
    ) THEN
        -- Only add constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_extpay_patient'
        ) THEN
            ALTER TABLE external_payment_mirrors 
            ADD CONSTRAINT fk_extpay_patient 
            FOREIGN KEY (matched_patient_id) 
            REFERENCES patients(patient_id) 
            ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Grant permissions if application user exists
DO $$
BEGIN
    -- Grant permissions to app user if it exists
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user) THEN
        GRANT SELECT, INSERT, UPDATE ON processed_events TO current_user;
        GRANT SELECT, INSERT, UPDATE ON external_payment_mirrors TO current_user;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore permission errors in development
        NULL;
END $$;
