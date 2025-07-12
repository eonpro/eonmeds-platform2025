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

-- Create patients table with hashtag support
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20),
  
  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  country VARCHAR(2) DEFAULT 'US',
  
  -- Preferences
  preferred_language VARCHAR(5) DEFAULT 'es',
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  
  -- Membership & Hashtags
  membership_status VARCHAR(50) DEFAULT 'qualified',
  membership_hashtags TEXT[],
  status_updated_at TIMESTAMP DEFAULT NOW(),
  status_updated_by UUID REFERENCES users(id),
  
  -- Account
  account_status VARCHAR(50) DEFAULT 'pending',
  initial_form_type VARCHAR(50),
  stripe_customer_id VARCHAR(255) UNIQUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
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

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_membership_status ON patients(membership_status);
CREATE INDEX idx_patients_hashtags ON patients USING GIN(membership_hashtags);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_user_assignments_user ON user_patient_assignments(user_id, active);
CREATE INDEX idx_user_assignments_patient ON user_patient_assignments(patient_id, active);
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