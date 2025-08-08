-- Add stripe_charge_id column if it doesn't exist
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS stripe_charge_id VARCHAR(255);

-- Add stripe_session_id column to invoices table for tracking checkout session payments
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_charge_id ON invoices(stripe_charge_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_session_id ON invoices(stripe_session_id);

-- Add unique constraints only if columns exist
-- Note: These will be added after verifying columns exist 