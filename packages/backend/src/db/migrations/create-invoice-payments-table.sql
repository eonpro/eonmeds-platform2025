-- Create invoice_payments table to track all payments for invoices
CREATE TABLE IF NOT EXISTS invoice_payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- 'stripe', 'cash', 'check', 'manual', etc.
  payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
  stripe_payment_intent_id VARCHAR(255),
  stripe_refund_id VARCHAR(255),
  reference_number VARCHAR(100), -- For manual payments (check number, etc.)
  notes TEXT,
  is_refund BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX idx_invoice_payments_payment_date ON invoice_payments(payment_date);
CREATE INDEX idx_invoice_payments_stripe_payment_intent ON invoice_payments(stripe_payment_intent_id);

-- Add stripe_payment_intent_id to invoices table if not exists
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);

-- Add status column to invoices if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'status') THEN
    ALTER TABLE invoices ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
  END IF;
END $$;

-- Update existing invoices status based on paid_at
UPDATE invoices 
SET status = CASE 
  WHEN paid_at IS NOT NULL THEN 'paid'
  ELSE 'pending'
END
WHERE status IS NULL;
