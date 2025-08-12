const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkRecentWebhooks() {
  const client = await pool.connect();

  try {
    console.log('Checking recent webhook events...\n');

    // Get recent webhook events
    const result = await client.query(`
      SELECT 
        id,
        event_id,
        event_type,
        payload->'flowID' as flow_id,
        payload->'formType' as form_type,
        payload->'type' as type,
        payload->'fields' as fields,
        created_at,
        processed,
        error_message
      FROM webhook_events
      WHERE event_type = 'heyflow.submission'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`Found ${result.rows.length} recent HeyFlow submissions:\n`);

    for (const event of result.rows) {
      console.log('='.repeat(50));
      console.log(`Event ID: ${event.event_id}`);
      console.log(`Created: ${event.created_at}`);
      console.log(`Flow ID: ${event.flow_id || 'Not found'}`);
      console.log(`Form Type: ${event.form_type || 'Not found'}`);
      console.log(`Type: ${event.type || 'Not found'}`);
      console.log(`Processed: ${event.processed ? 'Yes' : 'No'}`);
      if (event.error_message) {
        console.log(`Error: ${event.error_message}`);
      }

      // Check if this is an external english form
      if (event.flow_id && event.flow_id.includes('external-english')) {
        console.log('⚠️  This is an External English form!');
      }

      // Show first few fields
      if (event.fields) {
        console.log('\nFirst few fields:');
        const fields = event.fields;
        const fieldKeys = Object.keys(fields).slice(0, 5);
        fieldKeys.forEach((key) => {
          console.log(`  ${key}: ${JSON.stringify(fields[key])}`);
        });
      }
    }

    console.log('\n' + '='.repeat(50));
  } catch (error) {
    console.error('Error checking webhooks:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

checkRecentWebhooks();
