const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Map of allowed reps
const ALLOWED_REPS = [
  'Laura Zevallos',
  'Ana Saavedra',
  'Yasmin Saavedra',
  'Rebecca Raines',
  'Maurizio Llanos',
  'Max Putrello',
  'Melissa Manley',
  'Chris Lenaham'
];

async function processInternalForms() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Processing Internal Espanol 2025 forms from last 3 days...\n');
    
    // First, let's check for the new flowID
    const internalFormFlowID = 'Gb2YDWzoMnCcOAH17EYF'; // The new flowID we found
    
    // Get all webhooks from Internal Espanol form
    const webhookResult = await client.query(`
      SELECT 
        id,
        payload,
        created_at,
        processed
      FROM webhook_events 
      WHERE created_at >= NOW() - INTERVAL '3 days'
        AND (
          payload->>'flowID' = $1
          OR payload->>'formName' LIKE '%Internal Espanol%'
          OR payload::text LIKE '%Internal Espanol%'
        )
      ORDER BY created_at DESC
    `, [internalFormFlowID]);
    
    console.log(`Found ${webhookResult.rowCount} Internal Espanol forms\n`);
    
    if (webhookResult.rowCount === 0) {
      console.log('ℹ️  No Internal Espanol forms found in the last 3 days');
      console.log('\n📝 Note: Make sure your HeyFlow form is configured with:');
      console.log('   - Webhook URL: https://eonmeds-platform2025-production.up.railway.app/api/v1/webhooks/heyflow');
      console.log('   - Form should include a "repname" field with dropdown of rep names');
      console.log('   - Form ID appears to be: Gb2YDWzoMnCcOAH17EYF');
      return;
    }
    
    // Process each webhook
    for (const webhook of webhookResult.rows) {
      console.log(`\n--- Processing Webhook ${webhook.id} ---`);
      console.log(`Created: ${webhook.created_at}`);
      
      const payload = webhook.payload;
      const fields = payload.fields || payload.data || payload;
      
      // Extract patient data
      const patientData = {
        first_name: fields.firstname || fields.first_name || fields.firstName || null,
        last_name: fields.lastname || fields.last_name || fields.lastName || null,
        email: fields.email || fields.Email || null,
        phone: fields['Phone Number'] || fields.phone || null,
        date_of_birth: fields.dob || fields.date_of_birth || null,
        gender: fields.gender || fields.Gender || null,
        rep_name: fields.repname || fields.rep_name || fields.representative || null,
        form_type: payload.flowID || 'internal_espanol_2025'
      };
      
      console.log(`Patient: ${patientData.first_name} ${patientData.last_name} (${patientData.email})`);
      console.log(`Rep: ${patientData.rep_name || 'NO REP SPECIFIED'}`);
      
      // Skip if no email
      if (!patientData.email) {
        console.log('⚠️  Skipping - no email found');
        continue;
      }
      
      // Build hashtags
      let hashtags = ['weightloss']; // Base tag
      
      if (patientData.rep_name) {
        // Validate rep name
        if (!ALLOWED_REPS.includes(patientData.rep_name)) {
          console.log(`⚠️  Warning: Invalid rep name "${patientData.rep_name}"`);
          console.log('   Allowed reps:', ALLOWED_REPS.join(', '));
        }
        
        // Format rep name for hashtag (remove spaces)
        const repHashtag = patientData.rep_name.replace(/\s+/g, '');
        hashtags.push(repHashtag, 'internalrep');
      } else {
        // No rep specified - add webdirect
        hashtags.push('webdirect');
      }
      
      console.log(`Hashtags: ${hashtags.map(t => '#' + t).join(' ')}`);
      
      // Begin transaction
      await client.query('BEGIN');
      
      try {
        // Generate patient ID
        const patientIdResult = await client.query(
          "SELECT 'P' || LPAD((COALESCE(MAX(SUBSTRING(patient_id FROM 2)::INTEGER), 0) + 1)::TEXT, 4, '0') as patient_id FROM patients WHERE patient_id ~ '^P[0-9]+$'"
        );
        const patientId = patientIdResult.rows[0]?.patient_id || 'P0001';
        
        // Insert or update patient
        const upsertResult = await client.query(`
          INSERT INTO patients (
            patient_id,
            first_name,
            last_name,
            email,
            phone,
            date_of_birth,
            gender,
            form_type,
            assigned_rep,
            rep_form_submission,
            membership_hashtags,
            status,
            created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
          )
          ON CONFLICT (email) DO UPDATE SET
            updated_at = NOW(),
            phone = EXCLUDED.phone,
            assigned_rep = EXCLUDED.assigned_rep,
            rep_form_submission = EXCLUDED.rep_form_submission,
            membership_hashtags = 
              CASE 
                WHEN patients.membership_hashtags IS NULL THEN EXCLUDED.membership_hashtags
                ELSE (
                  SELECT array_agg(DISTINCT tag)
                  FROM (
                    SELECT unnest(patients.membership_hashtags) AS tag
                    UNION
                    SELECT unnest(EXCLUDED.membership_hashtags) AS tag
                  ) AS all_tags
                )
              END
          RETURNING id, patient_id, email
        `, [
          patientId,
          patientData.first_name,
          patientData.last_name,
          patientData.email,
          patientData.phone,
          patientData.date_of_birth,
          patientData.gender,
          patientData.form_type,
          patientData.rep_name,
          !!patientData.rep_name, // rep_form_submission
          hashtags,
          'pending'
        ]);
        
        // Mark webhook as processed
        await client.query(
          'UPDATE webhook_events SET processed = true WHERE id = $1',
          [webhook.id]
        );
        
        await client.query('COMMIT');
        
        console.log(`✅ Successfully processed patient ${upsertResult.rows[0].patient_id}`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error processing patient: ${error.message}`);
      }
    }
    
    // Summary
    console.log('\n📊 Processing Summary:');
    
    // Count patients by rep
    const repSummary = await client.query(`
      SELECT 
        assigned_rep,
        COUNT(*) as count
      FROM patients
      WHERE form_type IN ('internal_espanol_2025', $1)
        AND created_at >= NOW() - INTERVAL '3 days'
      GROUP BY assigned_rep
      ORDER BY count DESC
    `, [internalFormFlowID]);
    
    console.log('\nPatients by Rep (last 3 days):');
    if (repSummary.rowCount > 0) {
      repSummary.rows.forEach(row => {
        console.log(`  ${row.assigned_rep || 'Direct (No Rep)'}: ${row.count}`);
      });
    } else {
      console.log('  No rep-assigned patients found');
    }
    
    // Count by hashtags
    const hashtagSummary = await client.query(`
      SELECT 
        unnest(membership_hashtags) as hashtag,
        COUNT(*) as count
      FROM patients
      WHERE created_at >= NOW() - INTERVAL '3 days'
      GROUP BY hashtag
      ORDER BY count DESC
    `);
    
    console.log('\nMost Common Hashtags (last 3 days):');
    hashtagSummary.rows.slice(0, 10).forEach(row => {
      console.log(`  #${row.hashtag}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the processor
processInternalForms(); 