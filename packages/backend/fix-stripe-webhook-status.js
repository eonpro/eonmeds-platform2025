const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function fixStripeWebhookStatus() {
  const client = await pool.connect();

  try {
    console.log("🔄 FIXING STRIPE WEBHOOK STATUS");
    console.log("========================================\n");

    // Get count of unprocessed Stripe webhooks
    const countResult = await client.query(`
      SELECT COUNT(*) as count
      FROM webhook_events 
      WHERE processed = false 
      AND (
        payload->>'type' IS NOT NULL
        AND payload->>'object' = 'event'
        AND payload->>'api_version' IS NOT NULL
      )
    `);

    const totalCount = parseInt(countResult.rows[0].count);
    console.log(`📊 Found ${totalCount} Stripe webhooks marked as unprocessed`);

    if (totalCount === 0) {
      console.log("✅ No unprocessed Stripe webhooks found!");
      return;
    }

    // Mark all Stripe webhooks as processed since they were already handled
    // but just not marked correctly
    console.log("\nMarking Stripe webhooks as processed...");

    const updateResult = await client.query(`
      UPDATE webhook_events 
      SET 
        processed = true,
        processed_at = COALESCE(processed_at, created_at),
        source = COALESCE(source, 'stripe'),
        event_type = COALESCE(event_type, payload->>'type')
      WHERE 
        processed = false 
        AND (
          payload->>'type' IS NOT NULL
          AND payload->>'object' = 'event'
          AND payload->>'api_version' IS NOT NULL
        )
      RETURNING id, payload->>'type' as type
    `);

    console.log(
      `\n✅ Successfully marked ${updateResult.rows.length} Stripe webhooks as processed`,
    );

    // Show breakdown by event type
    const typeBreakdown = await client.query(`
      SELECT 
        event_type,
        COUNT(*) as count
      FROM webhook_events
      WHERE source = 'stripe'
      GROUP BY event_type
      ORDER BY count DESC
      LIMIT 10
    `);

    console.log("\nTop Stripe event types:");
    console.log("Event Type | Count");
    console.log("-----------|-------");
    typeBreakdown.rows.forEach((row) => {
      console.log(`${row.event_type || "Unknown"} | ${row.count}`);
    });

    // Final check
    const finalCheck = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE processed = true) as processed,
        COUNT(*) FILTER (WHERE processed = false) as unprocessed,
        COUNT(*) as total
      FROM webhook_events
    `);

    console.log("\n========================================");
    console.log("FINAL WEBHOOK STATUS:");
    console.log(`✅ Processed: ${finalCheck.rows[0].processed}`);
    console.log(`⏳ Unprocessed: ${finalCheck.rows[0].unprocessed}`);
    console.log(`📊 Total: ${finalCheck.rows[0].total}`);
    console.log("========================================\n");
  } catch (error) {
    console.error("Error fixing webhook status:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
console.log("🚀 Starting Stripe webhook status fix...\n");
fixStripeWebhookStatus();
