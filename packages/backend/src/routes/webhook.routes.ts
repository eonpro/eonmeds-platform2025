import { Router } from 'express';
import { 
  handleHeyFlowWebhook, 
  webhookHealthCheck 
} from '../controllers/webhook.controller';
import { pool } from '../config/database';
import { bypassAuth } from '../middleware/bypass-auth';

const router = Router();

// Apply bypass auth to all webhook routes
router.use(bypassAuth);

// HeyFlow webhook endpoint
router.post('/heyflow', handleHeyFlowWebhook);

// Webhook health check
router.get('/health', webhookHealthCheck);

// Test webhook endpoint
router.get('/test', (_req, res) => {
  res.json({ 
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString(),
    auth: {
      hasAuthHeader: !!_req.headers.authorization,
      hasAuthProperty: !!((_req as any).auth),
      hasUserProperty: !!((_req as any).user),
      auth0Domain: process.env.AUTH0_DOMAIN || 'NOT_SET',
      auth0Audience: process.env.AUTH0_AUDIENCE || 'NOT_SET'
    }
  });
});

// Diagnostic endpoint to check environment
router.get('/debug/env', (_req, res) => {
  res.json({
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    databaseUrlLength: process.env.DATABASE_URL?.length || 0,
    dbHost: process.env.DB_HOST,
    dbSSL: process.env.DB_SSL,
    nodeEnv: process.env.NODE_ENV,
    hasJwtSecret: !!process.env.JWT_SECRET
  });
});

// Get recent webhook events for debugging
router.get('/recent', async (_req, res) => {
  try {
    const client = await pool.connect();
    
    // Get last 10 webhook events
    const result = await client.query(`
      SELECT 
        id,
        created_at,
        processed,
        processed_at,
        error_message,
        payload->'email' as email,
        payload->'firstname' as firstname,
        payload->'lastname' as lastname
      FROM webhook_events
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    client.release();
    
    res.json({
      total_events: result.rows.length,
      events: result.rows,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching recent webhooks:', error);
    res.status(500).json({ 
      error: 'Failed to fetch webhook events',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 