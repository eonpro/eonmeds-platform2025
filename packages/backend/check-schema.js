const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false,
});

async function checkSchema() {
  try {
    const client = await pool.connect();

    // Check if patient_id column exists
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'patients'
      ORDER BY column_name;
    `);

    console.log('Columns in patients table:');
    result.rows.forEach((row) => {
      console.log(` - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Count patients
    const countResult = await client.query('SELECT COUNT(*) as count FROM patients');
    console.log(`\nTotal patients: ${countResult.rows[0].count}`);

    // Check if any patients exist
    const patientsResult = await client.query(
      'SELECT id, first_name, last_name, email FROM patients LIMIT 5'
    );
    if (patientsResult.rows.length > 0) {
      console.log('\nSample patients:');
      patientsResult.rows.forEach((p) => {
        console.log(` - ${p.id}: ${p.first_name} ${p.last_name} (${p.email})`);
      });
    }

    // Check if patient_id column exists
    const patientIdCheck = await client.query(`
      SELECT COUNT(*) as has_patient_id 
      FROM information_schema.columns 
      WHERE table_name = 'patients' 
      AND column_name = 'patient_id'
    `);

    if (patientIdCheck.rows[0].has_patient_id === '0') {
      console.log('\n⚠️  WARNING: patient_id column does not exist!');
      console.log('Running migration to add patient_id column...');

      // Run the migration
      await client.query(`
        CREATE SEQUENCE IF NOT EXISTS patient_id_seq START 7000;
        
        ALTER TABLE patients 
        ADD COLUMN IF NOT EXISTS patient_id VARCHAR(10) UNIQUE;
        
        UPDATE patients 
        SET patient_id = 'P' || LPAD(nextval('patient_id_seq')::TEXT, 6, '0')
        WHERE patient_id IS NULL;
      `);

      console.log('✅ Migration completed!');
    }

    client.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
