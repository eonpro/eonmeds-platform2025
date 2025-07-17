import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { query } from '../config/database';

// Audit log entry interface
interface AuditLogEntry {
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
}

// Create audit log entry
export const createAuditLog = async (entry: AuditLogEntry): Promise<void> => {
  try {
    await query(
      `INSERT INTO audit_logs 
       (user_id, action, resource_type, resource_id, details, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.user_id || null,
        entry.action,
        entry.resource_type,
        entry.resource_id || null,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.ip_address || null,
        entry.user_agent || null
      ]
    );
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit failure shouldn't break the app
  }
};

// Audit middleware factory
export const audit = (action: string, resourceType: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Capture original end function
    const originalEnd = res.end;
    const originalJson = res.json;
    let responseData: any;

    // Override json method to capture response
    (res as any).json = function(data: any) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Override end method to log after response
    (res as any).end = function(...args: any[]) {
      // Create audit log entry
      const entry: AuditLogEntry = {
        user_id: req.user?.id,
        action: action,
        resource_type: resourceType,
        resource_id: req.params.id || responseData?.id,
        details: {
          method: req.method,
          path: req.path,
          query: req.query,
          body: sanitizeBody(req.body),
          status_code: res.statusCode,
          response_data: sanitizeResponse(responseData)
        },
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent']
      };

      // Log to database asynchronously without blocking response
      createAuditLog(entry).catch(error => {
        console.error('Failed to create audit log:', error);
      });

      // Call original end with proper typing
      return originalEnd.apply(this, args as any);
    };

    next();
  };
};

// Audit specific actions
export const auditAction = async (
  req: AuthRequest,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: any
): Promise<void> => {
  const entry: AuditLogEntry = {
    user_id: req.user?.id,
    action: action,
    resource_type: resourceType,
    resource_id: resourceId,
    details: details,
    ip_address: getClientIp(req),
    user_agent: req.headers['user-agent']
  };

  await createAuditLog(entry);
};

// Get client IP address
function getClientIp(req: AuthRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// Sanitize request body to remove sensitive data
function sanitizeBody(body: any): any {
  if (!body) return null;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'password_confirmation', 'ssn', 'credit_card'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

// Sanitize response data
function sanitizeResponse(data: any): any {
  if (!data) return null;
  
  // For large responses, just log summary
  if (Array.isArray(data) && data.length > 10) {
    return { count: data.length, sample: data.slice(0, 3) };
  }
  
  if (typeof data === 'object') {
    const sanitized = { ...data };
    const sensitiveFields = ['password_hash', 'token', 'refresh_token'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
  
  return data;
}

// Middleware to log all PHI access
export const auditPHIAccess = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  // Log the access attempt
  await auditAction(
    req,
    'PHI_ACCESS',
    'patient_data',
    req.params.patientId || req.query.patientId as string,
    {
      endpoint: req.path,
      method: req.method,
      purpose: req.headers['x-access-purpose'] || 'treatment'
    }
  );
  
  next();
}; 