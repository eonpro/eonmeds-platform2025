import { expressjwt, GetVerificationKey } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';

// Auth0 configuration from environment variables
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
  throw new Error('Auth0 configuration missing. Please check AUTH0_DOMAIN and AUTH0_AUDIENCE in .env');
}

// Configure the JWT validation middleware
export const checkJwt = expressjwt({
  // Dynamically provide a signing key based on the kid in the header
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
  }) as GetVerificationKey,

  // Validate the audience and the issuer
  audience: AUTH0_AUDIENCE,
  issuer: `https://${AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

// Middleware to check specific permissions
export const checkPermission = (permission: string): RequestHandler => {
  return (req, res, next) => {
    const user = (req as any).auth;
    
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if user has the required permission
    const permissions = user.permissions || [];
    if (!permissions.includes(permission)) {
      res.status(403).json({ 
        error: 'Forbidden', 
        message: `Missing required permission: ${permission}` 
      });
      return;
    }

    next();
    return;
  };
};

// Middleware to check if user has any of the specified roles
export const checkRole = (roles: string[]): RequestHandler => {
  return (req, res, next) => {
    const user = (req as any).auth;
    
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get user roles from Auth0 token
    // Check multiple possible locations where roles might be stored
    const userRoles = user['https://eonmeds.com/roles'] || 
                     user['https://eonmeds.us.auth0.com/roles'] ||
                     user.roles || 
                     [];
    
    // For now, allow all authenticated users to access AI features
    // TODO: Implement proper role checking once Auth0 roles are configured
    console.log('User roles:', userRoles);
    console.log('Required roles:', roles);
    
    // Temporarily allow all authenticated users
    next();
    return;
    
    /* Uncomment when roles are properly configured
    // Check if user has at least one of the required roles
    const hasRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Insufficient role privileges' 
      });
      return;
    }

    next();
    return;
    */
  };
};

// Optional: Extract user language preference from token
export const getUserLanguage = (req: Request): string => {
  const user = (req as any).auth;
  return user?.['https://eonmeds.com/language'] || 'en';
};

// Error handler for JWT errors
export const handleAuthError: ErrorRequestHandler = (err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      error: 'Unauthorized',
      message: err.message || 'Invalid token'
    });
    return;
  }
  next(err);
  return;
}; 