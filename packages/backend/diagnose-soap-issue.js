const { Client } = require('pg');
require('dotenv').config();

async function diagnoseSOAPIssue() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://eonmeds_admin:EON#2024secure!@eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com:5432/eonmeds'
  });

  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // 1. Check patient ID format
    console.log('1. Checking patient ID formats:');
    const patientSample = await client.query(`
      SELECT patient_id, first_name, last_name 
      FROM patients 
      WHERE first_name IN ('Glenda', 'Virginia', 'Evelyn')
      ORDER BY first_name
    `);
    
    console.log('Sample patients:');
    patientSample.rows.forEach(p => {
      console.log(`- ${p.first_name} ${p.last_name}: ${p.patient_id} (type: ${typeof p.patient_id})`);
    });
    
    // 2. Check SOAP notes patient_id column type
    console.log('\n2. SOAP notes table patient_id column:');
    const columnInfo = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'soap_notes' AND column_name = 'patient_id'
    `);
    console.log(columnInfo.rows[0]);
    
    // 3. Try to fetch SOAP notes for a specific patient
    if (patientSample.rows.length > 0) {
      const testPatientId = patientSample.rows[0].patient_id;
      console.log(`\n3. Testing SOAP notes fetch for patient: ${testPatientId}`);
      
      try {
        const soapResult = await client.query(
          'SELECT * FROM soap_notes WHERE patient_id = $1',
          [testPatientId]
        );
        console.log(`Found ${soapResult.rows.length} SOAP notes`);
      } catch (err) {
        console.error('Error fetching SOAP notes:', err.message);
      }
    }
    
    // 4. Check if we need to update the column type
    console.log('\n4. Checking if we need to fix the patient_id column type...');
    const needsFix = columnInfo.rows[0].data_type === 'uuid';
    
    if (needsFix) {
      console.log('SOAP notes table uses UUID for patient_id, but patients table uses VARCHAR.');
      console.log('This mismatch is causing the issue. We need to fix this.');
      
      // Show a sample fix
      console.log('\nTo fix this, we need to:');
      console.log('1. Drop the foreign key constraint');
      console.log('2. Change the column type to VARCHAR(50)');
      console.log('3. Re-add the foreign key constraint');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

diagnoseSOAPIssue(); 