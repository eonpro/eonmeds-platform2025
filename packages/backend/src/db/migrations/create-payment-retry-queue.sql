-- Create payment retry queue table
CREATE TABLE IF NOT EXISTS payment_retry_queue (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  payment_method_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  last_error TEXT,
  retry_at TIMESTAMP NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for efficient processing
CREATE INDEX idx_payment_retry_queue_status ON payment_retry_queue(status);
CREATE INDEX idx_payment_retry_queue_retry_at ON payment_retry_queue(retry_at);
CREATE INDEX idx_payment_retry_queue_invoice_id ON payment_retry_queue(invoice_id);

-- Add constraint to prevent duplicate pending retries
CREATE UNIQUE INDEX idx_payment_retry_queue_unique_pending 
ON payment_retry_queue(invoice_id) 
WHERE status IN ('pending', 'processing');
