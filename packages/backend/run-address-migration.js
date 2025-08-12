const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🚀 Running address fields migration...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'src/config/add-address-fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Run the migration
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');

    // Check if columns were added
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'patients' 
      AND column_name IN ('address_house', 'address_street', 'apartment_number')
    `;

    const result = await pool.query(checkQuery);
    console.log(
      '📋 New columns found:',
      result.rows.map((r) => r.column_name)
    );

    // Check some sample data
    const sampleQuery = `
      SELECT patient_id, address, address_house, address_street, apartment_number, city, state
      FROM patients
      LIMIT 5
    `;

    const sampleResult = await pool.query(sampleQuery);
    console.log('\n📊 Sample patient addresses:');
    sampleResult.rows.forEach((row) => {
      console.log(`Patient ${row.patient_id}:`);
      console.log(`  Legacy address: ${row.address || 'N/A'}`);
      console.log(`  House: ${row.address_house || 'N/A'}`);
      console.log(`  Street: ${row.address_street || 'N/A'}`);
      console.log(`  Apt: ${row.apartment_number || 'N/A'}`);
      console.log(`  City, State: ${row.city || 'N/A'}, ${row.state || 'N/A'}`);
      console.log('---');
    });
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

runMigration();
