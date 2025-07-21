import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Stub routes - to be implemented
router.get('/', (_, res) => {
  res.json({ message: 'Appointment routes not yet implemented' });
});

export default router; 