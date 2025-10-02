-- Create stripe_webhook_events table for audit trail
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_stripe_webhook_events_event_type ON stripe_webhook_events(event_type);
CREATE INDEX idx_stripe_webhook_events_created_at ON stripe_webhook_events(created_at);
CREATE INDEX idx_stripe_webhook_events_event_id ON stripe_webhook_events(event_id);

-- Create patient_subscriptions table if needed for subscription management
CREATE TABLE IF NOT EXISTS patient_subscriptions (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(patient_id),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_product_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_patient_subscriptions_patient_id ON patient_subscriptions(patient_id);
CREATE INDEX idx_patient_subscriptions_status ON patient_subscriptions(status);
CREATE INDEX idx_patient_subscriptions_stripe_id ON patient_subscriptions(stripe_subscription_id);
