import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { audit } from '../middleware/audit';

const router = Router();

// Public routes
router.post('/register', audit('REGISTER', 'auth'), register);
router.post('/login', audit('LOGIN', 'auth'), login);
router.post('/refresh-token', audit('REFRESH_TOKEN', 'auth'), refreshToken);

// Protected routes
router.post('/logout', authenticate, audit('LOGOUT', 'auth'), logout);
router.get('/me', authenticate, getCurrentUser);

export default router; 