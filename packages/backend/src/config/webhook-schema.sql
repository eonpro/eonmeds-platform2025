-- Webhook Form Configuration Schema
-- For dynamic field mapping and quick form connections

-- Form configuration table
CREATE TABLE IF NOT EXISTS form_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Form identification
  heyflow_form_id VARCHAR(255) UNIQUE NOT NULL,
  form_name VARCHAR(255) NOT NULL,
  form_type VARCHAR(100) NOT NULL, -- weight_loss, testosterone, diabetes, etc.
  form_version VARCHAR(20),
  
  -- Field mappings (JSON object mapping HeyFlow fields to database fields)
  field_mappings JSONB NOT NULL DEFAULT '{}',
  required_fields TEXT[],
  
  -- Processing rules
  auto_approve BOOLEAN DEFAULT false,
  requires_lab_review BOOLEAN DEFAULT false,
  default_provider_id UUID REFERENCES users(id),
  
  -- Notifications
  notification_emails TEXT[],
  notification_sms BOOLEAN DEFAULT false,
  webhook_secret VARCHAR(255),
  
  -- Statistics
  total_submissions INTEGER DEFAULT 0,
  successful_submissions INTEGER DEFAULT 0,
  failed_submissions INTEGER DEFAULT 0,
  last_submission_at TIMESTAMP,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  auto_detected BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Unmapped fields tracking (for improving auto-detection)
CREATE TABLE IF NOT EXISTS unmapped_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id VARCHAR(255) NOT NULL,
  field_names TEXT[],
  sample_values JSONB,
  occurrence_count INTEGER DEFAULT 1,
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Webhook processing metrics
CREATE TABLE IF NOT EXISTS webhook_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  
  -- Daily metrics
  total_received INTEGER DEFAULT 0,
  successful INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  avg_processing_time_ms INTEGER,
  
  -- Error breakdown
  signature_errors INTEGER DEFAULT 0,
  validation_errors INTEGER DEFAULT 0,
  database_errors INTEGER DEFAULT 0,
  
  UNIQUE(form_id, date)
);

-- Quick connect sessions (for 5-minute setup tracking)
CREATE TABLE IF NOT EXISTS quick_connect_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  
  -- Setup progress
  form_id VARCHAR(255),
  form_name VARCHAR(255),
  form_type VARCHAR(100),
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(255),
  
  -- Steps completed
  url_generated BOOLEAN DEFAULT false,
  test_received BOOLEAN DEFAULT false,
  fields_mapped BOOLEAN DEFAULT false,
  first_submission BOOLEAN DEFAULT false,
  
  -- Timing
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  setup_duration_seconds INTEGER,
  
  -- User info
  setup_by_email VARCHAR(255),
  setup_by_ip INET
);

-- Field mapping templates (pre-configured mappings for common forms)
CREATE TABLE IF NOT EXISTS field_mapping_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(255) NOT NULL,
  form_type VARCHAR(100) NOT NULL,
  field_mappings JSONB NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default field mapping templates
INSERT INTO field_mapping_templates (template_name, form_type, field_mappings, is_default) VALUES
(
  'Weight Loss Standard',
  'weight_loss',
  '{
    "firstname": "first_name",
    "lastname": "last_name",
    "email": "email",
    "PhoneNumber": "phone",
    "dob": "date_of_birth",
    "gender": "gender",
    "feet": "height_feet",
    "inches": "height_inches",
    "starting_weight": "weight_lbs",
    "target_weight": "target_weight_lbs",
    "consent_treatment": "consent_treatment",
    "consent_telehealth": "consent_telehealth"
  }',
  true
),
(
  'Testosterone Standard',
  'testosterone',
  '{
    "first_name": "first_name",
    "last_name": "last_name",
    "email_address": "email",
    "phone_number": "phone",
    "date_of_birth": "date_of_birth",
    "gender": "gender",
    "symptoms": "current_symptoms",
    "testosterone_level": "testosterone_level",
    "previous_treatment": "previous_treatment",
    "consent": "consent_treatment"
  }',
  true
),
(
  'Diabetes Management',
  'diabetes',
  '{
    "patient_first_name": "first_name",
    "patient_last_name": "last_name",
    "contact_email": "email",
    "contact_phone": "phone",
    "birth_date": "date_of_birth",
    "a1c_level": "a1c_level",
    "diabetes_type": "diabetes_type",
    "current_medications": "current_medications",
    "insulin_dependent": "insulin_use"
  }',
  true
);

-- Create indexes for performance
CREATE INDEX idx_form_config_active ON form_configurations(is_active);
CREATE INDEX idx_form_config_form_id ON form_configurations(heyflow_form_id);
CREATE INDEX idx_unmapped_fields_form ON unmapped_fields(form_id);
CREATE INDEX idx_unmapped_reviewed ON unmapped_fields(reviewed);
CREATE INDEX idx_webhook_metrics_date ON webhook_metrics(form_id, date);
CREATE INDEX idx_quick_connect_token ON quick_connect_sessions(session_token);

-- Create trigger to update submission counts
CREATE OR REPLACE FUNCTION update_form_submission_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.processed = true AND OLD.processed = false THEN
    UPDATE form_configurations
    SET 
      total_submissions = total_submissions + 1,
      successful_submissions = CASE 
        WHEN NEW.error_message IS NULL 
        THEN successful_submissions + 1 
        ELSE successful_submissions 
      END,
      failed_submissions = CASE 
        WHEN NEW.error_message IS NOT NULL 
        THEN failed_submissions + 1 
        ELSE failed_submissions 
      END,
      last_submission_at = NEW.created_at
    WHERE heyflow_form_id = (NEW.payload->>'form'->>'id')::text
       OR heyflow_form_id = (NEW.payload->>'flowID')::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_form_stats 
AFTER UPDATE ON webhook_events
FOR EACH ROW 
WHEN (NEW.source = 'heyflow')
EXECUTE FUNCTION update_form_submission_count(); 