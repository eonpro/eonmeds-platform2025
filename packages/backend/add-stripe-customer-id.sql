-- Add stripe_customer_id column to patients table if it doesn't exist
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255); 