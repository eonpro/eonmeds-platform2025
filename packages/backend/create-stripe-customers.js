#!/usr/bin/env node

// Simple script to create Stripe customers for existing patients
// Run with: node create-stripe-customers.js

require('dotenv').config();
const { Pool } = require('pg');
const Stripe = require('stripe');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createStripeCustomersForPatients() {
  console.log('🚀 Starting Stripe customer creation for existing patients...');
  console.log(`Using Stripe key: ${process.env.STRIPE_SECRET_KEY?.substring(0, 10)}...`);
  
  try {
    // Get all patients without a Stripe customer ID
    const result = await pool.query(`
      SELECT 
        p.patient_id,
        p.first_name,
        p.last_name,
        p.email,
        p.phone,
        p.stripe_customer_id,
        u.email as user_email
      FROM patients p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.stripe_customer_id IS NULL OR p.stripe_customer_id = ''
    `);

    const patients = result.rows;
    console.log(`\nFound ${patients.length} patients without Stripe customer IDs`);

    if (patients.length === 0) {
      console.log('✅ All patients already have Stripe customer IDs!');
      return;
    }

    // Ask for confirmation
    console.log('\nThis will create Stripe customers for all patients without one.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const patient of patients) {
      try {
        // Prepare customer data
        const email = patient.email || patient.user_email;
        const name = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown Patient';

        // Skip if no email available
        if (!email) {
          console.warn(`⚠️  Skipping patient ${patient.patient_id} - no email address`);
          errorCount++;
          errors.push({ patient_id: patient.patient_id, error: 'No email address' });
          continue;
        }

        process.stdout.write(`Creating customer for ${name} (${email})... `);
        
        // Create Stripe customer
        const stripeCustomer = await stripe.customers.create({
          email: email,
          name: name,
          phone: patient.phone || undefined,
          metadata: {
            patient_id: patient.patient_id,
            source: 'bulk_migration',
            created_at: new Date().toISOString()
          }
        });

        // Update patient record with Stripe customer ID
        await pool.query(
          'UPDATE patients SET stripe_customer_id = $1, updated_at = CURRENT_TIMESTAMP WHERE patient_id = $2',
          [stripeCustomer.id, patient.patient_id]
        );

        console.log(`✅ ${stripeCustomer.id}`);
        successCount++;

      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        errorCount++;
        errors.push({ patient_id: patient.patient_id, error: error.message });
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successfully created: ${successCount} Stripe customers`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📝 Total processed: ${patients.length}`);

    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach(e => {
        console.log(`  - Patient ${e.patient_id}: ${e.error}`);
      });
    }

  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Check if Stripe key is configured
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Error: STRIPE_SECRET_KEY not found in environment variables');
  console.error('Please set it in your .env file or as an environment variable');
  process.exit(1);
}

// Check if database URL is configured
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not found in environment variables');
  console.error('Please set it in your .env file or as an environment variable');
  process.exit(1);
}

// Run the script
createStripeCustomersForPatients()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    console.log('Patients can now add payment methods and make payments.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
