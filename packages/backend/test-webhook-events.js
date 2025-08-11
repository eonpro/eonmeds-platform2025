const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false }
    : false
});

async function testWebhookEvents() {
  const client = await pool.connect();
  
  try {
    // Check if webhook_events table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'webhook_events'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('webhook_events table does not exist!');
      process.exit(1);
    }
    
    // Get count of webhook events
    const countResult = await client.query(`
      SELECT COUNT(*) as total FROM webhook_events
    `);
    
    console.log(`Total webhook events: ${countResult.rows[0].total}\n`);
    
    // Get recent webhook events
    const recentEvents = await client.query(`
      SELECT 
        event_id,
        event_type,
        created_at,
        processed,
        error_message
      FROM webhook_events
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log('Recent webhook events:');
    recentEvents.rows.forEach(event => {
      console.log(`${event.created_at}: ${event.event_type} - ${event.event_id} (Processed: ${event.processed})`);
      if (event.error_message) {
        console.log(`  Error: ${event.error_message}`);
      }
    });
    
    // Check for any unprocessed events
    const unprocessedResult = await client.query(`
      SELECT COUNT(*) as unprocessed FROM webhook_events WHERE processed = false
    `);
    
    console.log(`\nUnprocessed events: ${unprocessedResult.rows[0].unprocessed}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

testWebhookEvents();
