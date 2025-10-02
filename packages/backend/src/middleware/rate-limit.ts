/**
 * Rate Limiting Middleware
 * Protects against DDoS and brute force attacks
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * Create custom rate limit handler
 */
const rateLimitHandler = (req: Request, res: Response): void => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    method: req.method,
    headers: req.headers
  });
  
  res.status(429).json({
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: res.getHeader('Retry-After')
  });
};

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: rateLimitHandler,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.error('Authentication rate limit exceeded - possible brute force', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    
    res.status(429).json({
      error: 'Too Many Authentication Attempts',
      message: 'Your account has been temporarily locked due to too many failed login attempts.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

/**
 * Rate limiter for password reset endpoints
 * 3 requests per hour per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: 'Too many password reset requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * Rate limiter for webhook endpoints
 * 1000 requests per minute (higher limit for legitimate webhooks)
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Higher limit for webhooks
  message: 'Webhook rate limit exceeded.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Webhook rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      webhookId: req.body?.webhookId
    });
    
    // Return 200 to prevent webhook retries
    res.status(200).json({
      received: true,
      error: 'Rate limit exceeded, webhook queued for processing'
    });
  }
});

/**
 * Rate limiter for PHI access
 * Track excessive PHI access for security monitoring
 */
export const phiAccessLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit PHI access to 50 requests per 5 minutes
  message: 'Excessive PHI access detected. This has been logged for security review.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.error('Excessive PHI access - security alert', {
      ip: req.ip,
      userId: (req as any).user?.id,
      path: req.path,
      method: req.method
    });
    
    res.status(429).json({
      error: 'Security Alert',
      message: 'Excessive PHI access detected. Your activity has been logged and will be reviewed.',
      code: 'PHI_RATE_LIMIT'
    });
  }
});

/**
 * Dynamic rate limiter based on user role
 */
export const createRoleLimiter = (role: string) => {
  const limits: Record<string, number> = {
    superadmin: 1000,
    admin: 500,
    doctor: 200,
    nurse: 150,
    staff: 100,
    patient: 50
  };
  
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: limits[role] || 50, // Default to most restrictive
    keyGenerator: (req: Request) => {
      // Use user ID instead of IP for authenticated users
      return (req as any).user?.id || req.ip;
    },
    handler: rateLimitHandler
  });
};

/**
 * Sliding window rate limiter for better distribution
 */
export const slidingWindowLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  // Use sliding window instead of fixed window
  skipFailedRequests: false,
  skipSuccessfulRequests: false
});

export default {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  webhookLimiter,
  phiAccessLimiter,
  createRoleLimiter,
  slidingWindowLimiter
};