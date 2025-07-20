const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addWebDirectHashtag() {
  try {
    console.log('🏷️  Adding #webdirect hashtag to HeyFlow patients...');
    
    // First, let's see how many patients we have from HeyFlow
    const countResult = await pool.query(`
      SELECT COUNT(*) as total 
      FROM patients 
      WHERE form_type IS NOT NULL
    `);
    
    console.log(`Found ${countResult.rows[0].total} patients from HeyFlow forms`);
    
    // Update patients to add #webdirect hashtag if they don't have it
    const updateResult = await pool.query(`
      UPDATE patients 
      SET membership_hashtags = 
        CASE 
          WHEN membership_hashtags IS NULL THEN ARRAY['#webdirect']
          WHEN '#webdirect' = ANY(membership_hashtags) THEN membership_hashtags
          ELSE array_append(membership_hashtags, '#webdirect')
        END,
        updated_at = NOW()
      WHERE form_type IS NOT NULL 
        AND (membership_hashtags IS NULL OR NOT '#webdirect' = ANY(membership_hashtags))
      RETURNING patient_id, first_name, last_name, email, membership_hashtags
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} patients with #webdirect hashtag`);
    
    if (updateResult.rowCount > 0) {
      console.log('\nUpdated patients:');
      updateResult.rows.forEach(patient => {
        console.log(`- ${patient.patient_id}: ${patient.first_name} ${patient.last_name} (${patient.email})`);
        console.log(`  Hashtags: ${patient.membership_hashtags.join(', ')}`);
      });
    }
    
    // Show sample of patients with hashtags
    const sampleResult = await pool.query(`
      SELECT patient_id, first_name, last_name, membership_hashtags
      FROM patients
      WHERE membership_hashtags IS NOT NULL AND array_length(membership_hashtags, 1) > 0
      LIMIT 5
    `);
    
    console.log('\n📋 Sample patients with hashtags:');
    sampleResult.rows.forEach(patient => {
      console.log(`${patient.patient_id}: ${patient.first_name} ${patient.last_name}`);
      console.log(`  Hashtags: ${patient.membership_hashtags.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding hashtags:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
addWebDirectHashtag(); 