-- Complete EONMeds Database Schema
-- This is the authoritative schema for the entire platform

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to generate patient IDs
CREATE OR REPLACE FUNCTION generate_patient_id()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_id VARCHAR(20);
  id_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate ID like P0001, P0002, etc.
    new_id := 'P' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
    
    -- Check if ID already exists
    SELECT EXISTS(SELECT 1 FROM patients WHERE patient_id = new_id) INTO id_exists;
    
    -- Exit loop if ID doesn't exist
    EXIT WHEN NOT id_exists;
  END LOOP;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_patient_id(),
  
  -- HeyFlow Integration
  heyflow_submission_id VARCHAR(255) UNIQUE,
  form_type VARCHAR(100) NOT NULL,
  form_version VARCHAR(20),
  submitted_at TIMESTAMP NOT NULL,
  
  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  date_of_birth DATE,
  gender VARCHAR(20),
  
  -- Address Information
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  postal_code VARCHAR(20),
  country VARCHAR(50) DEFAULT 'USA',
  
  -- Medical Information
  height_inches INTEGER,
  weight_lbs DECIMAL(5,2),
  bmi DECIMAL(4,2),
  medical_conditions TEXT[],
  current_medications TEXT[],
  allergies TEXT[],
  
  -- Stripe Integration
  stripe_customer_id VARCHAR(255) UNIQUE,
  
  -- Auth0 Integration
  auth0_user_id VARCHAR(255) UNIQUE,
  
  -- Consent & Legal
  consent_treatment BOOLEAN DEFAULT false,
  consent_telehealth BOOLEAN DEFAULT false,
  consent_date TIMESTAMP,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending_review',
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Practitioners table
CREATE TABLE IF NOT EXISTS practitioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  license_number VARCHAR(100),
  license_state VARCHAR(2),
  specializations TEXT[],
  auth0_user_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- SOAP Notes table
CREATE TABLE IF NOT EXISTS soap_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id VARCHAR(20) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  original_content TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_by VARCHAR(255) NOT NULL DEFAULT 'BECCA AI',
  approved_by UUID REFERENCES practitioners(id),
  approved_by_name VARCHAR(255),
  approved_by_credentials VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  version INTEGER DEFAULT 1,
  edit_history JSONB DEFAULT '[]',
  ai_model VARCHAR(50) DEFAULT 'gpt-4',
  ai_response_time_ms INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_cost DECIMAL(10,4),
  metadata JSONB DEFAULT '{}'
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  patient_id VARCHAR(20) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
  stripe_customer_id VARCHAR(255),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  notes TEXT,
  terms TEXT,
  stripe_payment_intent_id VARCHAR(255),
  stripe_hosted_invoice_url TEXT,
  stripe_invoice_pdf TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  voided_at TIMESTAMP
);

-- Invoice items table
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

-- Invoice payments table
CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
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

-- Service packages table
CREATE TABLE IF NOT EXISTS service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  billing_frequency VARCHAR(50) DEFAULT 'monthly',
  stripe_product_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255) UNIQUE,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Patient packages table (subscriptions)
CREATE TABLE IF NOT EXISTS patient_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id VARCHAR(20) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES service_packages(id),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'active',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_billing_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id VARCHAR(20) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES practitioners(id),
  appointment_type VARCHAR(100) NOT NULL,
  scheduled_date TIMESTAMP NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status VARCHAR(50) DEFAULT 'scheduled',
  notes TEXT,
  meeting_link TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  user_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_stripe_customer_id ON patients(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_soap_notes_patient_id ON soap_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_soap_notes_created_at ON soap_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practitioners_updated_at BEFORE UPDATE ON practitioners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_soap_notes_updated_at BEFORE UPDATE ON soap_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_packages_updated_at BEFORE UPDATE ON service_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_packages_updated_at BEFORE UPDATE ON patient_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 