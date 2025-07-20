-- Add columns for sales rep tracking
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS assigned_rep VARCHAR(100),
ADD COLUMN IF NOT EXISTS rep_form_submission BOOLEAN DEFAULT FALSE;

-- Create index for better performance on rep queries
CREATE INDEX IF NOT EXISTS idx_patients_assigned_rep ON patients(assigned_rep);
CREATE INDEX IF NOT EXISTS idx_patients_rep_form ON patients(rep_form_submission);

-- Update existing patients to set rep_form_submission based on hashtags
UPDATE patients 
SET rep_form_submission = TRUE 
WHERE 'internalrep' = ANY(membership_hashtags)
  AND rep_form_submission IS NULL;

UPDATE patients 
SET rep_form_submission = FALSE 
WHERE rep_form_submission IS NULL; 