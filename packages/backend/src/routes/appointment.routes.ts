import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Stub routes - to be implemented
router.get('/', (_req: Request, res: Response): Response => {
  return res.json({ message: 'Appointment routes not yet implemented' });
});

export default router; 