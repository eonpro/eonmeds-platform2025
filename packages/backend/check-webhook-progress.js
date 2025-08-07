const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function checkProgress() {
  await client.connect();
  try {
    const result = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE processed = true) as processed,
        COUNT(*) FILTER (WHERE processed = false) as unprocessed,
        COUNT(*) as total
      FROM webhook_events
    `);
    
    const stats = result.rows[0];
    const processedPercent = ((stats.processed / stats.total) * 100).toFixed(1);
    
    console.log('\n📊 WEBHOOK PROCESSING STATUS');
    console.log('========================================');
    console.log(`✅ Processed: ${stats.processed}`);
    console.log(`⏳ Unprocessed: ${stats.unprocessed}`);
    console.log(`📊 Total: ${stats.total}`);
    console.log(`📈 Progress: ${processedPercent}%`);
    console.log('========================================\n');
    
    // Check recent errors
    const errors = await client.query(`
      SELECT error_message, COUNT(*) as count
      FROM webhook_events
      WHERE processed = false AND error_message IS NOT NULL
      GROUP BY error_message
      ORDER BY count DESC
      LIMIT 5
    `);
    
    if (errors.rows.length > 0) {
      console.log('❌ Top Error Messages:');
      errors.rows.forEach(row => {
        console.log(`   - ${row.error_message}: ${row.count} times`);
      });
    }
    
    // Check recent successes
    const recent = await client.query(`
      SELECT COUNT(*) as count
      FROM patients
      WHERE created_at > NOW() - INTERVAL '5 minutes'
    `);
    
    console.log(`\n✨ Patients created in last 5 minutes: ${recent.rows[0].count}`);
    
  } finally {
    await client.end();
  }
}

checkProgress().catch(console.error);
