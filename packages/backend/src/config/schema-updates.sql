-- EONMeds Database Schema Updates
-- This file adds missing tables and columns without dropping existing data

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create webhook_events table if it doesn't exist
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

-- Create weight_loss_intake table if it doesn't exist
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

-- Add missing columns to patients table if they don't exist
DO $$ 
BEGIN
  -- Add membership_status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'patients' 
                AND column_name = 'membership_status') THEN
    ALTER TABLE patients ADD COLUMN membership_status VARCHAR(50) DEFAULT 'qualified';
  END IF;

  -- Add membership_hashtags column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'patients' 
                AND column_name = 'membership_hashtags') THEN
    ALTER TABLE patients ADD COLUMN membership_hashtags TEXT[];
  END IF;

  -- Add status_updated_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'patients' 
                AND column_name = 'status_updated_at') THEN
    ALTER TABLE patients ADD COLUMN status_updated_at TIMESTAMP DEFAULT NOW();
  END IF;

  -- Add status_updated_by column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'patients' 
                AND column_name = 'status_updated_by') THEN
    ALTER TABLE patients ADD COLUMN status_updated_by UUID REFERENCES users(id);
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);
CREATE INDEX IF NOT EXISTS idx_patients_membership_status ON patients(membership_status);
CREATE INDEX IF NOT EXISTS idx_patients_hashtags ON patients USING GIN(membership_hashtags);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to patients table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_patients_updated_at') THEN
    CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Verify all required tables exist
DO $$
DECLARE
  missing_tables TEXT := '';
  required_tables TEXT[] := ARRAY['roles', 'users', 'patients', 'webhook_events', 'weight_loss_intake', 'audit_logs', 'membership_status_history', 'hashtag_configs'];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY required_tables
  LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      missing_tables := missing_tables || tbl || ', ';
    END IF;
  END LOOP;
  
  IF missing_tables != '' THEN
    RAISE NOTICE 'Missing tables: %', missing_tables;
    RAISE NOTICE 'Please run the full schema.sql file to create all tables';
  ELSE
    RAISE NOTICE 'All required tables exist ✓';
  END IF;
END $$; 