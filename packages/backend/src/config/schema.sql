-- EONMeds Database Schema
-- HIPAA-compliant telehealth platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables (for development)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS user_patient_assignments CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS membership_status_history CASCADE;
DROP TABLE IF EXISTS hashtag_configs CASCADE;
DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TABLE IF EXISTS weight_loss_intake CASCADE;

-- Create roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create users table with RBAC
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role_id UUID NOT NULL REFERENCES roles(id),
  department VARCHAR(100),
  supervisor_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Main patient record
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
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
  
  -- Medical Information
  height_inches INTEGER,
  weight_lbs DECIMAL(5,2),
  bmi DECIMAL(4,2),
  medical_conditions TEXT[],
  current_medications TEXT[],
  allergies TEXT[],
  
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

-- Store raw webhook data for compliance
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

-- Form-specific data tables
CREATE TABLE IF NOT EXISTS weight_loss_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  
  -- Weight Loss Specific
  target_weight_lbs DECIMAL(5,2),
  weight_loss_timeline VARCHAR(50),
  previous_weight_loss_attempts TEXT,
  exercise_frequency VARCHAR(50),
  diet_restrictions TEXT[],
  
  -- Medical History
  diabetes_type VARCHAR(20),
  thyroid_condition BOOLEAN,
  heart_conditions TEXT[],
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create audit log table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User-Patient assignments (for providers)
CREATE TABLE user_patient_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  assignment_type VARCHAR(50),
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  expires_at TIMESTAMP,
  active BOOLEAN DEFAULT true,
  UNIQUE(user_id, patient_id)
);

-- Membership status history
CREATE TABLE membership_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  change_reason TEXT,
  triggered_by VARCHAR(50),
  triggered_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Hashtag configuration
CREATE TABLE hashtag_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  color_hex VARCHAR(7) NOT NULL,
  icon_name VARCHAR(50),
  badge_style VARCHAR(50) DEFAULT 'solid',
  auto_apply_rules JSONB,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_name ON patients(last_name, first_name);
-- CREATE INDEX idx_patients_membership_status ON patients(membership_status);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_status_history_patient ON membership_status_history(patient_id);

-- Insert default roles
INSERT INTO roles (code, name, description, permissions) VALUES
  ('superadmin', 'Super Administrator', 'Full system access', '{"*": ["*"]}'),
  ('admin', 'Administrator', 'Administrative access', '{"users": ["read", "write"], "patients": ["read", "write"], "reports": ["read"], "settings": ["read", "write"]}'),
  ('provider', 'Healthcare Provider', 'Medical professional access', '{"patients": ["read", "write"], "soap_notes": ["read", "write", "approve"], "prescriptions": ["read", "write"]}'),
  ('sales_rep', 'Sales Representative', 'Sales and marketing access', '{"leads": ["read", "write"], "reports": ["read"], "campaigns": ["read"]}'),
  ('patient', 'Patient', 'Patient portal access', '{"self": ["read"], "appointments": ["read", "write"], "messages": ["read", "write"]}');

-- Insert default hashtags
INSERT INTO hashtag_configs (tag_name, display_name, color_hex, icon_name, priority) VALUES
  ('#activemember', 'Active Member', '#00C851', 'check-circle', 1),
  ('#qualified', 'Qualified', '#33B5E5', 'user-check', 2),
  ('#paused', 'Paused', '#FFA500', 'pause-circle', 3),
  ('#cancelled', 'Cancelled', '#FF4444', 'times-circle', 4),
  ('#pending', 'Pending Payment', '#FFBB33', 'clock', 5),
  ('#vip', 'VIP Patient', '#AA66CC', 'star', 6),
  ('#atrisk', 'At Risk', '#FF8800', 'exclamation-triangle', 7);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();