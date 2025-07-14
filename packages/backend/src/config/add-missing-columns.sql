-- Add missing columns to patients table for HeyFlow integration
-- Run this script to update the existing patients table

-- Add HeyFlow specific columns
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS heyflow_submission_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS form_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS form_version VARCHAR(20),
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS height_inches INTEGER,
ADD COLUMN IF NOT EXISTS weight_lbs DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS bmi DECIMAL(4,2),
ADD COLUMN IF NOT EXISTS medical_conditions TEXT[],
ADD COLUMN IF NOT EXISTS current_medications TEXT[],
ADD COLUMN IF NOT EXISTS allergies TEXT[],
ADD COLUMN IF NOT EXISTS consent_treatment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_telehealth BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending_review',
ADD COLUMN IF NOT EXISTS reviewed_by UUID,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;

-- Add patient ID generation (using a sequence for numeric IDs)
CREATE SEQUENCE IF NOT EXISTS patient_id_seq START 7000;

-- Create a function to generate patient IDs
CREATE OR REPLACE FUNCTION generate_patient_id() 
RETURNS VARCHAR AS $$
BEGIN
    RETURN 'P' || LPAD(nextval('patient_id_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Add patient_id column if it doesn't exist
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS patient_id VARCHAR(10) UNIQUE DEFAULT generate_patient_id();

-- Update existing patients with patient IDs if they don't have one
UPDATE patients 
SET patient_id = generate_patient_id() 
WHERE patient_id IS NULL; 