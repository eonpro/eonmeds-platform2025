const { Client } = require('pg');
require('dotenv').config();

async function verifySOAPFix() {
  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://eonmeds_admin:EON#2024secure!@eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com:5432/eonmeds',
  });

  try {
    await client.connect();
    console.log('Verifying SOAP notes fix...\n');

    // Check current table structure
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'soap_notes' AND column_name = 'patient_id'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('Current patient_id column:', columnCheck.rows[0]);
      console.log('Data type is:', columnCheck.rows[0].data_type);
    } else {
      console.log('SOAP notes table or patient_id column not found!');
    }

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'soap_notes'
      )
    `);
    console.log('\nSOAP notes table exists:', tableCheck.rows[0].exists);

    // Try a test query
    console.log('\nTesting query for patient P0257 (Evelyn):');
    try {
      const result = await client.query('SELECT COUNT(*) FROM soap_notes WHERE patient_id = $1', [
        'P0257',
      ]);
      console.log('Query successful! Count:', result.rows[0].count);
    } catch (err) {
      console.error('Query failed:', err.message);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

verifySOAPFix();
