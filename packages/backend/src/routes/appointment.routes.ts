import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Appointment routes
router.get('/', authenticateToken, async (req, res) => {
  res.json({ message: 'Appointment routes not implemented yet' });
});

export default router; 