require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addAdditionalInfoColumn() {
  try {
    console.log('Adding additional_info column...');
    
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'patients' 
          AND column_name = 'additional_info') THEN
          ALTER TABLE patients ADD COLUMN additional_info TEXT;
        END IF;
      END $$;
    `);
    
    console.log('✅ Additional_info column added successfully!');
    
    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'patients' 
      AND column_name IN ('membership_hashtags', 'additional_info')
      ORDER BY column_name;
    `);
    
    console.log('\n📋 Patient columns:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    console.error('Error adding column:', error);
  } finally {
    await pool.end();
  }
}

addAdditionalInfoColumn(); 