-- Create patient tracking table
CREATE TABLE IF NOT EXISTS patient_tracking (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id),
  tracking_number VARCHAR(100) UNIQUE NOT NULL,
  carrier VARCHAR(20) NOT NULL CHECK (carrier IN ('FedEx', 'UPS')),
  recipient_name VARCHAR(255) NOT NULL,
  delivery_address TEXT,
  delivery_date TIMESTAMP,
  ship_date TIMESTAMP,
  weight VARCHAR(50),
  service_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'In Transit',
  tracking_url TEXT,
  raw_email_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_tracking_number ON patient_tracking(tracking_number);
CREATE INDEX idx_patient_tracking ON patient_tracking(patient_id);
CREATE INDEX idx_tracking_status ON patient_tracking(status);
CREATE INDEX idx_tracking_created ON patient_tracking(created_at DESC);
CREATE INDEX idx_tracking_carrier ON patient_tracking(carrier);

-- Create tracking match log for audit trail
CREATE TABLE IF NOT EXISTS tracking_match_log (
  id SERIAL PRIMARY KEY,
  tracking_number VARCHAR(100) NOT NULL,
  match_method VARCHAR(50), -- 'exact_name', 'address', 'phone', 'manual'
  confidence_score DECIMAL(3,2),
  matched_patient_id INTEGER REFERENCES patients(id),
  operator_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add tracking count to patients table if it doesn't exist
ALTER TABLE patients ADD COLUMN IF NOT EXISTS 
  active_shipments_count INTEGER DEFAULT 0;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_patient_tracking_updated_at 
  BEFORE UPDATE ON patient_tracking 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
