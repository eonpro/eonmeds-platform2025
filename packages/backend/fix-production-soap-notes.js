const { Client } = require('pg');
require('dotenv').config();

async function fixProductionSOAPNotes() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('Connected to production database');
    
    // First, check current structure
    const checkResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'soap_notes' AND column_name = 'patient_id'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('Current patient_id type:', checkResult.rows[0].data_type);
      
      if (checkResult.rows[0].data_type === 'uuid') {
        console.log('Need to fix patient_id type from UUID to VARCHAR');
        
        // Drop and recreate the table with correct structure
        await client.query('BEGIN');
        
        try {
          // Drop the existing table
          await client.query('DROP TABLE IF EXISTS soap_notes CASCADE');
          console.log('Dropped existing soap_notes table');
          
          // Recreate with correct structure
          await client.query(`
            CREATE TABLE soap_notes (
              id SERIAL PRIMARY KEY,
              patient_id VARCHAR(50) NOT NULL,
              provider_id INTEGER,
              chief_complaint TEXT,
              subjective TEXT,
              objective TEXT,
              assessment TEXT,
              plan TEXT,
              follow_up TEXT,
              notes TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              created_by VARCHAR(255),
              status VARCHAR(50) DEFAULT 'draft',
              FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
            )
          `);
          console.log('Created new soap_notes table with VARCHAR patient_id');
          
          // Add indexes
          await client.query('CREATE INDEX idx_soap_notes_patient_id ON soap_notes(patient_id)');
          await client.query('CREATE INDEX idx_soap_notes_created_at ON soap_notes(created_at)');
          await client.query('CREATE INDEX idx_soap_notes_status ON soap_notes(status)');
          console.log('Added indexes');
          
          await client.query('COMMIT');
          console.log('✅ Successfully fixed soap_notes table structure');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      } else {
        console.log('✅ patient_id is already VARCHAR - no fix needed');
      }
    } else {
      console.log('⚠️  soap_notes table not found - creating it');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS soap_notes (
          id SERIAL PRIMARY KEY,
          patient_id VARCHAR(50) NOT NULL,
          provider_id INTEGER,
          chief_complaint TEXT,
          subjective TEXT,
          objective TEXT,
          assessment TEXT,
          plan TEXT,
          follow_up TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(255),
          status VARCHAR(50) DEFAULT 'draft',
          FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
        )
      `);
      
      // Add indexes
      await client.query('CREATE INDEX IF NOT EXISTS idx_soap_notes_patient_id ON soap_notes(patient_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_soap_notes_created_at ON soap_notes(created_at)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_soap_notes_status ON soap_notes(status)');
      
      console.log('✅ Created soap_notes table with correct structure');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  fixProductionSOAPNotes();
}

module.exports = { fixProductionSOAPNotes }; 