/**
 * Security Configuration
 * Centralized security settings for HIPAA compliance
 */

import helmet from 'helmet';
import { Express } from 'express';
import { apiLimiter, authLimiter, phiAccessLimiter } from '../middleware/rate-limit';
import { sessionTimeout } from '../middleware/session-timeout';
import { auditPHIAccess } from '../middleware/audit';
import { logger } from '../utils/logger';
import PHIEncryption from '../utils/encryption';

/**
 * Apply comprehensive security middleware
 */
export function applySecurityMiddleware(app: Express): void {
  // Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));
  
  // Apply rate limiting
  app.use('/api/', apiLimiter);
  app.use('/api/v1/auth', authLimiter);
  app.use('/api/v1/patients', phiAccessLimiter);
  app.use('/api/v1/ai/soap-notes', phiAccessLimiter);
  
  // Session timeout for HIPAA compliance
  app.use(sessionTimeout);
  
  // Audit PHI access
  app.use('/api/v1/patients/:patientId', auditPHIAccess);
  app.use('/api/v1/ai/soap-notes/:patientId', auditPHIAccess);
  
  // Disable X-Powered-By header
  app.disable('x-powered-by');
  
  // Validate encryption configuration on startup
  validateSecurityConfiguration();
  
  logger.info('Security middleware applied successfully');
}

/**
 * Security configuration validation
 */
export function validateSecurityConfiguration(): void {
  const errors: string[] = [];
  
  // Check required environment variables
  const requiredVars = [
    'JWT_SECRET',
    'AUTH0_DOMAIN',
    'AUTH0_CLIENT_ID',
    'SESSION_SECRET'
  ];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }
  
  // Check PHI encryption if configured
  if (process.env.PHI_ENCRYPTION_KEY) {
    try {
      PHIEncryption.validateConfiguration();
      logger.info('✅ PHI encryption validated');
    } catch (error) {
      errors.push('PHI encryption configuration invalid');
    }
  } else {
    logger.warn('⚠️  PHI_ENCRYPTION_KEY not configured - PHI encryption disabled');
  }
  
  // Check SSL/TLS in production
  if (process.env.NODE_ENV === 'production' && !process.env.FORCE_SSL) {
    logger.warn('⚠️  SSL not enforced in production - set FORCE_SSL=true');
  }
  
  // Check session timeout
  const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT_MINUTES || '15');
  if (sessionTimeout > 30) {
    logger.warn(`⚠️  Session timeout ${sessionTimeout} minutes exceeds HIPAA recommendation of 15-30 minutes`);
  }
  
  if (errors.length > 0) {
    logger.error('Security configuration errors:', errors);
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Security configuration invalid for production');
    }
  } else {
    logger.info('✅ Security configuration validated');
  }
}

/**
 * Security headers configuration
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'Expires': '0'
};

/**
 * CORS configuration for production
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
      'https://eonmeds-platform2025-production.up.railway.app'
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request from:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Session-Expires-In'],
  maxAge: 86400 // 24 hours
};

/**
 * Password policy configuration
 */
export const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  preventReuse: 5, // Prevent reuse of last 5 passwords
  maxAge: 90, // Days before password expires
  minAge: 1, // Days before password can be changed again
  lockoutAttempts: 5,
  lockoutDuration: 30 // Minutes
};

/**
 * Audit configuration
 */
export const auditConfig = {
  logLevel: 'info',
  retentionDays: 2555, // 7 years for HIPAA
  includeRequestBody: true,
  includeResponseBody: false,
  includePHI: false,
  alertOnSuspiciousActivity: true
};

export default {
  applySecurityMiddleware,
  validateSecurityConfiguration,
  securityHeaders,
  corsOptions,
  passwordPolicy,
  auditConfig
};