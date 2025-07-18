-- Create service_packages table
CREATE TABLE IF NOT EXISTS service_packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  billing_period VARCHAR(50) NOT NULL, -- Monthly, Quarterly, One-time
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster queries
CREATE INDEX idx_service_packages_active ON service_packages(is_active);
CREATE INDEX idx_service_packages_category ON service_packages(category);

-- Add service_package_id to invoice_items if it doesn't exist
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS service_package_id INTEGER REFERENCES service_packages(id);

-- Insert default packages
INSERT INTO service_packages (name, category, billing_period, price, description) VALUES
  ('Weight Loss - Monthly', 'Weight Loss', 'Monthly', 299.00, 'Monthly weight loss program with Semaglutide'),
  ('Weight Loss - Quarterly', 'Weight Loss', 'Quarterly', 799.00, 'Quarterly weight loss program with Semaglutide (save $98)'),
  ('Testosterone - Monthly', 'Testosterone', 'Monthly', 349.00, 'Monthly testosterone replacement therapy'),
  ('Testosterone - Quarterly', 'Testosterone', 'Quarterly', 949.00, 'Quarterly testosterone replacement therapy (save $98)'),
  ('Consultation', 'Consultation', 'One-time', 99.00, 'Medical consultation'),
  ('Lab Work', 'Lab Work', 'One-time', 150.00, 'Comprehensive lab work panel')
ON CONFLICT DO NOTHING; 