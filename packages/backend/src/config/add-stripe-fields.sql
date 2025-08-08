-- Add Stripe fields to patients table
-- Run this after creating the patients table

ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_patients_stripe_customer ON patients(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_patients_subscription ON patients(subscription_id);
CREATE INDEX IF NOT EXISTS idx_patients_subscription_status ON patients(subscription_status);

-- Add comment for documentation
COMMENT ON COLUMN patients.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN patients.subscription_id IS 'Active Stripe subscription ID';
COMMENT ON COLUMN patients.subscription_status IS 'Current subscription status: active, paused, canceled, past_due';
COMMENT ON COLUMN patients.subscription_start_date IS 'When the subscription started';
COMMENT ON COLUMN patients.subscription_end_date IS 'When the subscription ended (if canceled)';
COMMENT ON COLUMN patients.last_payment_date IS 'Date of the last successful payment';
COMMENT ON COLUMN patients.next_billing_date IS 'Next scheduled billing date'; 