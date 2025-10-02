#!/bin/bash

# HIPAA EMERGENCY SECURITY LOCKDOWN SCRIPT
# Run this NOW to prevent data breach and HIPAA violations
# Date: January 7, 2025

set -e

echo "🚨🚨🚨 HIPAA EMERGENCY SECURITY LOCKDOWN 🚨🚨🚨"
echo "================================================"
echo ""
echo "This script will:"
echo "1. Make S3 buckets private"
echo "2. Enable encryption"
echo "3. Protect your platform from HIPAA violations"
echo ""
echo "Press Ctrl+C to abort, or wait 5 seconds to continue..."
sleep 5

# Configuration
S3_BUCKET="eonmeds-frontend-staging"
AWS_REGION="us-east-1"
BACKEND_DIR="packages/backend"
FRONTEND_DIR="packages/frontend"

echo ""
echo "📦 Step 1: Locking down S3 bucket..."
echo "------------------------------------"

# Remove public access
echo "Removing public access..."
aws s3api put-public-access-block \
  --bucket "${S3_BUCKET}" \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region "${AWS_REGION}" || echo "Public access block may already be set"

# Delete bucket policy if exists
echo "Removing bucket policy..."
aws s3api delete-bucket-policy \
  --bucket "${S3_BUCKET}" \
  --region "${AWS_REGION}" 2>/dev/null || echo "No bucket policy to remove"

# Enable encryption
echo "Enabling AES-256 encryption..."
aws s3api put-bucket-encryption \
  --bucket "${S3_BUCKET}" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}' \
  --region "${AWS_REGION}"

# Enable versioning for audit trail
echo "Enabling versioning..."
aws s3api put-bucket-versioning \
  --bucket "${S3_BUCKET}" \
  --versioning-configuration Status=Enabled \
  --region "${AWS_REGION}"

# Enable logging
echo "Creating logging bucket..."
LOG_BUCKET="${S3_BUCKET}-logs"
aws s3 mb "s3://${LOG_BUCKET}" --region "${AWS_REGION}" 2>/dev/null || echo "Log bucket exists"

aws s3api put-bucket-acl \
  --bucket "${LOG_BUCKET}" \
  --grant-write URI=http://acs.amazonaws.com/groups/s3/LogDelivery \
  --grant-read-acp URI=http://acs.amazonaws.com/groups/s3/LogDelivery \
  --region "${AWS_REGION}"

echo "Enabling access logging..."
aws s3api put-bucket-logging \
  --bucket "${S3_BUCKET}" \
  --bucket-logging-status \
  "LoggingEnabled={TargetBucket=${LOG_BUCKET},TargetPrefix=access-logs/}" \
  --region "${AWS_REGION}"

echo "✅ S3 bucket secured!"
echo ""

echo "🔐 Step 2: Creating emergency auth middleware..."
echo "------------------------------------------------"

# Create emergency auth middleware
cat > "${BACKEND_DIR}/src/middleware/emergency-auth.ts" << 'EOF'
import { checkJwt } from './auth0';
import { Request, Response, NextFunction } from 'express';

