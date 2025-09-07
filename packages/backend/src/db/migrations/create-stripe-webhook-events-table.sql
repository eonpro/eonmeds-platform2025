-- Create table for storing Stripe webhook events
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_webhook_event_type ON stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_created_at ON stripe_webhook_events(created_at);

-- Add stripe_customer_id column to patients if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE patients ADD COLUMN stripe_customer_id VARCHAR(255);
    CREATE INDEX idx_patient_stripe_customer ON patients(stripe_customer_id);
  END IF;
END $$;
