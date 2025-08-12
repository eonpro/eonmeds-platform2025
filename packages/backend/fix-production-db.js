const { Pool } = require('pg');
require('dotenv').config();

// Create pool with production settings
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false, // Your RDS has SSL disabled
});

async function fixProductionDatabase() {
  const client = await pool.connect();

  try {
    console.log('🔧 Starting production database fix...\n');

    // 1. Check if patient_id column exists
    const columnCheck = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_name = 'patients' 
      AND column_name = 'patient_id'
    `);

    if (columnCheck.rows[0].count === '0') {
      console.log('⚠️  patient_id column missing - adding it now...');

      // Create sequence
      await client.query('CREATE SEQUENCE IF NOT EXISTS patient_id_seq START 7000');

      // Add column
      await client.query('ALTER TABLE patients ADD COLUMN patient_id VARCHAR(10) UNIQUE');

      // Update existing patients
      await client.query(`
        UPDATE patients 
        SET patient_id = 'P' || LPAD(nextval('patient_id_seq')::TEXT, 6, '0')
        WHERE patient_id IS NULL
      `);

      console.log('✅ patient_id column added successfully\n');
    } else {
      console.log('✅ patient_id column already exists\n');
    }

    // 2. Count existing patients
    const countResult = await client.query('SELECT COUNT(*) as count FROM patients');
    console.log(`📊 Current patient count: ${countResult.rows[0].count}\n`);

    // 3. Create a test patient to verify everything works
    console.log('Creating test patient...');

    const testPatient = await client.query(`
      INSERT INTO patients (
        patient_id,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        gender,
        form_type,
        form_version,
        submitted_at,
        status,
        consent_treatment,
        consent_telehealth,
        consent_date,
        created_at,
        updated_at
      ) VALUES (
        'P' || LPAD(nextval('patient_id_seq')::TEXT, 6, '0'),
        'Test',
        'Patient',
        'test.patient' || floor(random() * 10000) || '@eonmeds.com',
        '813-555-0001',
        '1990-01-01',
        'female',
        'manual_test',
        '1.0',
        NOW(),
        'qualified',
        true,
        true,
        NOW(),
        NOW(),
        NOW()
      ) RETURNING id, patient_id, email
    `);

    console.log('✅ Test patient created:', testPatient.rows[0]);

    // 4. Test the query that the frontend uses
    console.log('\n🔍 Testing patient list query...');
    const listResult = await client.query(`
      SELECT 
        id,
        patient_id,
        first_name || ' ' || last_name as name,
        email,
        phone,
        date_of_birth,
        created_at,
        updated_at as last_activity,
        status
      FROM patients
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`Found ${listResult.rows.length} patients:`);
    listResult.rows.forEach((p) => {
      console.log(` - ${p.patient_id}: ${p.name} (${p.email})`);
    });

    console.log('\n✅ Database fix completed successfully!');
    console.log('Your dashboard should now show patients.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixProductionDatabase();