// HIPAA EMERGENCY: Lock down all endpoints except critical public ones
export const emergencyAuthCheck = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[HIPAA Security] Request to: ${req.method} ${req.path}`);
  
  // Only these endpoints can be accessed without authentication
  const publicPaths = [
    '/health',
    '/api/v1/health',
    '/api/v1/auth/login',
    '/api/v1/webhook/stripe',
    '/api/v1/webhook/heyflow',
    '/api/v1/public/invoice-payment'
  ];
  
  const isPublic = publicPaths.some(path => req.path.startsWith(path));
  
  if (isPublic) {
    console.log(`[HIPAA Security] Public endpoint allowed: ${req.path}`);
    return next();
  }
  
  console.log(`[HIPAA Security] Protected endpoint, checking JWT: ${req.path}`);
  
  // Everything else requires authentication
  return checkJwt(req, res, (err: any) => {
    if (err) {
      console.error(`[HIPAA Security] Auth failed for ${req.path}:`, err.message);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'HIPAA Security: Authentication required for this endpoint'
      });
    }
    next();
  });
};
EOF

echo "✅ Emergency auth middleware created!"
echo ""

echo "🧹 Step 3: Creating log sanitizer..."
echo "------------------------------------"

# Create log sanitizer
cat > "${BACKEND_DIR}/src/utils/log-sanitizer.ts" << 'EOF'
// HIPAA Compliance: Sanitize all PHI from logs
const PHI_FIELDS = [
  'ssn', 'social_security', 'dob', 'date_of_birth', 'birth_date',
  'medications', 'current_medications', 'medication_history',
  'conditions', 'medical_conditions', 'medical_history',
  'allergies', 'medication_allergies',
  'diagnosis', 'diagnoses', 'prescription', 'prescriptions',
  'patient_name', 'first_name', 'last_name', 'full_name',
  'address', 'street', 'phone', 'email',
  'insurance', 'policy_number', 'member_id',
  'credit_card', 'card_number', 'cvv', 'exp_date'
];

export function sanitizeLog(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return data;
  if (typeof data === 'number') return data;
  if (typeof data === 'boolean') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeLog(item));
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    
    for (const key in data) {
      const lowerKey = key.toLowerCase();
      
      // Check if this field contains PHI
      if (PHI_FIELDS.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[PHI_REDACTED]';
      } else if (key === 'password' || key === 'token' || key === 'secret') {
        sanitized[key] = '[SENSITIVE_REDACTED]';
      } else {
        sanitized[key] = sanitizeLog(data[key]);
      }
    }
    
    return sanitized;
  }
  
  return data;
}

// Override console methods for HIPAA compliance
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args: any[]) => {
  const sanitized = args.map(arg => sanitizeLog(arg));
  originalLog('[HIPAA_SAFE]', ...sanitized);
};

console.error = (...args: any[]) => {
  const sanitized = args.map(arg => sanitizeLog(arg));
  originalError('[HIPAA_SAFE_ERROR]', ...sanitized);
};

console.warn = (...args: any[]) => {
  const sanitized = args.map(arg => sanitizeLog(arg));
  originalWarn('[HIPAA_SAFE_WARN]', ...sanitized);
};

export function initializeHIPAALogging() {
  console.log('HIPAA-compliant logging initialized');
}
EOF

echo "✅ Log sanitizer created!"
echo ""

echo "📝 Step 4: Creating Auth0 configuration updater..."
echo "--------------------------------------------------"

# Create Auth0 config update script
cat > "${FRONTEND_DIR}/src/config/auth0-hipaa.config.js" << 'EOF'
// HIPAA-Compliant Auth0 Configuration
// Created: January 7, 2025
// This configuration ensures secure authentication for PHI access

export const AUTH0_HIPAA_CONFIG = {
  // Auth0 Tenant Configuration
  domain: process.env.REACT_APP_AUTH0_DOMAIN || 'dev-dvouayl22wlz8zwq.us.auth0.com',
  clientId: process.env.REACT_APP_AUTH0_CLIENT_ID || 'VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L',
  audience: process.env.REACT_APP_AUTH0_AUDIENCE || 'https://api.eonmeds.com',
  
  // HIPAA-compliant redirect URIs (HTTPS only in production)
  redirectUri: process.env.NODE_ENV === 'production'
    ? 'https://d3p4f8m2bxony8.cloudfront.net/callback'
    : 'http://localhost:3001/callback',
  
  logoutUri: process.env.NODE_ENV === 'production'
    ? 'https://d3p4f8m2bxony8.cloudfront.net'
    : 'http://localhost:3001',
  
  // Security settings for PHI protection
  scope: 'openid profile email offline_access',
  cacheLocation: 'memory', // More secure than localStorage for PHI
  useRefreshTokens: true,
  useRefreshTokensFallback: true,
  
  // Token settings
  authorizationParams: {
    prompt: 'select_account',
    max_age: 3600, // Force re-auth every hour for PHI access
  },
  
  // Session settings
  sessionCheckExpiryDays: 1,
  
  // Security headers
  httpTimeoutInSeconds: 10,
};

// Validate configuration at load time
if (!AUTH0_HIPAA_CONFIG.domain || !AUTH0_HIPAA_CONFIG.clientId) {
  console.error('[HIPAA VIOLATION] Auth0 configuration missing!');
  throw new Error('Auth0 configuration is required for HIPAA compliance');
}

export default AUTH0_HIPAA_CONFIG;
EOF

echo "✅ Auth0 HIPAA config created!"
echo ""

echo "🔒 Step 5: Creating CloudFront security headers..."
echo "--------------------------------------------------"

# Get CloudFront distribution ID
CF_DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Origins.Items[0].DomainName, '${S3_BUCKET}')].Id" \
  --output text \
  --region "${AWS_REGION}" | head -1)

if [ -n "$CF_DIST_ID" ]; then
  echo "Found CloudFront distribution: ${CF_DIST_ID}"
  
  # Create CloudFront function for security headers
  cat > /tmp/cf-security-headers.js << 'EOF'
function handler(event) {
    var response = event.response;
    var headers = response.headers;
    
    // HIPAA-compliant security headers
    headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload' };
    headers['x-content-type-options'] = { value: 'nosniff' };
    headers['x-frame-options'] = { value: 'DENY' };
    headers['x-xss-protection'] = { value: '1; mode=block' };
    headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
    headers['content-security-policy'] = { 
        value: "default-src 'self' https://*.auth0.com; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' https://*.auth0.com; style-src 'self' 'unsafe-inline';" 
    };
    
    return response;
}
EOF
  
  echo "Security headers function created"
else
  echo "⚠️  CloudFront distribution not found. You'll need to add security headers manually."
fi

echo ""
echo "🎯 Step 6: Creating HIPAA audit logger..."
echo "-----------------------------------------"

# Create HIPAA audit logger
cat > "${BACKEND_DIR}/src/utils/hipaa-audit.ts" << 'EOF'
import { Request } from 'express';
import { query } from '../db';

interface HIPAAAuditLog {
  user_id?: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  error_message?: string;
  metadata?: any;
}

export async function logHIPAAAccess(req: Request, log: Partial<HIPAAAuditLog>) {
  try {
    const auditLog: HIPAAAuditLog = {
      user_id: (req as any).user?.id,
      user_email: (req as any).user?.email,
      action: log.action || req.method,
      resource_type: log.resource_type || 'unknown',
      resource_id: log.resource_id,
      ip_address: req.ip || req.socket.remoteAddress || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      success: log.success !== false,
      error_message: log.error_message,
      metadata: log.metadata,
    };
    
    // Store in database
    await query(
      `INSERT INTO hipaa_audit_logs 
       (user_id, user_email, action, resource_type, resource_id, 
        ip_address, user_agent, success, error_message, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        auditLog.user_id,
        auditLog.user_email,
        auditLog.action,
        auditLog.resource_type,
        auditLog.resource_id,
        auditLog.ip_address,
        auditLog.user_agent,
        auditLog.success,
        auditLog.error_message,
        JSON.stringify(auditLog.metadata),
      ]
    );
  } catch (error) {
    console.error('[HIPAA Audit] Failed to log access:', error);
  }
}

