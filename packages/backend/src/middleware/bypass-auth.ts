import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to bypass authentication for webhook endpoints
 * This ensures webhooks can always be received regardless of Auth0 configuration
 */
export const bypassAuth = (req: Request, _res: Response, next: NextFunction) => {
  // Remove any auth headers that might trigger authentication
  delete req.headers.authorization;
  delete req.headers.Authorization;
  
  // Skip any auth property that might have been added
  delete (req as any).auth;
  delete (req as any).user;
  
  // Log that we're bypassing auth
  console.log(`🔓 Bypassing auth for webhook: ${req.method} ${req.path}`);
  
  next();
};
