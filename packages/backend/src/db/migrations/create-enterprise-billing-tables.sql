-- Enterprise Billing System Tables
-- Advanced features for webhook processing, dunning, and multi-currency

-- 1. Webhook Events Table (with retry logic)
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'failed_permanent')),
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    idempotency_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_webhook_events_status (status),
    INDEX idx_webhook_events_next_retry (next_retry_at),
    INDEX idx_webhook_events_stripe_id (stripe_event_id)
);

-- 2. Webhook Idempotency Table
CREATE TABLE IF NOT EXISTS webhook_idempotency (
    idempotency_key VARCHAR(255) PRIMARY KEY,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_idempotency_processed (processed_at)
);

-- 3. Dunning Events Table (for failed payment recovery)
CREATE TABLE IF NOT EXISTS dunning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    invoice_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    attempt_count INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'active' 
        CHECK (status IN ('active', 'paused', 'recovered', 'failed', 'cancelled')),
    next_retry_at TIMESTAMP WITH TIME ZONE,
    recovered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    total_recovery_attempts INTEGER DEFAULT 0,
    emails_sent JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dunning_status (status),
    INDEX idx_dunning_customer (customer_id),
    INDEX idx_dunning_next_retry (next_retry_at)
);

-- 4. Currency Exchange Rates Table
CREATE TABLE IF NOT EXISTS currency_exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(20, 10) NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_currency, to_currency, valid_from),
    INDEX idx_exchange_rates_currencies (from_currency, to_currency),
    INDEX idx_exchange_rates_validity (valid_from, valid_to)
);

-- 5. Tax Rates Table (regional compliance)
CREATE TABLE IF NOT EXISTS tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code VARCHAR(2) NOT NULL,
    state_code VARCHAR(10),
    tax_type VARCHAR(50) NOT NULL, -- 'sales_tax', 'vat', 'gst', etc
    rate DECIMAL(5, 4) NOT NULL, -- e.g., 0.0825 for 8.25%
    name VARCHAR(100),
    description TEXT,
    applies_to_digital BOOLEAN DEFAULT true,
    applies_to_physical BOOLEAN DEFAULT true,
    stripe_tax_rate_id VARCHAR(255),
    active BOOLEAN DEFAULT true,
    valid_from DATE NOT NULL,
    valid_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tax_rates_location (country_code, state_code),
    INDEX idx_tax_rates_active (active)
);

-- 6. Invoice Templates Table (customization)
CREATE TABLE IF NOT EXISTS invoice_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) DEFAULT 'standard', -- 'standard', 'detailed', 'minimal'
    header_content JSONB,
    footer_content JSONB,
    styling JSONB, -- CSS/styling options
    logo_url TEXT,
    company_details JSONB,
    payment_terms TEXT,
    notes_template TEXT,
    active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT only_one_default CHECK (
        is_default = false OR 
        NOT EXISTS (
            SELECT 1 FROM invoice_templates t2 
            WHERE t2.is_default = true 
            AND t2.id != invoice_templates.id
        )
    )
);

-- 7. Batch Operations Table
CREATE TABLE IF NOT EXISTS batch_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type VARCHAR(50) NOT NULL, -- 'invoice_generation', 'payment_collection', etc
    status VARCHAR(50) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    total_items INTEGER NOT NULL,
    processed_items INTEGER DEFAULT 0,
    successful_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    parameters JSONB NOT NULL,
    results JSONB DEFAULT '{}'::jsonb,
    error_log JSONB DEFAULT '[]'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_batch_operations_status (status),
    INDEX idx_batch_operations_type (operation_type)
);

-- 8. Revenue Recognition Table (accounting compliance)
CREATE TABLE IF NOT EXISTS revenue_recognition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    recognition_date DATE NOT NULL,
    recognition_period_start DATE NOT NULL,
    recognition_period_end DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled' 
        CHECK (status IN ('scheduled', 'recognized', 'deferred', 'reversed')),
    accounting_period VARCHAR(20), -- '2025-01', '2025-Q1', etc
    journal_entry_id VARCHAR(255), -- External accounting system reference
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_revenue_recognition_date (recognition_date),
    INDEX idx_revenue_recognition_period (accounting_period),
    INDEX idx_revenue_recognition_status (status)
);

-- 9. Billing Audit Log (compliance and debugging)
CREATE TABLE IF NOT EXISTS billing_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'invoice', 'subscription', 'payment', etc
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'charged', etc
    actor_id UUID REFERENCES users(id),
    actor_type VARCHAR(50) DEFAULT 'user', -- 'user', 'system', 'webhook'
    changes JSONB, -- before/after values
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_billing_audit_entity (entity_type, entity_id),
    INDEX idx_billing_audit_actor (actor_id),
    INDEX idx_billing_audit_created (created_at)
);

-- 10. SLA Tracking Table (enterprise SLAs)
CREATE TABLE IF NOT EXISTS sla_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    sla_type VARCHAR(50) NOT NULL, -- 'uptime', 'response_time', 'resolution_time'
    target_value DECIMAL(10, 2) NOT NULL,
    actual_value DECIMAL(10, 2),
    measurement_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    measurement_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    is_met BOOLEAN,
    credit_amount DECIMAL(10, 2) DEFAULT 0,
    credit_applied BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sla_customer (customer_id),
    INDEX idx_sla_period (measurement_period_start, measurement_period_end)
);

-- Add multi-currency support to existing tables
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(20, 10) DEFAULT 1;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS base_currency_amount DECIMAL(10, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON transactions(idempotency_key);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_rates JSONB DEFAULT '[]'::jsonb;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES invoice_templates(id);

ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS tax_behavior VARCHAR(20) DEFAULT 'exclusive'; -- 'exclusive', 'inclusive', 'unspecified'
ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS supported_currencies JSONB DEFAULT '["USD"]'::jsonb;

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to new tables
CREATE TRIGGER update_webhook_events_updated_at BEFORE UPDATE ON webhook_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dunning_events_updated_at BEFORE UPDATE ON dunning_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_rates_updated_at BEFORE UPDATE ON tax_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_templates_updated_at BEFORE UPDATE ON invoice_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batch_operations_updated_at BEFORE UPDATE ON batch_operations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revenue_recognition_updated_at BEFORE UPDATE ON revenue_recognition
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for enterprise reporting
CREATE OR REPLACE VIEW revenue_by_currency AS
SELECT 
    currency,
    DATE_TRUNC('month', created_at) as month,
    SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END) as gross_revenue,
    SUM(CASE WHEN status = 'succeeded' AND type = 'refund' THEN amount ELSE 0 END) as refunds,
    SUM(CASE WHEN status = 'succeeded' AND type != 'refund' THEN amount ELSE 0 END) - 
    SUM(CASE WHEN status = 'succeeded' AND type = 'refund' THEN amount ELSE 0 END) as net_revenue,
    COUNT(DISTINCT customer_id) as unique_customers
FROM transactions
GROUP BY currency, DATE_TRUNC('month', created_at);

CREATE OR REPLACE VIEW dunning_effectiveness AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as total_dunning_events,
    COUNT(CASE WHEN status = 'recovered' THEN 1 END) as recovered,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    AVG(CASE WHEN status = 'recovered' THEN total_recovery_attempts END) as avg_attempts_to_recover,
    SUM(CASE WHEN status = 'recovered' THEN amount ELSE 0 END) as recovered_revenue
FROM dunning_events
GROUP BY DATE_TRUNC('month', created_at);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