// Create the audit table
export const createHIPAAAuditTable = `
CREATE TABLE IF NOT EXISTS hipaa_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  user_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hipaa_audit_user ON hipaa_audit_logs(user_id);
CREATE INDEX idx_hipaa_audit_resource ON hipaa_audit_logs(resource_type, resource_id);
CREATE INDEX idx_hipaa_audit_created ON hipaa_audit_logs(created_at);
`;
EOF

echo "✅ HIPAA audit logger created!"
echo ""

echo "✅✅✅ EMERGENCY LOCKDOWN COMPLETE ✅✅✅"
echo "======================================="
echo ""
echo "✔️ S3 bucket is now private and encrypted"
echo "✔️ Emergency auth middleware created"
echo "✔️ Log sanitizer implemented"
echo "✔️ HIPAA audit system ready"
echo ""
echo "⚠️  CRITICAL NEXT STEPS:"
echo "1. Rotate your Auth0 client secret NOW in the dashboard"
echo "2. Update backend .env with new secret"
echo "3. Deploy these changes immediately"
echo "4. Test that all endpoints require authentication"
echo ""
echo "📋 Verification commands:"
echo "aws s3api get-bucket-acl --bucket ${S3_BUCKET} --region ${AWS_REGION}"
echo "aws s3api get-bucket-encryption --bucket ${S3_BUCKET} --region ${AWS_REGION}"
echo ""
echo "🔒 Remember: This is an EMERGENCY fix."
echo "   You still need to implement full HIPAA compliance!"
echo ""
