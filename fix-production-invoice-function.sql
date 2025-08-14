-- Fix Invoice Number Generation Function
-- Run this in Railway's database console

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1000;

-- Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR AS $$
DECLARE
  new_number VARCHAR;
BEGIN
  new_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::text, 5, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Test the function (optional)
SELECT generate_invoice_number() as test_invoice_number;
