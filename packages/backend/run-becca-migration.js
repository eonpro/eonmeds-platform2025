const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  console.log('🚀 Starting BECCA AI database migration...');
  
  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, 'src', 'config', 'becca-schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    console.log('📄 Schema loaded, executing migration...');
    
    // Execute the schema
    await pool.query(schema);
    
    console.log('✅ BECCA AI tables created successfully!');
    console.log('📊 Created tables:');
    console.log('   - soap_notes');
    console.log('   - becca_chat_history');
    console.log('   - ai_audit_log');
    
    // Verify tables were created
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('soap_notes', 'becca_chat_history', 'ai_audit_log')
      ORDER BY table_name
    `);
    
    console.log('\n✅ Verified tables exist:');
    tableCheck.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration(); 