#!/bin/bash

# Run Stripe Database Migrations
# This script applies all necessary Stripe tables to the database

set -e

echo "🚀 Running Stripe Database Migrations..."
echo "============================================"

# Load environment variables
if [ -f "env.local" ]; then
    export $(cat env.local | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ No environment file found. Please create env.local or .env"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set"
    exit 1
fi

echo "📊 Connecting to database..."
echo "Database: $(echo $DATABASE_URL | sed 's/postgresql:\/\/[^@]*@/postgresql:\/\/***@/')"

# Run migrations
echo ""
echo "🔧 Creating Stripe tables..."
psql "$DATABASE_URL" << 'EOF'
-- Complete Stripe Integration Tables for EONMEDS
-- HIPAA Compliant: No PHI stored, only opaque IDs
-- Created: 2025-09-07

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Tenants (clinics/practices)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  billing_email VARCHAR(255) NOT NULL,
  platform_fee_bps INTEGER DEFAULT 1000, -- 1000 = 10%
  payout_schedule VARCHAR(50) DEFAULT 'monthly',
  stripe_account_id VARCHAR(255), -- For future Connect migration
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Stripe Customers (linked to internal patients)
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  patient_uuid VARCHAR(255) NOT NULL, -- Internal patient ID (no PHI)
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  billing_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, patient_uuid)
);

-- Payment Methods (saved cards)
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES stripe_customers(id),
  stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) DEFAULT 'card',
  brand VARCHAR(50),
  last4 VARCHAR(4),
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Products (tenant-specific offerings)
CREATE TABLE IF NOT EXISTS stripe_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  stripe_product_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL, -- Generic name, no PHI
  type VARCHAR(50) NOT NULL, -- one_time|subscription
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Prices (specific pricing for products)
CREATE TABLE IF NOT EXISTS stripe_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES stripe_products(id),
  stripe_price_id VARCHAR(255) UNIQUE NOT NULL,
  unit_amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  interval VARCHAR(50), -- month|year|week|day (NULL for one-time)
  interval_count INTEGER, -- e.g., 3 for every 3 months
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TRANSACTION TABLES
-- ============================================================

-- Payments (all payment intents)
CREATE TABLE IF NOT EXISTS stripe_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  customer_id UUID REFERENCES stripe_customers(id),
  stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_charge_id VARCHAR(255),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50) NOT NULL, -- succeeded|failed|processing|requires_action
  type VARCHAR(50) NOT NULL, -- one_time|subscription|refund
  description VARCHAR(500), -- Generic description only
  platform_fee_cents INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  customer_id UUID REFERENCES stripe_customers(id),
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_price_id VARCHAR(255),
  status VARCHAR(50) NOT NULL, -- active|past_due|canceled|incomplete
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoices (Stripe invoices)
CREATE TABLE IF NOT EXISTS stripe_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  customer_id UUID REFERENCES stripe_customers(id),
  stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_subscription_id VARCHAR(255),
  amount_due_cents INTEGER NOT NULL,
  amount_paid_cents INTEGER DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50) NOT NULL, -- draft|open|paid|void|uncollectible
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Refunds
CREATE TABLE IF NOT EXISTS stripe_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES stripe_payments(id),
  stripe_refund_id VARCHAR(255) UNIQUE NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  reason VARCHAR(255),
  status VARCHAR(50) NOT NULL, -- succeeded|failed|pending|canceled
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Disputes (chargebacks)
CREATE TABLE IF NOT EXISTS stripe_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES stripe_payments(id),
  stripe_dispute_id VARCHAR(255) UNIQUE NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  reason VARCHAR(255),
  status VARCHAR(50) NOT NULL, -- warning_needs_response|needs_response|under_review|won|lost
  evidence_due_by TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- WEBHOOK & RECONCILIATION TABLES
-- ============================================================

-- Webhook Events (idempotency)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ledger Entries (internal accounting)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  source VARCHAR(50) NOT NULL, -- payment|refund|dispute|payout|fee
  source_id VARCHAR(255) NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  direction VARCHAR(10) NOT NULL, -- debit|credit
  balance_cents INTEGER NOT NULL, -- Running balance per tenant
  description VARCHAR(500),
  occurred_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- EXTERNAL PAYMENT MATCHING TABLES
-- ============================================================

-- External Payments (from Stripe checkout links, etc.)
CREATE TABLE IF NOT EXISTS external_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  email_seen VARCHAR(255),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50) DEFAULT 'pending_review', -- matched|pending_review|posted|refunded
  matched_customer_id UUID REFERENCES stripe_customers(id),
  matched_confidence FLOAT,
  mapped_product_id UUID REFERENCES stripe_products(id),
  mapped_price_id UUID REFERENCES stripe_prices(id),
  raw_event_id VARCHAR(255),
  raw_payload JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Unmatched Queue (manual review)
CREATE TABLE IF NOT EXISTS unmatched_payments_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  email_seen VARCHAR(255),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  stripe_object_type VARCHAR(50),
  stripe_object_id VARCHAR(255),
  reason VARCHAR(255),
  suggestions JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Product Catalog Mapping (Stripe to EHR)
CREATE TABLE IF NOT EXISTS product_catalog_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  stripe_product_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  ehr_product_code VARCHAR(255) NOT NULL,
  default_amount_cents INTEGER,
  currency VARCHAR(3) DEFAULT 'usd',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, stripe_product_id, stripe_price_id)
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_stripe_customers_tenant ON stripe_customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_patient ON stripe_customers(patient_uuid);
CREATE INDEX IF NOT EXISTS idx_payment_methods_customer ON payment_methods(customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_products_tenant ON stripe_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_tenant ON stripe_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_customer ON stripe_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_status ON stripe_payments(status);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_tenant ON stripe_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status ON stripe_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_tenant ON stripe_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_status ON stripe_invoices(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON stripe_webhook_events(type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant ON ledger_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_occurred ON ledger_entries(occurred_at);
CREATE INDEX IF NOT EXISTS idx_external_payments_status ON external_payments(status);
CREATE INDEX IF NOT EXISTS idx_external_payments_email ON external_payments(email_seen);

-- ============================================================
-- SEED DATA (for testing)
-- ============================================================

-- Insert default tenant if none exists
INSERT INTO tenants (id, name, billing_email, platform_fee_bps)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Default Clinic',
  'billing@defaultclinic.com',
  1000
)
ON CONFLICT DO NOTHING;

-- Check if tables were created
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ Created'
    ELSE '❌ Failed'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'tenants',
  'stripe_customers',
  'payment_methods',
  'stripe_products',
  'stripe_prices',
  'stripe_payments',
  'stripe_subscriptions',
  'stripe_invoices',
  'stripe_refunds',
  'stripe_disputes',
  'stripe_webhook_events',
  'ledger_entries',
  'external_payments',
  'unmatched_payments_queue',
  'product_catalog_map'
)
ORDER BY table_name;

EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Stripe database migrations completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Configure Stripe webhook endpoint in Stripe Dashboard"
    echo "2. Set STRIPE_WEBHOOK_SECRET environment variable"
    echo "3. Test with Stripe CLI: stripe listen --forward-to localhost:3000/api/webhook/stripe"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi
