-- Fix SOAP notes table structure
-- This script changes patient_id from UUID to VARCHAR to match the patients table

-- Drop the existing table (will lose existing data, but they were invalid anyway)
DROP TABLE IF EXISTS soap_notes CASCADE;

-- Create the table with the correct structure
CREATE TABLE soap_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
  content TEXT NOT NULL,
  original_content TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by VARCHAR(255) NOT NULL DEFAULT 'system',
  approved_by UUID,
  approved_by_name VARCHAR(255),
  approved_by_credentials VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  version INTEGER DEFAULT 1,
  edit_history JSONB,
  ai_model VARCHAR(100),
  ai_response_time_ms INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER
);

-- Create indexes for performance
CREATE INDEX idx_soap_notes_patient_id ON soap_notes(patient_id);
CREATE INDEX idx_soap_notes_status ON soap_notes(status);
CREATE INDEX idx_soap_notes_created_at ON soap_notes(created_at);

-- Grant necessary permissions (if needed)
-- GRANT ALL ON soap_notes TO eonmeds_admin; 