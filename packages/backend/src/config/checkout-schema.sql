-- Checkout System Database Schema
-- Run this to add order tracking to your database

-- Orders table for tracking all purchases
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  patient_id UUID REFERENCES patients(id),
  
  -- Stripe Integration
  stripe_session_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  
  -- Order Details
  plan_id VARCHAR(20),
  plan_type VARCHAR(50),
  plan_duration_months INTEGER,
  
  -- Pricing
  subtotal DECIMAL(10,2),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Customer Info (denormalized for historical record)
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  
  -- Addresses
  shipping_address JSONB,
  billing_address JSONB,
  
  -- Status
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, succeeded, failed
  fulfillment_status VARCHAR(50) DEFAULT 'unfulfilled', -- unfulfilled, processing, fulfilled, cancelled
  
  -- Metadata
  source VARCHAR(50) DEFAULT 'checkout_page', -- checkout_page, admin, api
  promo_code VARCHAR(50),
  notes TEXT,
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  fulfilled_at TIMESTAMP,
  cancelled_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_orders_patient_id ON orders(patient_id);
CREATE INDEX idx_orders_stripe_customer_id ON orders(stripe_customer_id);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- Order Items table (for future use with multiple products)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Product Information
  product_id VARCHAR(100),
  product_name VARCHAR(255),
  product_description TEXT,
  product_type VARCHAR(50), -- subscription, one_time, service
  
  -- Pricing
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  
  -- Metadata
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Payment Transactions table (tracks all payment attempts)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  patient_id UUID REFERENCES patients(id),
  
  -- Transaction Details
  transaction_type VARCHAR(50), -- charge, refund, partial_refund
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Stripe Details
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  stripe_refund_id VARCHAR(255),
  
  -- Status
  status VARCHAR(50), -- pending, succeeded, failed
  failure_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE INDEX idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_patient_id ON payment_transactions(patient_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);

-- Update existing invoices table to link with orders
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id);

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_number VARCHAR(20);
  number_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate order number like EON-20241213-1234
    new_number := 'EON-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
    
    -- Check if number already exists
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_number = new_number) INTO number_exists;
    
    -- Exit loop if number doesn't exist
    EXIT WHEN NOT number_exists;
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to auto-generate order numbers
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_update_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed)
GRANT SELECT, INSERT, UPDATE ON orders TO web_user;
GRANT SELECT, INSERT ON order_items TO web_user;
GRANT SELECT, INSERT ON payment_transactions TO web_user;

-- Sample query to view recent orders
/*
SELECT 
  o.order_number,
  o.customer_name,
  o.customer_email,
  o.total_amount,
  o.payment_status,
  o.created_at,
  p.patient_id
FROM orders o
LEFT JOIN patients p ON o.patient_id = p.id
ORDER BY o.created_at DESC
LIMIT 10;
*/
