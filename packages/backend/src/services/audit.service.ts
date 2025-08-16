import { pool } from '../config/database';

export enum AuditAction {
  // Payment Actions
  PAYMENT_INTENT_CREATED = 'payment_intent.created',
  PAYMENT_INTENT_SUCCEEDED = 'payment_intent.succeeded',
  PAYMENT_INTENT_FAILED = 'payment_intent.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  
  // Invoice Actions
  INVOICE_CREATED = 'invoice.created',
  INVOICE_UPDATED = 'invoice.updated',
  INVOICE_DELETED = 'invoice.deleted',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_FAILED = 'invoice.payment_failed',
  
  // Customer Actions
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  PAYMENT_METHOD_ADDED = 'payment_method.added',
  PAYMENT_METHOD_REMOVED = 'payment_method.removed',
  
  // Subscription Actions
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  SUBSCRIPTION_REACTIVATED = 'subscription.reactivated',
  
  // Security Actions
  WEBHOOK_RECEIVED = 'webhook.received',
  WEBHOOK_FAILED = 'webhook.failed',
  API_RATE_LIMITED = 'api.rate_limited',
  AUTHENTICATION_FAILED = 'auth.failed',
  PERMISSION_DENIED = 'auth.permission_denied',
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

interface AuditLogEntry {
  action: AuditAction;
  severity: AuditSeverity;
  userId?: string;
  patientId?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
  stackTrace?: string;
}

class AuditService {
  /**
   * Log an audit entry
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO audit_logs (
          action, severity, user_id, patient_id, 
          resource_type, resource_id, metadata,
          ip_address, user_agent, error_message, 
          stack_trace, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          entry.action,
          entry.severity,
          entry.userId,
          entry.patientId,
          entry.resourceType,
          entry.resourceId,
          JSON.stringify(entry.metadata || {}),
          entry.ipAddress,
          entry.userAgent,
          entry.errorMessage,
          entry.stackTrace
        ]
      );
    } catch (error) {
      // Log to console if database write fails
      console.error('Failed to write audit log:', error);
      console.error('Audit entry:', JSON.stringify(entry));
    }
  }

  /**
   * Log a payment action
   */
  async logPayment(
    action: AuditAction,
    paymentId: string,
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action,
      severity: AuditSeverity.INFO,
      resourceType: 'payment',
      resourceId: paymentId,
      metadata: {
        amount,
        currency,
        ...metadata
      }
    });
  }

  /**
   * Log an error
   */
  async logError(
    action: AuditAction,
    error: Error,
    context?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action,
      severity: AuditSeverity.ERROR,
      errorMessage: error.message,
      stackTrace: error.stack,
      metadata: context
    });
  }

  /**
   * Log a security event
   */
  async logSecurity(
    action: AuditAction,
    severity: AuditSeverity,
    details: Record<string, any>,
    request?: any
  ): Promise<void> {
    await this.log({
      action,
      severity,
      userId: request?.auth?.sub,
      ipAddress: request?.ip || request?.connection?.remoteAddress,
      userAgent: request?.headers?.['user-agent'],
      metadata: details
    });
  }

  /**
   * Query audit logs
   */
  async query(filters: {
    action?: AuditAction;
    severity?: AuditSeverity;
    userId?: string;
    patientId?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (filters.action) {
      query += ` AND action = $${++paramCount}`;
      params.push(filters.action);
    }

    if (filters.severity) {
      query += ` AND severity = $${++paramCount}`;
      params.push(filters.severity);
    }

    if (filters.userId) {
      query += ` AND user_id = $${++paramCount}`;
      params.push(filters.userId);
    }

    if (filters.patientId) {
      query += ` AND patient_id = $${++paramCount}`;
      params.push(filters.patientId);
    }

    if (filters.resourceType) {
      query += ` AND resource_type = $${++paramCount}`;
      params.push(filters.resourceType);
    }

    if (filters.resourceId) {
      query += ` AND resource_id = $${++paramCount}`;
      params.push(filters.resourceId);
    }

    if (filters.startDate) {
      query += ` AND created_at >= $${++paramCount}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND created_at <= $${++paramCount}`;
      params.push(filters.endDate);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${++paramCount}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ` OFFSET $${++paramCount}`;
      params.push(filters.offset);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get audit summary for reporting
   */
  async getSummary(startDate: Date, endDate: Date): Promise<any> {
    const result = await pool.query(
      `SELECT 
        action,
        severity,
        COUNT(*) as count,
        DATE_TRUNC('day', created_at) as date
      FROM audit_logs
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY action, severity, DATE_TRUNC('day', created_at)
      ORDER BY date DESC, count DESC`,
      [startDate, endDate]
    );

    return result.rows;
  }

  /**
   * Clean up old audit logs
   */
  async cleanup(retentionDays: number = 90): Promise<number> {
    const result = await pool.query(
      `DELETE FROM audit_logs 
       WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
       RETURNING id`
    );

    return result.rowCount || 0;
  }
}

// Export singleton instance
export const auditService = new AuditService();
