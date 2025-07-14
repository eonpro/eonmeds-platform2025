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

export default router; 