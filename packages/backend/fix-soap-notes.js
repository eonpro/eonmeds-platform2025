const { Pool } = require('pg');

// AWS RDS connection with correct password from Railway
const pool = new Pool({
  host: 'eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com',
  port: 5432,
  database: 'eonmeds',
  user: 'eonmeds_admin',
  password: '398Xakf$57',
  ssl: { rejectUnauthorized: false },
});

async function fixSoapNotesTable() {
  console.log('🔧 Fixing SOAP notes table in AWS RDS...\n');

  try {
    // Check current structure
    console.log('1. Checking current table structure...');
    const checkResult = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'soap_notes' AND column_name = 'patient_id'
    `);

    if (checkResult.rows.length > 0) {
      console.log('   Current patient_id column:', checkResult.rows[0]);
    } else {
      console.log('   ❌ soap_notes table or patient_id column not found!');
      return;
    }

    // Drop the existing constraint
    console.log('\n2. Dropping existing foreign key constraint...');
    await pool.query('ALTER TABLE soap_notes DROP CONSTRAINT IF EXISTS soap_notes_patient_id_fkey');
    console.log('   ✅ Constraint dropped');

    // Change column type
    console.log('\n3. Changing patient_id column type to VARCHAR(50)...');
    await pool.query(
      'ALTER TABLE soap_notes ALTER COLUMN patient_id TYPE VARCHAR(50) USING patient_id::VARCHAR(50)'
    );
    console.log('   ✅ Column type changed');

    // Add the constraint back
    console.log('\n4. Adding foreign key constraint back...');
    await pool.query(`
      ALTER TABLE soap_notes ADD CONSTRAINT soap_notes_patient_id_fkey 
      FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
    `);
    console.log('   ✅ Foreign key constraint added');

    // Verify the fix
    console.log('\n5. Verifying the fix...');
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'soap_notes' AND column_name = 'patient_id'
    `);

    console.log('\n✅ SOAP NOTES TABLE FIXED SUCCESSFULLY!');
    console.log('   New patient_id column:', result.rows[0]);
    console.log('\n🎉 Becca AI should now work properly!');
  } catch (error) {
    console.error('\n❌ Error fixing SOAP notes table:', error.message);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    if (error.hint) {
      console.error('   Hint:', error.hint);
    }
  } finally {
    await pool.end();
  }
}

// Run the fix
fixSoapNotesTable();
