"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhook_controller_1 = require("../controllers/webhook.controller");
const database_1 = require("../config/database");
const bypass_auth_1 = require("../middleware/bypass-auth");
const router = (0, express_1.Router)();
router.use(bypass_auth_1.bypassAuth);
router.post("/heyflow", webhook_controller_1.handleHeyFlowWebhook);
router.get("/health", webhook_controller_1.webhookHealthCheck);
router.get("/test", (_req, res) => {
    res.json({
        message: "Webhook endpoint is working",
        timestamp: new Date().toISOString(),
        auth: {
            hasAuthHeader: !!_req.headers.authorization,
            hasAuthProperty: !!_req.auth,
            hasUserProperty: !!_req.user,
            auth0Domain: process.env.AUTH0_DOMAIN || "NOT_SET",
            auth0Audience: process.env.AUTH0_AUDIENCE || "NOT_SET",
        },
    });
});
router.get("/debug/env", (_req, res) => {
    res.json({
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        databaseUrlLength: process.env.DATABASE_URL?.length || 0,
        dbHost: process.env.DB_HOST,
        dbSSL: process.env.DB_SSL,
        nodeEnv: process.env.NODE_ENV,
        hasJwtSecret: !!process.env.JWT_SECRET,
    });
});
router.get("/recent", async (_req, res) => {
    try {
        const client = await database_1.pool.connect();
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
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Error fetching recent webhooks:", error);
        res.status(500).json({
            error: "Failed to fetch webhook events",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.default = router;
//# sourceMappingURL=webhook.routes.js.map