const { Pool } = require('pg');

const pool = new Pool({
  host: 'eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com',
  port: 5432,
  database: 'eonmeds',
  user: 'eonmeds_admin',
  password: '398Xakf$57',
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  try {
    console.log('Fixing SOAP notes table...');
    
    // Drop constraint
    await pool.query('ALTER TABLE soap_notes DROP CONSTRAINT IF EXISTS soap_notes_patient_id_fkey');
    console.log('1. Dropped constraint');
    
    // Change column type
    await pool.query('ALTER TABLE soap_notes ALTER COLUMN patient_id TYPE VARCHAR(50) USING patient_id::VARCHAR(50)');
    console.log('2. Changed column type');
    
    // Add constraint back
    await pool.query('ALTER TABLE soap_notes ADD CONSTRAINT soap_notes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE');
    console.log('3. Added constraint back');
    
    console.log('✅ SOAP notes table fixed! Becca AI should work now.');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fix();
