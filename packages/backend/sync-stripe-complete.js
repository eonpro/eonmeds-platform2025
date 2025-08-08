#!/usr/bin/env node

/**
 * Complete Stripe Sync Tool
 * 
 * This script will:
 * 1. Fetch all Stripe customers and their payment history
 * 2. Match them to existing patients by email or phone
 * 3. Create new patients if no match found
 * 4. Update patient status to 'client' if they have successful payments
 * 5. Add appropriate hashtags based on subscription status
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

// Helper function to generate patient ID
function generatePatientId() {
  const prefix = 'P';
  const timestamp = Date.now().toString().slice(-5);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
}

// Helper function to format phone for comparison
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return digits;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1);
  }
  return digits;
}

// Extract name from Stripe customer
function extractName(customer) {
  if (customer.name) {
    const parts = customer.name.trim().split(' ');
    if (parts.length >= 2) {
      const lastName = parts.pop();
      const firstName = parts.join(' ');
      return { firstName, lastName };
    }
    return { firstName: customer.name, lastName: '' };
  }
  
  // Try to extract from email
  if (customer.email) {
    const localPart = customer.email.split('@')[0];
    const nameParts = localPart.split(/[._-]/);
    if (nameParts.length >= 2) {
      return {
        firstName: nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1),
        lastName: nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1)
      };
    }
    return { firstName: localPart, lastName: '' };
  }
  
  return { firstName: 'Stripe', lastName: 'Customer' };
}

async function findOrCreatePatient(customer) {
  try {
    // First try to find existing patient by email
    if (customer.email) {
      const emailResult = await pool.query(
        'SELECT * FROM patients WHERE LOWER(email) = LOWER($1)',
        [customer.email]
      );
      if (emailResult.rows.length > 0) {
        return { patient: emailResult.rows[0], isNew: false };
      }
    }

    // Then try phone
    if (customer.phone) {
      const normalizedPhone = normalizePhone(customer.phone);
      if (normalizedPhone) {
        const phoneResult = await pool.query(`
          SELECT * FROM patients 
          WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, '-', ''), '(', ''), ')', ''), ' ', '') = $1
        `, [normalizedPhone]);
        
        if (phoneResult.rows.length > 0) {
          return { patient: phoneResult.rows[0], isNew: false };
        }
      }
    }

    // Create new patient
    const { firstName, lastName } = extractName(customer);
    const patientId = generatePatientId();
    
    const insertResult = await pool.query(`
      INSERT INTO patients (
        patient_id, first_name, last_name, email, phone,
        status, membership_hashtags, stripe_customer_id,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [
      patientId,
      firstName,
      lastName,
      customer.email || null,
      customer.phone || null,
      'client', // Since they're in Stripe, they're a client
      ['#fromstripe'], // Tag to identify Stripe-imported patients
      customer.id
    ]);

    console.log(`   🆕 Created new patient: ${firstName} ${lastName} (${patientId})`);
    return { patient: insertResult.rows[0], isNew: true };

  } catch (error) {
    console.error('Error finding/creating patient:', error);
    return { patient: null, isNew: false };
  }
}

async function updatePatientStripeInfo(patientId, stripeCustomerId) {
  try {
    await pool.query(`
      UPDATE patients 
      SET stripe_customer_id = $2,
          updated_at = NOW()
      WHERE patient_id = $1 AND stripe_customer_id IS NULL
    `, [patientId, stripeCustomerId]);
  } catch (error) {
    console.error(`Error updating Stripe info for patient ${patientId}:`, error);
  }
}

async function updatePatientSubscriptionStatus(patientId, hasActiveSubscription, subscriptionDetails = null) {
  try {
    if (hasActiveSubscription) {
      // Add #activemember hashtag
      await pool.query(`
        UPDATE patients 
        SET membership_hashtags = 
          CASE 
            WHEN membership_hashtags IS NULL THEN ARRAY['#activemember']
            WHEN NOT '#activemember' = ANY(membership_hashtags) THEN array_append(membership_hashtags, '#activemember')
            ELSE membership_hashtags
          END,
          status = 'client',
          updated_at = NOW()
        WHERE patient_id = $1
      `, [patientId]);
      
      console.log(`   ✅ Added #activemember hashtag`);
    } else {
      // Remove #activemember if no active subscription
      await pool.query(`
        UPDATE patients 
        SET membership_hashtags = array_remove(membership_hashtags, '#activemember'),
            updated_at = NOW()
        WHERE patient_id = $1 AND '#activemember' = ANY(membership_hashtags)
      `, [patientId]);
    }
  } catch (error) {
    console.error(`Error updating subscription status for patient ${patientId}:`, error);
  }
}

async function syncStripeData() {
  console.log('🔄 Starting complete Stripe sync...\n');

  try {
    // Get all Stripe customers
    console.log('📥 Fetching all Stripe customers...');
    const customers = [];
    let hasMore = true;
    let startingAfter = null;

    while (hasMore) {
      const params = {
        limit: 100
      };
      
      if (startingAfter) {
        params.starting_after = startingAfter;
      }
      
      const batch = await stripe.customers.list(params);

      customers.push(...batch.data);
      hasMore = batch.has_more;
      if (hasMore && batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id;
      }
    }

    console.log(`Found ${customers.length} Stripe customers\n`);

    let stats = {
      totalCustomers: customers.length,
      matchedExisting: 0,
      createdNew: 0,
      withPayments: 0,
      withActiveSubscriptions: 0,
      errors: 0
    };

    // Process each customer
    for (const customer of customers) {
      try {
        console.log(`\n🔍 Processing: ${customer.email || customer.phone || customer.id}`);

        // Find or create patient
        const { patient, isNew } = await findOrCreatePatient(customer);
        
        if (!patient) {
          console.log('   ❌ Error processing customer');
          stats.errors++;
          continue;
        }

        if (isNew) {
          stats.createdNew++;
        } else {
          stats.matchedExisting++;
          console.log(`   ✅ Matched existing patient: ${patient.first_name} ${patient.last_name} (${patient.patient_id})`);
          
          // Update Stripe customer ID if missing
          if (!patient.stripe_customer_id) {
            await updatePatientStripeInfo(patient.patient_id, customer.id);
          }
        }

        // Check payment history
        const charges = await stripe.charges.list({
          customer: customer.id,
          limit: 100
        });

        const successfulCharges = charges.data.filter(charge => 
          charge.status === 'succeeded' && charge.paid
        );

        if (successfulCharges.length > 0) {
          stats.withPayments++;
          console.log(`   💳 Has ${successfulCharges.length} successful payment(s)`);
          
          // Calculate total paid
          const totalPaid = successfulCharges.reduce((sum, charge) => sum + charge.amount, 0) / 100;
          console.log(`   💰 Total paid: $${totalPaid.toFixed(2)}`);
        }

        // Check subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 10
        });

        const activeSubscriptions = subscriptions.data.filter(sub => 
          sub.status === 'active' || sub.status === 'trialing'
        );

        if (activeSubscriptions.length > 0) {
          stats.withActiveSubscriptions++;
          console.log(`   📅 Has ${activeSubscriptions.length} active subscription(s)`);
          
          // Show subscription details
          activeSubscriptions.forEach(sub => {
            const amount = sub.items.data.reduce((sum, item) => 
              sum + (item.price.unit_amount * item.quantity), 0
            ) / 100;
            console.log(`      - ${sub.items.data[0].price.product}: $${amount}/${sub.items.data[0].price.recurring.interval}`);
          });
        }

        // Update subscription status
        await updatePatientSubscriptionStatus(
          patient.patient_id, 
          activeSubscriptions.length > 0,
          activeSubscriptions[0] || null
        );

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        console.error(`   ❌ Error processing customer ${customer.id}:`, error.message);
        stats.errors++;
      }
    }

    // Final summary
    console.log('\n\n📊 SYNC SUMMARY');
    console.log('=====================================');
    console.log(`Total Stripe customers:     ${stats.totalCustomers}`);
    console.log(`Matched existing patients:  ${stats.matchedExisting}`);
    console.log(`Created new patients:       ${stats.createdNew}`);
    console.log(`Customers with payments:    ${stats.withPayments}`);
    console.log(`Active subscriptions:       ${stats.withActiveSubscriptions}`);
    console.log(`Errors:                     ${stats.errors}`);
    console.log('=====================================\n');

  } catch (error) {
    console.error('❌ Fatal error during sync:', error);
  } finally {
    await pool.end();
  }
}

// Run the sync
console.log('🚀 Complete Stripe Sync Tool');
console.log('============================\n');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Error: STRIPE_SECRET_KEY not found in environment variables');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not found in environment variables');
  process.exit(1);
}

syncStripeData()
  .then(() => {
    console.log('✅ Sync completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }); 