import { checkJwt } from './auth0';
import { Request, Response, NextFunction } from 'express';

/**
 * HIPAA EMERGENCY SECURITY MIDDLEWARE
 * Created: January 7, 2025
 * Purpose: Lock down all endpoints to prevent PHI exposure
 * 
 * This middleware enforces authentication on ALL endpoints except
 * critical public ones needed for system operation.
 */

// Define public endpoints that don't require authentication
const PUBLIC_PATHS = [
  '/health',
  '/api/v1/health',
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/webhook/stripe',
  '/api/v1/webhook/heyflow',
  '/api/v1/public/invoice-payment',
  '/api/v1/public-payment',
  '/favicon.ico',
  '/robots.txt'
];

// Log all access attempts for HIPAA audit trail
const logAccess = (req: Request, authorized: boolean, reason: string) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';
  
  console.log(JSON.stringify({
    type: 'HIPAA_ACCESS_LOG',
    timestamp,
    method,
    path,
    ip,
    userAgent,
    authorized,
    reason
  }));
};

export const emergencyAuthCheck = (req: Request, res: Response, next: NextFunction) => {
  // Check if this is a public endpoint
  const isPublicPath = PUBLIC_PATHS.some(path => 
    req.path === path || req.path.startsWith(path + '/')
  );
  
  if (isPublicPath) {
    logAccess(req, true, 'public_endpoint');
    return next();
  }
  
  // Log attempt to access protected endpoint
  logAccess(req, false, 'protected_endpoint_auth_required');
  
  // Check for Auth0 configuration
  if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_AUDIENCE) {
    console.error('[HIPAA CRITICAL] Auth0 not configured - blocking all protected endpoints');
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Authentication service is not configured. System is in lockdown mode for HIPAA compliance.',
      hipaa_notice: 'This system contains PHI and requires proper authentication.'
    });
  }
  
  // Apply JWT validation for all other endpoints
  checkJwt(req, res, (err: any) => {
    if (err) {
      logAccess(req, false, `auth_failed: ${err.message}`);
      
      // Enhanced error response for HIPAA compliance
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required to access this resource',
        hipaa_notice: 'Access to PHI requires valid authentication',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    
    // Authentication successful
    logAccess(req, true, 'authenticated');
    next();
  });
};

/**
 * Middleware to check specific permissions for HIPAA compliance
 * Use this after emergencyAuthCheck for role-based access control
 */
export const checkHIPAAPermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).auth;
    
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No user context found',
        hipaa_notice: 'PHI access requires authentication'
      });
    }
    
    // Check if user has the required permission
    const permissions = user.permissions || [];
    if (!permissions.includes(requiredPermission)) {
      logAccess(req, false, `permission_denied: ${requiredPermission}`);
      
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions to access this resource',
        hipaa_notice: 'PHI access is restricted to authorized personnel only',
        required_permission: requiredPermission
      });
    }
    
    next();
  };
};

/**
 * Emergency lockdown mode - blocks ALL endpoints
 * Use this if a breach is detected
 */
export const emergencyLockdown = (reason: string) => {
  return (_req: Request, res: Response) => {
    console.error(`[HIPAA EMERGENCY LOCKDOWN] System locked down: ${reason}`);
    
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'System is in emergency lockdown mode',
      hipaa_notice: 'This action has been taken to protect PHI',
      contact: 'Please contact your system administrator immediately'
    });
  };
};