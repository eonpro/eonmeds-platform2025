import { expressjwt as jwt, GetVerificationKey } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import { Request, Response, NextFunction } from 'express';

// Auth0 configuration from environment variables
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

// Configure the JWT validation middleware
export const checkJwt =
  AUTH0_DOMAIN && AUTH0_AUDIENCE
    ? jwt({
        // Dynamically provide a signing key based on the kid in the header
        secret: jwksRsa.expressJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
        }) as GetVerificationKey,

        // Validate the audience and the issuer
        audience: AUTH0_AUDIENCE,
        issuer: `https://${AUTH0_DOMAIN}/`,
        algorithms: ['RS256'],
      })
    : (_req: Request, res: Response, _next: NextFunction) => {
        res.status(503).json({
          error: 'Service Unavailable',
          message: 'Authentication service is not configured. Please contact system administrator.',
        });
      };

// Middleware to check specific permissions
export const checkPermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = (req as any).auth;

    if (!auth) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has the required permission
    const permissions = auth.permissions || [];
    if (!permissions.includes(permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Missing required permission: ${permission}`,
      });
    }

    next();
    return; // Add explicit return
  };
};

// Middleware to check if user has specific role
export const checkRole = (role: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = (req as any).auth;
    const roles = Array.isArray(role) ? role : [role];

    if (!auth) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has at least one of the required roles
    const userRoles = auth.roles || auth['https://eonmeds.com/roles'] || [];
    const hasRole = roles.some((r) => userRoles.includes(r));

    if (!hasRole) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Missing required role: ${roles.join(' or ')}`,
      });
    }

    next();
    return; // Add explicit return
  };
};

// Optional: Extract user language preference from token
export const getUserLanguage = (req: Request): string => {
  const auth = (req as any).auth;
  return auth?.['https://eonmeds.com/language'] || 'en';
};

// Error handler for JWT errors
export const handleAuthError = (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.message || 'Invalid token',
    });
  }
  next(err);
  return; // Add explicit return
};
