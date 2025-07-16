-- Add additional fields to patients table for webhook data storage
-- This ensures we can store all incoming data from HeyFlow

-- Add columns for additional personal information
ALTER TABLE patients ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_name VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS language_preference VARCHAR(10) DEFAULT 'en';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);

-- Add columns for contact information
ALTER TABLE patients ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_type VARCHAR(20); -- mobile, home, work
ALTER TABLE patients ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'US';

-- Add columns for emergency contact
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(200);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(50);

-- Add columns for insurance information
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(200);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_group_number VARCHAR(100);

-- Add columns for additional medical information
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_type VARCHAR(10);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_history TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS family_medical_history TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS lifestyle_habits JSONB; -- smoking, drinking, exercise, etc.

-- Add columns for preferences and notes
ALTER TABLE patients ADD COLUMN IF NOT EXISTS communication_preferences JSONB; -- email, sms, phone
ALTER TABLE patients ADD COLUMN IF NOT EXISTS appointment_preferences JSONB; -- preferred times, days
ALTER TABLE patients ADD COLUMN IF NOT EXISTS provider_notes TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Add columns for tracking
ALTER TABLE patients ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS marketing_campaign VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100);

-- Add columns for consent tracking
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_marketing BOOLEAN DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_sms BOOLEAN DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_data_sharing BOOLEAN DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_research BOOLEAN DEFAULT false;

-- Add columns for form-specific data (JSONB for flexibility)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS form_responses JSONB; -- Store all form responses
ALTER TABLE patients ADD COLUMN IF NOT EXISTS custom_fields JSONB; -- Store any custom/unexpected fields

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_email_verified ON patients(email_verified);
CREATE INDEX IF NOT EXISTS idx_patients_language ON patients(language_preference);
CREATE INDEX IF NOT EXISTS idx_patients_state ON patients(state);
CREATE INDEX IF NOT EXISTS idx_patients_form_type ON patients(form_type);
CREATE INDEX IF NOT EXISTS idx_patients_referral ON patients(referral_source);

-- Update the updated_at timestamp
UPDATE patients SET updated_at = NOW() WHERE updated_at IS NULL; 