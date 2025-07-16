import { Router } from 'express';
import { 
  handleHeyFlowWebhook, 
  webhookHealthCheck 
} from '../controllers/webhook.controller';

const router = Router();

// HeyFlow webhook endpoint
router.post('/heyflow', handleHeyFlowWebhook);

// Webhook health check
router.get('/health', webhookHealthCheck);

// Test webhook endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Diagnostic endpoint to check environment
router.get('/debug/env', (req, res) => {
  res.json({
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    databaseUrlLength: process.env.DATABASE_URL?.length || 0,
    dbHost: process.env.DB_HOST,
    dbSSL: process.env.DB_SSL,
    nodeEnv: process.env.NODE_ENV,
    hasJwtSecret: !!process.env.JWT_SECRET
  });
});

export default router; 