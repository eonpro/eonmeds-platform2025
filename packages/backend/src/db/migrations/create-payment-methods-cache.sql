-- Create payment_methods_cached table for PCI-compliant PM storage
-- NO PAN/CVV - only safe metadata from Stripe
CREATE TABLE IF NOT EXISTS payment_methods_cached (
  payment_method_id TEXT PRIMARY KEY,
  patient_id UUID NULL REFERENCES patients(patient_id),
  stripe_customer_id TEXT NOT NULL,
  brand TEXT,
  last4 TEXT,
  exp_month INT,
  exp_year INT,
  fingerprint TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX idx_payment_methods_cached_patient_id ON payment_methods_cached(patient_id);
CREATE INDEX idx_payment_methods_cached_customer_id ON payment_methods_cached(stripe_customer_id);
CREATE INDEX idx_payment_methods_cached_default ON payment_methods_cached(is_default) WHERE is_default = TRUE;

-- Add stripe_invoice_id to invoices table if not exists
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS stripe_invoice_id VARCHAR(255) UNIQUE;

-- Add index for stripe_invoice_id
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON invoices(stripe_invoice_id);
