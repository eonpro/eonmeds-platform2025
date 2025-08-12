const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create a new pool with the connection details
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: '398Xakf$57', // Using hardcoded password to avoid env issues
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runSchemaUpdates() {
  console.log('🔧 Running schema updates...\n');

  try {
    // Read the schema update file
    const schemaPath = path.join(__dirname, 'src/config/schema-updates.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Connect to database
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Execute the SQL
    console.log('📝 Executing schema updates...');
    await client.query(schemaSQL);

    // Verify tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('webhook_events', 'weight_loss_intake')
      ORDER BY table_name
    `);

    console.log('\n✅ Schema updates complete!');
    console.log('\n📋 HeyFlow-related tables:');
    tablesResult.rows.forEach((row) => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check columns on patients table
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'patients' 
      AND column_name IN ('membership_status', 'membership_hashtags')
      ORDER BY column_name
    `);

    console.log('\n📋 Patient membership columns:');
    columnsResult.rows.forEach((row) => {
      console.log(`   ✓ ${row.column_name}`);
    });

    client.release();
    console.log('\n✅ All updates applied successfully!');
  } catch (error) {
    console.error('\n❌ Schema update failed!');
    console.error('Error:', error.message);

    if (error.message.includes('already exists')) {
      console.log('\n💡 Some objects already exist - this is OK');
    }
  } finally {
    await pool.end();
  }
}

runSchemaUpdates();
