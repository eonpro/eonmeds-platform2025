import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * General API rate limiter
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for payment endpoints
 */
export const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 payment requests per windowMs
  message: 'Too many payment requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests
  skipSuccessfulRequests: true,
});

/**
 * Very strict rate limiter for sensitive operations
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per hour
  message: 'Too many requests for this sensitive operation, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Custom rate limiter with user-based limiting
 */
export const createUserRateLimiter = (maxRequests: number = 50) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: maxRequests,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise use IP
      return (req as any).auth?.sub || req.ip;
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: res.getHeader('Retry-After')
      });
    }
  });
};
