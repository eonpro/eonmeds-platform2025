-- Comprehensive Billing System Schema
-- Created: January 2025
-- Purpose: Support complete invoicing, subscriptions, and financial reporting

-- 1. Billing Plans Table (Subscription Templates)
CREATE TABLE IF NOT EXISTS billing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    interval VARCHAR(20) NOT NULL CHECK (interval IN ('day', 'week', 'month', 'year')),
    interval_count INTEGER DEFAULT 1,
    trial_period_days INTEGER DEFAULT 0,
    features JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    stripe_product_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stripe_price_id)
);

-- 2. Subscriptions Table (Active Customer Subscriptions)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES billing_plans(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('trialing', 'active', 'canceled', 'past_due', 'paused', 'unpaid')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    pause_collection JSONB DEFAULT NULL,
    stripe_subscription_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stripe_subscription_id),
    INDEX idx_subscriptions_customer (customer_id),
    INDEX idx_subscriptions_status (status)
);

-- 3. Transactions Table (All Financial Events)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('charge', 'refund', 'subscription_payment', 'adjustment', 'credit')),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled')),
    customer_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    failure_code VARCHAR(255),
    failure_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_transactions_customer (customer_id),
    INDEX idx_transactions_status (status),
    INDEX idx_transactions_type (type),
    INDEX idx_transactions_created (created_at)
);

-- 4. Payment Methods Table (Stored Payment Methods)
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('card', 'bank_account', 'paypal')),
    brand VARCHAR(50),
    last4 VARCHAR(4),
    exp_month INTEGER,
    exp_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    stripe_payment_method_id VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stripe_payment_method_id),
    INDEX idx_payment_methods_customer (customer_id)
);

-- 5. Subscription Items Table (For Multiple Items per Subscription)
CREATE TABLE IF NOT EXISTS subscription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES billing_plans(id),
    quantity INTEGER DEFAULT 1,
    stripe_subscription_item_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stripe_subscription_item_id)
);

-- 6. Usage Records Table (For Metered Billing)
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_item_id UUID NOT NULL REFERENCES subscription_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    action VARCHAR(20) DEFAULT 'increment' CHECK (action IN ('increment', 'set')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_usage_records_item (subscription_item_id),
    INDEX idx_usage_records_timestamp (timestamp)
);

-- 7. Coupons Table (Discount Codes)
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(255) NOT NULL UNIQUE,
    amount_off DECIMAL(10, 2),
    percent_off DECIMAL(5, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    duration VARCHAR(20) NOT NULL CHECK (duration IN ('forever', 'once', 'repeating')),
    duration_in_months INTEGER,
    max_redemptions INTEGER,
    times_redeemed INTEGER DEFAULT 0,
    valid BOOLEAN DEFAULT true,
    redeem_by TIMESTAMP WITH TIME ZONE,
    stripe_coupon_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Applied Coupons Table (Track Coupon Usage)
CREATE TABLE IF NOT EXISTS applied_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id),
    customer_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ends_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(coupon_id, customer_id, subscription_id)
);

-- 9. Financial Summary Table (Cached Metrics)
CREATE TABLE IF NOT EXISTS financial_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('daily_revenue', 'mrr', 'arr', 'churn_rate', 'ltv')),
    value DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, metric_type, currency),
    INDEX idx_financial_summary_date (date),
    INDEX idx_financial_summary_type (metric_type)
);

-- 10. Invoice Line Items Enhancement (Add Subscription Support)
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS period_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS period_end TIMESTAMP WITH TIME ZONE;

-- 11. Invoices Enhancement (Add Subscription Support)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS auto_advance BOOLEAN DEFAULT true;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS collection_method VARCHAR(20) DEFAULT 'charge_automatically';

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp triggers
CREATE TRIGGER update_billing_plans_updated_at BEFORE UPDATE ON billing_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_items_updated_at BEFORE UPDATE ON subscription_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for common queries
CREATE INDEX idx_transactions_date_range ON transactions(created_at, status);
CREATE INDEX idx_subscriptions_active ON subscriptions(status) WHERE status = 'active';
CREATE INDEX idx_billing_plans_active ON billing_plans(active) WHERE active = true;

-- Create views for common metrics
CREATE OR REPLACE VIEW monthly_recurring_revenue AS
SELECT 
    DATE_TRUNC('month', CURRENT_DATE) as month,
    SUM(bp.amount * bp.interval_count) as mrr,
    bp.currency,
    COUNT(DISTINCT s.customer_id) as active_customers
FROM subscriptions s
JOIN billing_plans bp ON s.plan_id = bp.id
WHERE s.status = 'active'
AND s.cancel_at_period_end = false
GROUP BY bp.currency;

CREATE OR REPLACE VIEW revenue_by_plan AS
SELECT 
    bp.name as plan_name,
    COUNT(s.id) as active_subscriptions,
    SUM(bp.amount * bp.interval_count) as monthly_revenue,
    bp.currency
FROM billing_plans bp
LEFT JOIN subscriptions s ON bp.id = s.plan_id AND s.status = 'active'
GROUP BY bp.id, bp.name, bp.currency
ORDER BY monthly_revenue DESC;

-- Grant permissions (adjust based on your user roles)
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
