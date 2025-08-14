import { expressjwt as jwt, GetVerificationKey } from "express-jwt";
import jwksRsa from "jwks-rsa";
import { Request } from "express";

// Auth0 configuration from environment variables
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

// Log warning but don't throw at build time
if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
  console.warn(
<<<<<<< HEAD
    '⚠️  Auth0 configuration missing. Please set AUTH0_DOMAIN and AUTH0_AUDIENCE environment variables.'
=======
    "⚠️  Auth0 configuration missing. Please set AUTH0_DOMAIN and AUTH0_AUDIENCE environment variables.",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
  );
}

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
<<<<<<< HEAD
        algorithms: ['RS256'],
      })
    : (_req: Request, res: any, _next: any) => {
        res.status(503).json({
          error: 'Service Unavailable',
          message: 'Authentication service is not configured. Please contact system administrator.',
=======
        algorithms: ["RS256"],
      })
    : (_req: Request, res: any, _next: any) => {
        res.status(503).json({
          error: "Service Unavailable",
          message:
            "Authentication service is not configured. Please contact system administrator.",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
        });
        return;
      };

// Middleware to check specific permissions
export const checkPermission = (permission: string) => {
  return (_req: Request, res: any, next: any) => {
    const req = _req as any;

    if (!req.auth) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Check if user has the required permission
    const permissions = req.auth.permissions || [];
    if (!permissions.includes(permission)) {
      res.status(403).json({
<<<<<<< HEAD
        error: 'Forbidden',
=======
        error: "Forbidden",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
        message: `Missing required permission: ${permission}`,
      });
      return;
    }

    next();
    return;
  };
};

// Middleware to check if user has specific role
export const checkRole = (role: string | string[]) => {
  return (_req: Request, res: any, next: any) => {
    const req = _req as any;
    const roles = Array.isArray(role) ? role : [role];

    if (!req.auth) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Get user roles from Auth0 token
    // Check multiple possible locations where roles might be stored
    const userRoles =
<<<<<<< HEAD
      req.auth['https://eonmeds.com/roles'] ||
=======
      req.auth["https://eonmeds.com/roles"] ||
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
      req.auth[`https://${AUTH0_DOMAIN}/roles`] ||
      req.auth.roles ||
      [];

    // For now, allow all authenticated users to access AI features
    // TODO: Implement proper role checking once Auth0 roles are configured
<<<<<<< HEAD
    console.log('User roles:', userRoles);
    console.log('Required roles:', roles);
=======
    console.log("User roles:", userRoles);
    console.log("Required roles:", roles);
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33

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
  return user?.["https://eonmeds.com/language"] || "en";
};

// Error handler for JWT errors
export const handleAuthError = (
  err: any,
  _req: Request,
  res: any,
  _next: any,
) => {
  if (err.name === "UnauthorizedError") {
    res.status(401).json({
<<<<<<< HEAD
      error: 'Unauthorized',
      message: err.message || 'Invalid token',
=======
      error: "Unauthorized",
      message: err.message || "Invalid token",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
    });
    return;
  }
  _next(err);
  return;
};
