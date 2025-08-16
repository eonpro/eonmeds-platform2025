const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function runMigrations() {
  console.log('🚀 Running Stripe enterprise migrations...\n');
  
  const migrations = [
    {
      name: 'Invoice Payments Table',
      file: 'create-invoice-payments-table.sql'
    },
    {
      name: 'Stripe Webhook Events Table',
      file: 'create-stripe-webhook-events.sql'
    }
  ];
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const migration of migrations) {
    try {
      console.log(`📋 Running migration: ${migration.name}`);
      
      const migrationPath = path.join(__dirname, 'src/db/migrations', migration.file);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      await pool.query(sql);
      
      console.log(`✅ ${migration.name} - SUCCESS\n`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${migration.name} - FAILED`);
      console.error(`   Error: ${error.message}\n`);
      failureCount++;
    }
  }
  
  console.log('\n📊 Migration Summary:');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  
  if (failureCount === 0) {
    console.log('\n🎉 All migrations completed successfully!');
  } else {
    console.log('\n⚠️  Some migrations failed. Please check the errors above.');
  }
  
  await pool.end();
  process.exit(failureCount > 0 ? 1 : 0);
}

// Run migrations
runMigrations().catch(error => {
  console.error('Fatal error running migrations:', error);
  process.exit(1);
});
