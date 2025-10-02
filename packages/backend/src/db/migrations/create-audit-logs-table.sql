-- Create comprehensive audit logs table for enterprise compliance
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  user_id VARCHAR(255),
  patient_id INTEGER REFERENCES patients(patient_id),
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  error_message TEXT,
  stack_trace TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_patient_id ON audit_logs(patient_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_metadata ON audit_logs USING gin(metadata);

-- Create a summary view for reporting
CREATE OR REPLACE VIEW audit_summary AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  action,
  severity,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT patient_id) as unique_patients
FROM audit_logs
GROUP BY DATE_TRUNC('day', created_at), action, severity;
