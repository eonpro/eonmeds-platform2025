import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Document routes
router.get('/', authenticateToken, async (req, res) => {
  res.json({ message: 'Document routes not implemented yet' });
});

export default router; 