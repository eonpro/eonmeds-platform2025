const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function createBeccaTables() {
  const client = await pool.connect();

  try {
    console.log('Creating BECCA AI tables...');

    // Check if soap_notes table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'soap_notes'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ soap_notes table already exists');
    } else {
      console.log('Creating soap_notes table...');

      // Create SOAP Notes table
      await client.query(`
        CREATE TABLE IF NOT EXISTS soap_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
          
          -- Content
          content TEXT NOT NULL,
          original_content TEXT,
          
          -- Status tracking
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          
          -- Metadata
          created_by VARCHAR(255) NOT NULL DEFAULT 'BECCA AI',
          approved_by UUID REFERENCES users(id),
          approved_by_name VARCHAR(255),
          approved_by_credentials VARCHAR(255),
          
          -- Timestamps
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          approved_at TIMESTAMP,
          
          -- Version control
          version INTEGER DEFAULT 1,
          edit_history JSONB DEFAULT '[]',
          
          -- AI metadata
          ai_model VARCHAR(50) DEFAULT 'gpt-4',
          ai_response_time_ms INTEGER,
          prompt_tokens INTEGER,
          completion_tokens INTEGER,
          total_tokens INTEGER,
          
          -- Constraint
          CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
        )
      `);

      // Create indexes
      await client.query(
        'CREATE INDEX IF NOT EXISTS idx_soap_notes_patient_id ON soap_notes(patient_id)'
      );
      await client.query('CREATE INDEX IF NOT EXISTS idx_soap_notes_status ON soap_notes(status)');
      await client.query(
        'CREATE INDEX IF NOT EXISTS idx_soap_notes_created_at ON soap_notes(created_at)'
      );

      console.log('✅ soap_notes table created successfully');
    }

    // Create or update the trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Create trigger
    await client.query(`
      DROP TRIGGER IF EXISTS update_soap_notes_updated_at ON soap_notes
    `);

    await client.query(`
      CREATE TRIGGER update_soap_notes_updated_at 
      BEFORE UPDATE ON soap_notes 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column()
    `);

    console.log('✅ BECCA AI tables setup complete!');
  } catch (error) {
    console.error('Error creating BECCA tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
createBeccaTables().catch(console.error);
