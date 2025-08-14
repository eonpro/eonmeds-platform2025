-- Emergency fix for SOAP notes foreign key constraint
-- First, drop the constraint if it exists
ALTER TABLE soap_notes DROP CONSTRAINT IF EXISTS soap_notes_patient_id_fkey;

-- Change the column type to VARCHAR(50) if needed
ALTER TABLE soap_notes ALTER COLUMN patient_id TYPE VARCHAR(50) USING patient_id::VARCHAR(50);

-- Add the constraint back with the correct reference
ALTER TABLE soap_notes ADD CONSTRAINT soap_notes_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE;

-- Verify the fix
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'soap_notes' 
AND column_name = 'patient_id';
