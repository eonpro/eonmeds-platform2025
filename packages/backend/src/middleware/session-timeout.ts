/**
 * Session Timeout Middleware
 * HIPAA-compliant automatic session timeout after inactivity
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Extend Request type to include session
declare module 'express' {
  interface Request {
    session?: {
      lastActivity?: number;
      userId?: string;
      destroy?: () => void;
    };
  }
}

/**
 * HIPAA requires automatic logoff after a period of inactivity
 * Default: 15 minutes for clinical applications
 */
const TIMEOUT_MINUTES = parseInt(process.env.SESSION_TIMEOUT_MINUTES || '15');
const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000;

/**
 * Track session activity and enforce timeout
 */
export const sessionTimeout = (req: Request, res: Response, next: NextFunction): void => {
  // Skip for public endpoints
  const publicPaths = ['/health', '/api/v1/webhooks', '/api/v1/auth/login'];
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // Initialize session if needed
  if (!req.session) {
    req.session = {};
  }
  
  const now = Date.now();
  const lastActivity = req.session.lastActivity;
  
  // Check for timeout
  if (lastActivity) {
    const elapsed = now - lastActivity;
    
    if (elapsed > TIMEOUT_MS) {
      logger.warn('Session timeout due to inactivity', {
        userId: req.session.userId,
        inactiveMinutes: Math.floor(elapsed / 60000),
        ip: req.ip
      });
      
      // Clear session
      if (req.session.destroy) {
        req.session.destroy();
      }
      
      res.status(401).json({
        error: 'Session expired',
        message: `Your session has expired after ${TIMEOUT_MINUTES} minutes of inactivity. Please log in again.`,
        code: 'SESSION_TIMEOUT'
      });
      return;
    }
    
    // Warn if approaching timeout (2 minutes before)
    const timeRemaining = TIMEOUT_MS - elapsed;
    if (timeRemaining < 120000) {
      res.setHeader('X-Session-Expires-In', Math.floor(timeRemaining / 1000).toString());
    }
  }
  
  // Update last activity
  req.session.lastActivity = now;
  
  next();
};

/**
 * Session activity logger for audit trail
 */
export const logSessionActivity = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.session?.userId) {
    logger.debug('Session activity', {
      userId: req.session.userId,
      path: req.path,
      method: req.method,
      ip: req.ip
    });
  }
  
  next();
};

/**
 * Clear session on logout
 */
export const clearSession = (req: Request): void => {
  if (req.session) {
    const userId = req.session.userId;
    
    logger.info('Session cleared', {
      userId,
      reason: 'logout',
      ip: req.ip
    });
    
    if (req.session.destroy) {
      req.session.destroy();
    } else {
      req.session = {};
    }
  }
};

/**
 * Extend session for active users
 */
export const extendSession = (req: Request): void => {
  if (req.session) {
    req.session.lastActivity = Date.now();
    
    logger.debug('Session extended', {
      userId: req.session.userId,
      ip: req.ip
    });
  }
};

export default sessionTimeout;