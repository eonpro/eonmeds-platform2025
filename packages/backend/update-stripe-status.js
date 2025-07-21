#!/usr/bin/env node

/**
 * Update Existing Patients Based on Stripe Data
 * 
 * This script will:
 * 1. Check all existing patients who have an email
 * 2. Look them up in Stripe
 * 3. Update their status to 'client' if they have payments
 * 4. Add #activemember hashtag if they have active subscriptions
 */

require('dotenv').config();
const { Pool } = require('pg');
const Stripe = require('stripe');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updatePatientFromStripe(patient) {
  try {
    // Search for customer in Stripe by email
    const customers = await stripe.customers.list({
      email: patient.email,
      limit: 1
    });

    if (customers.data.length === 0) {
      return { updated: false, reason: 'No Stripe customer found' };
    }

    const customer = customers.data[0];
    let updates = [];
    
    // Check for successful payments
    const charges = await stripe.charges.list({
      customer: customer.id,
      limit: 10
    });

    const hasSuccessfulPayment = charges.data.some(charge => 
      charge.status === 'succeeded' && charge.paid
    );

    // Update status to client if they have payments and aren't already
    if (hasSuccessfulPayment && patient.status !== 'client') {
      await pool.query(
        'UPDATE patients SET status = $1, stripe_customer_id = $2, updated_at = NOW() WHERE patient_id = $3',
        ['client', customer.id, patient.patient_id]
      );
      updates.push('status → client');
    }

    // Update Stripe customer ID if missing
    if (!patient.stripe_customer_id && customer.id) {
      await pool.query(
        'UPDATE patients SET stripe_customer_id = $1, updated_at = NOW() WHERE patient_id = $2',
        [customer.id, patient.patient_id]
      );
      updates.push('added Stripe ID');
    }

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10
    });

    if (subscriptions.data.length > 0) {
      // Add #activemember hashtag if not present
      const hasActiveTag = patient.membership_hashtags && 
                          patient.membership_hashtags.includes('#activemember');
      
      if (!hasActiveTag) {
        await pool.query(`
          UPDATE patients 
          SET membership_hashtags = 
            CASE 
              WHEN membership_hashtags IS NULL THEN ARRAY['#activemember']
              ELSE array_append(membership_hashtags, '#activemember')
            END,
            updated_at = NOW()
          WHERE patient_id = $1
        `, [patient.patient_id]);
        updates.push('added #activemember');
      }
    }

    return { 
      updated: updates.length > 0, 
      updates: updates,
      hasPayments: hasSuccessfulPayment,
      hasSubscription: subscriptions.data.length > 0
    };

  } catch (error) {
    console.error(`Error processing patient ${patient.patient_id}:`, error.message);
    return { updated: false, error: error.message };
  }
}

async function syncExistingPatients() {
  console.log('🔄 Updating existing patients from Stripe data...\n');

  try {
    // Get all patients with emails
    const patientsResult = await pool.query(`
      SELECT patient_id, first_name, last_name, email, status, stripe_customer_id, membership_hashtags
      FROM patients 
      WHERE email IS NOT NULL AND email != ''
      ORDER BY created_at DESC
    `);

    const patients = patientsResult.rows;
    console.log(`Found ${patients.length} patients with emails\n`);

    let stats = {
      total: patients.length,
      checked: 0,
      updated: 0,
      withPayments: 0,
      withSubscriptions: 0,
      errors: 0
    };

    // Process each patient
    for (const patient of patients) {
      process.stdout.write(`\r⏳ Processing: ${stats.checked + 1}/${stats.total} - ${patient.email}...                    `);
      
      const result = await updatePatientFromStripe(patient);
      stats.checked++;
      
      if (result.updated) {
        stats.updated++;
        console.log(`\n✅ Updated ${patient.first_name} ${patient.last_name} (${patient.patient_id}): ${result.updates.join(', ')}`);
      }
      
      if (result.hasPayments) stats.withPayments++;
      if (result.hasSubscription) stats.withSubscriptions++;
      if (result.error) stats.errors++;
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Clear the progress line
    console.log('\r                                                                          ');
    
    // Final summary
    console.log('\n📊 UPDATE SUMMARY');
    console.log('=====================================');
    console.log(`Total patients checked:     ${stats.checked}`);
    console.log(`Patients updated:           ${stats.updated}`);
    console.log(`Patients with payments:     ${stats.withPayments}`);
    console.log(`Active subscriptions:       ${stats.withSubscriptions}`);
    console.log(`Errors:                     ${stats.errors}`);
    console.log('=====================================\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await pool.end();
  }
}

// Run the sync
console.log('🚀 Stripe Status Update Tool');
console.log('============================\n');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Error: STRIPE_SECRET_KEY not found in environment variables');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not found in environment variables');
  process.exit(1);
}

syncExistingPatients()
  .then(() => {
    console.log('✅ Update completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }); 