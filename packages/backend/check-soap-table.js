const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://eonmeds_admin:398Xakf$57@eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com:5432/eonmeds',
  ssl: { rejectUnauthorized: false }
});

async function checkTable() {
  try {
    console.log('Checking soap_notes table structure...\n');
    
    // Check column type
    const result = await pool.query(`
      SELECT 
        c.column_name, 
        c.data_type, 
        c.character_maximum_length,
        tc.constraint_name,
        tc.constraint_type
      FROM information_schema.columns c
      LEFT JOIN information_schema.key_column_usage kcu 
        ON c.table_name = kcu.table_name 
        AND c.column_name = kcu.column_name
      LEFT JOIN information_schema.table_constraints tc 
        ON kcu.constraint_name = tc.constraint_name
      WHERE c.table_name = 'soap_notes' 
        AND c.column_name = 'patient_id'
    `);
    
    console.log('Column info:', result.rows);
    
    // Check what type patients.patient_id is
    const patientResult = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'patients' AND column_name = 'patient_id'
    `);
    
    console.log('\nPatients table patient_id:', patientResult.rows[0]);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTable();
