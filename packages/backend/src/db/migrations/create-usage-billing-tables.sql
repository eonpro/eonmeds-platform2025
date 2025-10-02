-- Usage-Based Billing Tables
-- For metered billing and consumption tracking

-- 1. Usage Meters Table (Define what to measure)
CREATE TABLE IF NOT EXISTS usage_meters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    value_type VARCHAR(20) NOT NULL CHECK (value_type IN ('sum', 'max', 'last', 'unique_count')),
    aggregation_method VARCHAR(30) NOT NULL CHECK (aggregation_method IN ('sum', 'last_during_period', 'last_ever', 'max')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    stripe_meter_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_usage_meters_status (status),
    INDEX idx_usage_meters_event_name (event_name)
);

-- 2. Meter Pricing Table (How to charge for usage)
CREATE TABLE IF NOT EXISTS meter_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meter_id UUID NOT NULL REFERENCES usage_meters(id) ON DELETE CASCADE,
    pricing_model VARCHAR(20) NOT NULL CHECK (pricing_model IN ('per_unit', 'tiered', 'volume', 'graduated')),
    currency VARCHAR(3) DEFAULT 'USD',
    per_unit_price DECIMAL(10, 4), -- For per_unit model
    tiers JSONB DEFAULT '[]'::jsonb, -- For tiered/volume pricing
    transform_quantity JSONB, -- e.g., {"divide_by": 1000, "round": "up"}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(meter_id)
);

-- 3. Usage Records Table (Already exists but adding more fields)
ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS meter_id UUID REFERENCES usage_meters(id);
ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES patients(id);
ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS identifier VARCHAR(255); -- For unique_count
ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS stripe_usage_record_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_usage_records_meter ON usage_records(meter_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_customer ON usage_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_timestamp ON usage_records(timestamp);

-- 4. Usage Limits Table (Prevent overuse)
CREATE TABLE IF NOT EXISTS usage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    meter_id UUID NOT NULL REFERENCES usage_meters(id) ON DELETE CASCADE,
    limit_value DECIMAL(20, 4) NOT NULL,
    period VARCHAR(20) NOT NULL CHECK (period IN ('day', 'week', 'month')),
    action VARCHAR(20) DEFAULT 'alert' CHECK (action IN ('alert', 'block')),
    active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, meter_id),
    INDEX idx_usage_limits_active (active)
);

-- 5. Usage Alerts Table (Track notifications)
CREATE TABLE IF NOT EXISTS usage_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    meter_id UUID NOT NULL REFERENCES usage_meters(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'limit_exceeded', 'threshold_reached', etc
    threshold_percentage INTEGER,
    usage_value DECIMAL(20, 4),
    limit_value DECIMAL(20, 4),
    message TEXT,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_usage_alerts_customer (customer_id),
    INDEX idx_usage_alerts_acknowledged (acknowledged)
);

-- 6. Usage Aggregations Table (Cached calculations)
CREATE TABLE IF NOT EXISTS usage_aggregations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meter_id UUID NOT NULL REFERENCES usage_meters(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    aggregated_value DECIMAL(20, 4) NOT NULL,
    event_count INTEGER DEFAULT 0,
    min_value DECIMAL(20, 4),
    max_value DECIMAL(20, 4),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(meter_id, customer_id, period_start, period_end),
    INDEX idx_usage_aggregations_period (period_start, period_end)
);

-- 7. Meter Events Log (Raw events from various sources)
CREATE TABLE IF NOT EXISTS meter_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(100) NOT NULL,
    customer_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    value DECIMAL(20, 4) NOT NULL,
    identifier VARCHAR(255),
    source VARCHAR(50), -- 'api', 'webhook', 'import', etc
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_meter_events_processed (processed),
    INDEX idx_meter_events_timestamp (timestamp),
    INDEX idx_meter_events_event_name (event_name)
);

-- Add usage support to billing plans
ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS usage_type VARCHAR(20) CHECK (usage_type IN ('licensed', 'metered', 'hybrid'));
ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS included_usage JSONB DEFAULT '{}'::jsonb; -- e.g., {"api_calls": 1000, "storage_gb": 10}

-- Add usage tracking to subscription items
ALTER TABLE subscription_items ADD COLUMN IF NOT EXISTS meter_id UUID REFERENCES usage_meters(id);
ALTER TABLE subscription_items ADD COLUMN IF NOT EXISTS included_quantity DECIMAL(20, 4);

-- Create functions for usage calculation

-- Function to get current period usage
CREATE OR REPLACE FUNCTION get_current_period_usage(
    p_customer_id UUID,
    p_meter_id UUID,
    p_period_start TIMESTAMP WITH TIME ZONE,
    p_period_end TIMESTAMP WITH TIME ZONE
) RETURNS DECIMAL AS $$
DECLARE
    v_meter usage_meters;
    v_usage DECIMAL;
