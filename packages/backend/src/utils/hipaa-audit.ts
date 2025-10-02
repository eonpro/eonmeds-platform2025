import { Request } from 'express';
import { query } from '../db';

/**
 * HIPAA Audit Logging System
 * Created: January 7, 2025
 * Purpose: Track all PHI access for HIPAA compliance
 * 
 * Requirements:
 * - Log all access attempts to PHI
 * - Track successful and failed attempts
 * - Store sufficient detail for forensic analysis
 * - Maintain audit logs for minimum 6 years (HIPAA requirement)
 */

export interface HIPAAAuditLog {
  user_id?: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  patient_id?: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  error_message?: string;
  metadata?: any;
  request_method: string;
  request_path: string;
  response_status?: number;
}

/**
 * Log PHI access for HIPAA compliance
 */
export async function logHIPAAAccess(
  req: Request,
  log: Partial<HIPAAAuditLog>
): Promise<void> {
  try {
    const user = (req as any).auth || (req as any).user;
    
    const auditLog: HIPAAAuditLog = {
      user_id: user?.id || log.user_id,
      user_email: user?.email || log.user_email,
      action: log.action || req.method,
      resource_type: log.resource_type || 'unknown',
      resource_id: log.resource_id,
      patient_id: log.patient_id,
      ip_address: req.ip || req.socket.remoteAddress || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      success: log.success !== false,
      error_message: log.error_message,
      metadata: log.metadata,
      request_method: req.method,
      request_path: req.originalUrl || req.path,
      response_status: log.response_status,
    };
    
    // Store in database
    await query(
      `INSERT INTO hipaa_audit_logs 
       (user_id, user_email, action, resource_type, resource_id, patient_id,
        ip_address, user_agent, success, error_message, metadata,
        request_method, request_path, response_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
      [
        auditLog.user_id,
        auditLog.user_email,
        auditLog.action,
        auditLog.resource_type,
        auditLog.resource_id,
        auditLog.patient_id,
        auditLog.ip_address,
        auditLog.user_agent,
        auditLog.success,
        auditLog.error_message,
        JSON.stringify(auditLog.metadata),
        auditLog.request_method,
        auditLog.request_path,
        auditLog.response_status,
      ]
    );
  } catch (error) {
    // CRITICAL: If we can't log PHI access, we should alert immediately
    console.error('[HIPAA CRITICAL] Failed to log PHI access:', error);
    // In production, this should trigger an alert to compliance team
  }
}

/**
 * Middleware to automatically log PHI access
 */
export function auditPHIAccess(resourceType: string) {
  return async (req: Request, res: any, next: any) => {
    const startTime = Date.now();
    
    // Capture the original res.json to log response status
    const originalJson = res.json;
    res.json = function(data: any) {
      const responseTime = Date.now() - startTime;
      
      // Log the access
      logHIPAAAccess(req, {
        resource_type: resourceType,
        resource_id: req.params.id || req.params.patientId || req.query.id as string,
        patient_id: req.params.patientId || req.body?.patient_id,
        success: res.statusCode < 400,
        response_status: res.statusCode,
        metadata: {
          response_time_ms: responseTime,
          query_params: req.query,
          route_params: req.params,
        }
      }).catch(err => {
        console.error('[HIPAA Audit] Failed to log access:', err);
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * SQL to create the HIPAA audit logs table
 */
export const createHIPAAAuditTableSQL = `
-- HIPAA Audit Logs Table
-- Stores all PHI access attempts for compliance
CREATE TABLE IF NOT EXISTS hipaa_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  user_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  patient_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  request_method VARCHAR(10),
  request_path TEXT,
  response_status INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_hipaa_audit_user ON hipaa_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_hipaa_audit_email ON hipaa_audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_hipaa_audit_patient ON hipaa_audit_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_hipaa_audit_resource ON hipaa_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_hipaa_audit_created ON hipaa_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_hipaa_audit_success ON hipaa_audit_logs(success);

-- Table to track data breaches (HIPAA requirement)
CREATE TABLE IF NOT EXISTS hipaa_breach_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breach_date TIMESTAMPTZ NOT NULL,
  discovery_date TIMESTAMPTZ NOT NULL,
  affected_individuals INTEGER,
  type_of_phi VARCHAR(255),
  description TEXT NOT NULL,
  mitigation_steps TEXT,
  notification_sent BOOLEAN DEFAULT false,
  notification_date TIMESTAMPTZ,
  hhs_notified BOOLEAN DEFAULT false,
  hhs_notification_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255)
);

-- Table for security risk assessments (HIPAA requirement)
CREATE TABLE IF NOT EXISTS hipaa_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_date DATE NOT NULL,
  conducted_by VARCHAR(255),
  risk_level VARCHAR(50), -- low, medium, high, critical
  findings TEXT,
  recommendations TEXT,
  remediation_status VARCHAR(50), -- pending, in_progress, completed
  remediation_date DATE,
  next_assessment_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a view for easy compliance reporting
CREATE OR REPLACE VIEW hipaa_access_summary AS
SELECT 
  DATE(created_at) as access_date,
  resource_type,
  COUNT(*) as total_accesses,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT patient_id) as patients_accessed,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_accesses,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed_accesses
FROM hipaa_audit_logs
GROUP BY DATE(created_at), resource_type
ORDER BY access_date DESC, resource_type;

-- Function to purge old audit logs (keep 7 years per HIPAA)
CREATE OR REPLACE FUNCTION purge_old_hipaa_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM hipaa_audit_logs 
  WHERE created_at < NOW() - INTERVAL '7 years';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
`;

/**
 * Initialize HIPAA audit tables in the database
 */
export async function initializeHIPAAAuditTables(): Promise<void> {
  try {
    await query(createHIPAAAuditTableSQL);
    console.log('[HIPAA Audit] Tables initialized successfully');
  } catch (error) {
    console.error('[HIPAA Audit] Failed to initialize tables:', error);
    throw error;
  }
}
