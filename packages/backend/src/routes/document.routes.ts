import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Document routes
router.get('/', authenticateToken, async (_req: Request, res: Response): Promise<Response> => {
  return res.json({ message: 'Document routes not implemented yet' });
});

export default router;
