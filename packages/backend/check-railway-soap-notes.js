const { Client } = require('pg');

// Railway database URL - this should match what's in Railway
const RAILWAY_DATABASE_URL = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

async function checkRailwaySOAPNotes() {
  if (!RAILWAY_DATABASE_URL) {
    console.error('❌ No Railway database URL found. Please set RAILWAY_DATABASE_URL environment variable.');
    console.log('You can find this in Railway dashboard > Your backend service > Variables > DATABASE_URL');
    return;
  }

  const client = new Client({
    connectionString: RAILWAY_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Railway database');
    
    // Check if soap_notes table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'soap_notes'
      )
    `);
    
    console.log('SOAP notes table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Check column structure
      const columnCheck = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'soap_notes'
        ORDER BY ordinal_position
      `);
      
      console.log('\nSOAP notes table columns:');
      columnCheck.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });
      
      // Check specifically for patient_id
      const patientIdCol = columnCheck.rows.find(col => col.column_name === 'patient_id');
      if (patientIdCol) {
        console.log(`\n✅ patient_id column type: ${patientIdCol.data_type}`);
        if (patientIdCol.data_type === 'uuid') {
          console.log('⚠️  WARNING: patient_id is UUID type, needs to be VARCHAR(50)');
        }
      }
      
      // Check foreign key constraint
      const fkCheck = await client.query(`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'soap_notes'
          AND kcu.column_name = 'patient_id'
      `);
      
      if (fkCheck.rows.length > 0) {
        console.log('\nForeign key constraint found:');
        console.log(`- ${fkCheck.rows[0].constraint_name}: ${fkCheck.rows[0].column_name} -> ${fkCheck.rows[0].foreign_table_name}(${fkCheck.rows[0].foreign_column_name})`);
      }
      
      // Count existing records
      const countResult = await client.query('SELECT COUNT(*) FROM soap_notes');
      console.log(`\nTotal SOAP notes in database: ${countResult.rows[0].count}`);
      
    } else {
      console.log('\n❌ SOAP notes table does not exist in Railway database!');
      console.log('The table needs to be created. Run the migration script.');
    }
    
    // Also check patients table for comparison
    const patientCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'patients' AND column_name = 'patient_id'
    `);
    
    if (patientCheck.rows.length > 0) {
      console.log(`\n📋 For reference, patients.patient_id type: ${patientCheck.rows[0].data_type}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('password authentication failed')) {
      console.log('\n❌ Database authentication failed. Check your Railway database credentials.');
    } else if (error.message.includes('could not translate host name')) {
      console.log('\n❌ Could not connect to Railway database. Check your DATABASE_URL.');
    }
  } finally {
    await client.end();
  }
}

// Instructions for use
console.log('=== Railway SOAP Notes Table Check ===\n');
console.log('This script checks the soap_notes table in your Railway database.\n');
console.log('To use this script:');
console.log('1. Get your Railway DATABASE_URL from the Railway dashboard');
console.log('2. Run: RAILWAY_DATABASE_URL="your-railway-database-url" node check-railway-soap-notes.js\n');

// Run if environment variable is set
if (RAILWAY_DATABASE_URL) {
  checkRailwaySOAPNotes();
} else {
  console.log('❌ RAILWAY_DATABASE_URL not set. Please provide it to continue.');
} 