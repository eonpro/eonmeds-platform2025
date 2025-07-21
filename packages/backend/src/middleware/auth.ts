import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { query } from '../config/database';

// Extend Express Request type
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    roleCode: string;
    permissions: any;
  };
}

// JWT payload interface
interface JWTPayload {
  id: string;
  email: string;
  role: string;
  roleCode: string;
  permissions: any;
}

// Generate JWT token
export const generateToken = (user: any): string => {
  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: user.role_name,
    roleCode: user.role_code,
    permissions: user.permissions || {}
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const options: jwt.SignOptions = {
    expiresIn: expiresIn as any // Type assertion to handle the StringValue type
  };
  
  return jwt.sign(payload, secret, options);
};

// Generate refresh token
export const generateRefreshToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
  const options: jwt.SignOptions = {
    expiresIn: expiresIn as any // Type assertion to handle the StringValue type
  };
  
  return jwt.sign({ id: userId }, secret, options);
};

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  return bcrypt.hash(password, rounds);
};

// Compare password
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Authentication middleware
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Check if user still exists and is active
    const result = await query(
      `SELECT u.id, u.email, u.is_active, r.code as role_code, r.name as role_name, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    // Attach user to request
    req.user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      role: result.rows[0].role_name,
      roleCode: result.rows[0].role_code,
      permissions: result.rows[0].permissions
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
    } else {
      console.error('Authentication error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
};

// Authorization middleware
export const authorize = (resource: string, action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const userPermissions = req.user.permissions || {};

    // Superadmin has all permissions
    if (userPermissions['*']?.includes('*')) {
      return next();
    }

    // Check specific permission
    if (userPermissions[resource]?.includes(action) || 
        userPermissions[resource]?.includes('*')) {
      return next();
    }

    // Check self permission for patients
    if (resource === 'self' && req.user.roleCode === 'patient') {
      return next();
    }

    res.status(403).json({ error: 'Insufficient permissions' });
  };
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  // Use regular authenticate but don't fail
  authenticate(req, res, () => next()).catch(() => next());
};

// Export alias for backward compatibility
export const authenticateToken = authenticate; 

// Role-based access control middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRole = req.user.roleCode || req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Forbidden - Insufficient permissions',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
}; 

// Apply role checking middleware to all routes by default
export function applyRoleMiddleware(router: any, defaultRole: string = 'admin'): void {
  router.use((req: Request, res: Response, next: NextFunction) => {
    // Skip role check for specific routes
    const publicRoutes = ['/health', '/auth/login', '/auth/register'];
    if (publicRoutes.includes(req.path)) {
      return next();
    }
    
    // Apply default role requirement
    return requireRole([defaultRole])(req, res, next);
  });
} 