-- Create payments table to track all payment transactions
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- stripe, cash, check, wire_transfer, etc.
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed, refunded
  stripe_payment_id VARCHAR(255), -- Stripe payment intent ID
  stripe_charge_id VARCHAR(255), -- Stripe charge ID
  offline_reference VARCHAR(255), -- Check number, wire reference, etc.
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_payments_payment_method ON payments(payment_method);
CREATE INDEX idx_payments_status ON payments(status);

-- Add paid_at column to invoices if it doesn't exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP; 