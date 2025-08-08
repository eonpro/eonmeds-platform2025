-- Stripe Integration Database Verification Script
-- Run this to ensure all required tables and columns exist

-- 1. Check if all required tables exist
SELECT 'Checking required tables...' as status;

SELECT 
  CASE 
    WHEN COUNT(*) = 6 THEN '✅ All required tables exist'
    ELSE '❌ Missing tables: ' || string_agg(missing_table, ', ')
  END as table_status
FROM (
  VALUES 
    ('patients'),
    ('invoices'),
    ('invoice_items'),
    ('invoice_payments'),
    ('webhook_events'),
    ('service_packages')
) AS required(table_name)
LEFT JOIN information_schema.tables t 
  ON t.table_name = required.table_name 
  AND t.table_schema = 'public'
WHERE t.table_name IS NULL;

-- 2. Check patients table has all Stripe columns
SELECT 'Checking patients table columns...' as status;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All patient Stripe columns exist'
    ELSE '❌ Missing columns: ' || string_agg(col, ', ')
  END as column_status
FROM (
  VALUES 
    ('stripe_customer_id'),
    ('subscription_id'),
    ('subscription_status'),
    ('subscription_start_date'),
    ('subscription_end_date'),
    ('membership_hashtags'),
    ('status'),
    ('form_type')
) AS required(col)
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'patients' 
  AND column_name = required.col
);

-- 3. Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add Stripe columns to patients
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'patients' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE patients ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'patients' AND column_name = 'subscription_id') THEN
    ALTER TABLE patients ADD COLUMN subscription_id VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'patients' AND column_name = 'subscription_status') THEN
    ALTER TABLE patients ADD COLUMN subscription_status VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'patients' AND column_name = 'subscription_start_date') THEN
    ALTER TABLE patients ADD COLUMN subscription_start_date TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'patients' AND column_name = 'subscription_end_date') THEN
    ALTER TABLE patients ADD COLUMN subscription_end_date TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'patients' AND column_name = 'last_payment_date') THEN
    ALTER TABLE patients ADD COLUMN last_payment_date TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'patients' AND column_name = 'next_billing_date') THEN
    ALTER TABLE patients ADD COLUMN next_billing_date TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'patients' AND column_name = 'membership_hashtags') THEN
    ALTER TABLE patients ADD COLUMN membership_hashtags TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'patients' AND column_name = 'status') THEN
    ALTER TABLE patients ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'patients' AND column_name = 'form_type') THEN
    ALTER TABLE patients ADD COLUMN form_type VARCHAR(100);
  END IF;
  
  -- Add patient_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'patients' AND column_name = 'patient_id') THEN
    -- Create sequence for patient IDs
    CREATE SEQUENCE IF NOT EXISTS patient_id_seq START 7000;
    
    -- Add patient_id column
    ALTER TABLE patients ADD COLUMN patient_id VARCHAR(20) UNIQUE;
    
    -- Generate IDs for existing patients
    UPDATE patients 
    SET patient_id = 'P' || LPAD(nextval('patient_id_seq')::TEXT, 6, '0')
    WHERE patient_id IS NULL;
  END IF;
END $$;

-- 4. Create invoice tables if they don't exist
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  stripe_charge_id VARCHAR(255),
  stripe_session_id VARCHAR(255),
  patient_id VARCHAR(20) REFERENCES patients(patient_id),
  stripe_customer_id VARCHAR(255),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  amount_due DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50),
  payment_date TIMESTAMP,
  stripe_payment_intent_id VARCHAR(255),
  description TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  voided_at TIMESTAMP
);

-- 5. Create other required tables
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  service_type VARCHAR(100),
  stripe_price_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'succeeded',
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,
  event_type VARCHAR(100),
  webhook_id VARCHAR(255) UNIQUE,
  payload JSONB NOT NULL,
  signature VARCHAR(500),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_packages (
  id SERIAL PRIMARY KEY,
  package_id VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  billing_period VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stripe_price_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  features TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Create required functions
CREATE OR REPLACE FUNCTION generate_patient_id() 
RETURNS VARCHAR AS $$
BEGIN
    RETURN 'P' || LPAD(nextval('patient_id_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR AS $$
DECLARE
  new_number VARCHAR;
BEGIN
  -- Create sequence if it doesn't exist
  CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1000;
  new_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::text, 5, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- 7. Create required indexes
CREATE INDEX IF NOT EXISTS idx_patients_stripe_customer ON patients(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_patients_subscription ON patients(subscription_id);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_membership_hashtags ON patients USING GIN(membership_hashtags);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source, event_type);

-- 8. Insert sample service packages if none exist
INSERT INTO service_packages (package_id, name, description, category, billing_period, price)
SELECT * FROM (VALUES 
  ('weight_loss_monthly', 'Weight Loss - Monthly', 'Monthly weight loss program with Semaglutide', 'Weight Loss', 'monthly', 299.00),
  ('weight_loss_quarterly', 'Weight Loss - Quarterly', 'Quarterly weight loss program (save $98)', 'Weight Loss', 'quarterly', 799.00),
  ('testosterone_monthly', 'Testosterone - Monthly', 'Monthly testosterone replacement therapy', 'Testosterone', 'monthly', 349.00),
  ('testosterone_quarterly', 'Testosterone - Quarterly', 'Quarterly testosterone therapy (save $98)', 'Testosterone', 'quarterly', 949.00)
) AS v(package_id, name, description, category, billing_period, price)
WHERE NOT EXISTS (SELECT 1 FROM service_packages LIMIT 1);

-- 9. Verification queries
SELECT 'Current patient status distribution:' as report;
SELECT status, COUNT(*) as count 
FROM patients 
GROUP BY status
ORDER BY count DESC;

SELECT 'Patients with Stripe customer IDs:' as report;
SELECT COUNT(*) as total_patients,
       COUNT(stripe_customer_id) as with_stripe_id,
       COUNT(*) - COUNT(stripe_customer_id) as without_stripe_id
FROM patients;

SELECT 'Recent webhook events:' as report;
SELECT source, event_type, processed, created_at 
FROM webhook_events 
WHERE source = 'stripe'
ORDER BY created_at DESC 
LIMIT 10;

SELECT 'Active service packages:' as report;
SELECT package_id, name, category, billing_period, price 
FROM service_packages 
WHERE is_active = true
ORDER BY category, price;

-- 10. Common data fixes
-- Fix any patients with null status
UPDATE patients SET status = 'pending' WHERE status IS NULL;

-- Initialize empty hashtag arrays
UPDATE patients SET membership_hashtags = '{}' WHERE membership_hashtags IS NULL;

-- Set form_type for patients without it
UPDATE patients 
SET form_type = 'legacy_import' 
WHERE form_type IS NULL;

SELECT '✅ Stripe database setup verification complete!' as status; 