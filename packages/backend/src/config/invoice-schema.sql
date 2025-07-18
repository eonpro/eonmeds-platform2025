-- Invoice Management Schema for EONMeds
-- Integrates with Stripe and Patient Management

-- Main invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Invoice identifiers
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  
  -- Patient relationship
  patient_id VARCHAR(20) NOT NULL REFERENCES patients(patient_id),
  stripe_customer_id VARCHAR(255),
  
  -- Invoice details
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- Status values: draft, open, paid, void, uncollectible
  
  -- Financial details
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  amount_due DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Payment details
  payment_method VARCHAR(50),
  payment_date TIMESTAMP,
  stripe_payment_intent_id VARCHAR(255),
  
  -- Metadata
  description TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  voided_at TIMESTAMP,
  
  -- Indexes for performance
  CONSTRAINT fk_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  INDEX idx_invoice_patient (patient_id),
  INDEX idx_invoice_status (status),
  INDEX idx_invoice_date (invoice_date),
  INDEX idx_stripe_invoice (stripe_invoice_id)
);

-- Invoice line items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Item details
  description VARCHAR(500) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  -- Service/Product reference
  service_type VARCHAR(100), -- weight_loss, testosterone, consultation, etc.
  stripe_price_id VARCHAR(255),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_item_invoice (invoice_id)
);

-- Invoice payment history
CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Stripe references
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'succeeded',
  failure_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_payment_invoice (invoice_id),
  INDEX idx_payment_date (payment_date)
);

-- Invoice sync log for tracking Stripe synchronization
CREATE TABLE IF NOT EXISTS invoice_sync_log (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL, -- manual, webhook, scheduled
  sync_status VARCHAR(50) NOT NULL, -- started, completed, failed
  invoices_synced INTEGER DEFAULT 0,
  invoices_created INTEGER DEFAULT 0,
  invoices_updated INTEGER DEFAULT 0,
  errors TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_updated_at();

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1000;

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR AS $$
DECLARE
  new_number VARCHAR;
BEGIN
  new_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::text, 5, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql; 