BEGIN
    -- Get meter configuration
    SELECT * INTO v_meter FROM usage_meters WHERE id = p_meter_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Meter not found';
    END IF;
    
    -- Calculate based on aggregation method
    CASE v_meter.aggregation_method
        WHEN 'sum' THEN
            SELECT COALESCE(SUM(quantity), 0) INTO v_usage
            FROM usage_records
            WHERE customer_id = p_customer_id 
            AND meter_id = p_meter_id
            AND timestamp >= p_period_start 
            AND timestamp < p_period_end;
            
        WHEN 'max' THEN
            SELECT COALESCE(MAX(quantity), 0) INTO v_usage
            FROM usage_records
            WHERE customer_id = p_customer_id 
            AND meter_id = p_meter_id
            AND timestamp >= p_period_start 
            AND timestamp < p_period_end;
            
        WHEN 'last_during_period' THEN
            SELECT COALESCE(quantity, 0) INTO v_usage
            FROM usage_records
            WHERE customer_id = p_customer_id 
            AND meter_id = p_meter_id
            AND timestamp >= p_period_start 
            AND timestamp < p_period_end
            ORDER BY timestamp DESC
            LIMIT 1;
            
        WHEN 'last_ever' THEN
            SELECT COALESCE(quantity, 0) INTO v_usage
            FROM usage_records
            WHERE customer_id = p_customer_id 
            AND meter_id = p_meter_id
            AND timestamp < p_period_end
            ORDER BY timestamp DESC
            LIMIT 1;
    END CASE;
    
    RETURN v_usage;
END;
$$ LANGUAGE plpgsql;

-- Function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(
    p_customer_id UUID,
    p_meter_id UUID,
    p_new_quantity DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
    v_limit usage_limits;
    v_current_usage DECIMAL;
    v_period_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get active limit
    SELECT * INTO v_limit 
    FROM usage_limits 
    WHERE customer_id = p_customer_id 
    AND meter_id = p_meter_id 
    AND active = true;
    
    IF NOT FOUND THEN
        RETURN true; -- No limit set
    END IF;
    
    -- Calculate period start
    CASE v_limit.period
        WHEN 'day' THEN
            v_period_start := DATE_TRUNC('day', CURRENT_TIMESTAMP);
        WHEN 'week' THEN
            v_period_start := DATE_TRUNC('week', CURRENT_TIMESTAMP);
        WHEN 'month' THEN
            v_period_start := DATE_TRUNC('month', CURRENT_TIMESTAMP);
    END CASE;
    
    -- Get current usage
    v_current_usage := get_current_period_usage(
        p_customer_id, 
        p_meter_id, 
        v_period_start, 
        CURRENT_TIMESTAMP
    );
    
    -- Check if adding new quantity would exceed limit
    IF v_current_usage + p_new_quantity > v_limit.limit_value THEN
        -- Create alert
        INSERT INTO usage_alerts (
            customer_id, meter_id, alert_type, 
            usage_value, limit_value, message
        ) VALUES (
            p_customer_id, p_meter_id, 'limit_exceeded',
            v_current_usage + p_new_quantity, v_limit.limit_value,
            'Usage limit would be exceeded'
        );
        
        RETURN v_limit.action != 'block';
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE TRIGGER update_usage_meters_updated_at BEFORE UPDATE ON usage_meters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meter_pricing_updated_at BEFORE UPDATE ON meter_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_limits_updated_at BEFORE UPDATE ON usage_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for usage analytics

-- Current billing period usage by customer
CREATE OR REPLACE VIEW current_period_usage AS
SELECT 
    s.id as subscription_id,
    s.customer_id,
    si.meter_id,
    um.display_name as meter_name,
    s.current_period_start,
    s.current_period_end,
    get_current_period_usage(
        s.customer_id, 
        si.meter_id, 
        s.current_period_start, 
        s.current_period_end
    ) as usage_amount,
    si.included_quantity,
    GREATEST(0, get_current_period_usage(
        s.customer_id, 
        si.meter_id, 
        s.current_period_start, 
        s.current_period_end
    ) - COALESCE(si.included_quantity, 0)) as billable_usage
FROM subscriptions s
JOIN subscription_items si ON s.id = si.subscription_id
JOIN usage_meters um ON si.meter_id = um.id
WHERE s.status = 'active'
AND si.meter_id IS NOT NULL;

-- Usage trends by meter
CREATE OR REPLACE VIEW usage_trends AS
SELECT 
    um.id as meter_id,
    um.display_name as meter_name,
    DATE_TRUNC('day', ur.timestamp) as date,
    COUNT(DISTINCT ur.customer_id) as unique_customers,
    COUNT(*) as event_count,
    SUM(ur.quantity) as total_usage,
    AVG(ur.quantity) as avg_usage,
    MIN(ur.quantity) as min_usage,
    MAX(ur.quantity) as max_usage
FROM usage_records ur
JOIN usage_meters um ON ur.meter_id = um.id
WHERE ur.timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY um.id, um.display_name, DATE_TRUNC('day', ur.timestamp)
ORDER BY date DESC;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
