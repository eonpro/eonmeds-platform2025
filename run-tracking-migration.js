const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  host: 'eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com',
  port: 5432,
  database: 'eonmeds',
  user: 'eonmeds_admin',
  password: '398Xakf$57',
  ssl: false
});

async function runMigration() {
  try {
    console.log('Connecting to database...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'packages/backend/src/migrations/create-tracking-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running migration...');
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('Created tables:');
    console.log('- patient_tracking');
    console.log('- tracking_match_log');
    console.log('- Added active_shipments_count to patients table');
    
    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('patient_tracking', 'tracking_match_log')
    `);
    
    console.log('\nVerified tables:', result.rows.map(r => r.table_name));
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();
