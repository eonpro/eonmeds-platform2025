-- Add additional_info column to patients table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' 
    AND column_name = 'additional_info') THEN
    ALTER TABLE patients ADD COLUMN additional_info TEXT;
  END IF;
END $$; 