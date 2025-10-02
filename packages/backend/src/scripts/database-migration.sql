-- Database migration script for billing system improvements
-- Run this script to ensure all necessary columns and tables exist

-- Add Stripe customer ID to patients table if it doesn't exist
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_patients_stripe_customer 
ON patients(stripe_customer_id);

-- Add Stripe payment intent ID to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);

-- Add Stripe invoice ID for subscription invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS stripe_invoice_id VARCHAR(255);

-- Add payment_date column if missing
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP;

-- Add amount_paid column if missing
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0;

-- Create invoice_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for invoice_payments
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id 
ON invoice_payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_stripe_intent 
ON invoice_payments(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_status 
ON invoice_payments(status);

-- Create webhook_events table for tracking Stripe webhooks
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for webhook events
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id 
ON stripe_webhook_events(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed 
ON stripe_webhook_events(processed);

-- Add recurring billing columns to invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurring_interval VARCHAR(20), -- 'monthly', 'quarterly', 'yearly'
ADD COLUMN IF NOT EXISTS next_billing_date DATE;

-- Create subscription table for managing recurring payments
CREATE TABLE IF NOT EXISTS patient_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, paused, cancelled
    start_date DATE NOT NULL,
    end_date DATE,
    billing_interval VARCHAR(20) NOT NULL DEFAULT 'monthly',
    amount DECIMAL(10, 2) NOT NULL,
    next_billing_date DATE,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_patient_subscriptions_patient_id 
ON patient_subscriptions(patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_subscriptions_status 
ON patient_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_patient_subscriptions_stripe_id 
ON patient_subscriptions(stripe_subscription_id);

-- Add payment method storage (encrypted)
CREATE TABLE IF NOT EXISTS patient_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    stripe_payment_method_id VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL DEFAULT 'card',
    last4 VARCHAR(4),
    brand VARCHAR(50),
    exp_month INTEGER,
    exp_year INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for payment methods
CREATE INDEX IF NOT EXISTS idx_patient_payment_methods_patient_id 
ON patient_payment_methods(patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_payment_methods_stripe_id 
ON patient_payment_methods(stripe_payment_method_id);

-- Ensure only one default payment method per patient
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_payment_methods_default 
ON patient_payment_methods(patient_id) 
WHERE is_default = TRUE;

-- Grant permissions if needed (adjust role names as needed)
-- GRANT ALL ON invoice_payments TO your_app_role;
-- GRANT ALL ON stripe_webhook_events TO your_app_role;
-- GRANT ALL ON patient_subscriptions TO your_app_role;
-- GRANT ALL ON patient_payment_methods TO your_app_role;

-- Verify the migration
SELECT 
    'Patients with Stripe customers' as metric,
    COUNT(*) FILTER (WHERE stripe_customer_id IS NOT NULL) as count,
    COUNT(*) as total,
    ROUND(100.0 * COUNT(*) FILTER (WHERE stripe_customer_id IS NOT NULL) / NULLIF(COUNT(*), 0), 2) as percentage
FROM patients

UNION ALL

SELECT 
    'Invoices with payment intents' as metric,
    COUNT(*) FILTER (WHERE stripe_payment_intent_id IS NOT NULL) as count,
    COUNT(*) as total,
    ROUND(100.0 * COUNT(*) FILTER (WHERE stripe_payment_intent_id IS NOT NULL) / NULLIF(COUNT(*), 0), 2) as percentage
FROM invoices

UNION ALL

SELECT 
    'Paid invoices' as metric,
    COUNT(*) FILTER (WHERE status = 'paid') as count,
    COUNT(*) as total,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'paid') / NULLIF(COUNT(*), 0), 2) as percentage
FROM invoices;