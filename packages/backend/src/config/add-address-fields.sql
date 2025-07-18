-- Add address breakdown fields for better formatting
-- July 2025 - Handle HeyFlow's dual address format

-- Add new address fields
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS address_house VARCHAR(20),
ADD COLUMN IF NOT EXISTS address_street VARCHAR(255),
ADD COLUMN IF NOT EXISTS apartment_number VARCHAR(50);

-- Create index for address searches
CREATE INDEX IF NOT EXISTS idx_patients_address_street ON patients(address_street);

-- Add comment explaining the fields
COMMENT ON COLUMN patients.address_house IS 'House/building number from HeyFlow address[house]';
COMMENT ON COLUMN patients.address_street IS 'Street name only from HeyFlow address[street]';
COMMENT ON COLUMN patients.apartment_number IS 'Apartment/unit number from HeyFlow apartment#';
COMMENT ON COLUMN patients.address IS 'Legacy full address field - kept for backward compatibility'; 