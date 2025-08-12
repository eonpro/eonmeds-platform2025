#!/usr/bin/env node

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function findByPayment() {
  try {
    console.log('🔍 Looking up payment intent from screenshot...\n');

    // From the screenshot: pi_3RnRjJGzKhM7cZeG0hnErd7C
    const paymentIntentId = 'pi_3RnRjJGzKhM7cZeG0hnErd7C';

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      console.log('✅ Found payment intent:');
      console.log(`  Amount: $${(paymentIntent.amount / 100).toFixed(2)}`);
      console.log(`  Status: ${paymentIntent.status}`);
      console.log(`  Customer ID: ${paymentIntent.customer}`);
      console.log(`  Created: ${new Date(paymentIntent.created * 1000).toLocaleString()}`);

      if (paymentIntent.customer) {
        const customer = await stripe.customers.retrieve(paymentIntent.customer);
        console.log('\n👤 Customer details:');
        console.log(`  ID: ${customer.id}`);
        console.log(`  Name: ${customer.name || 'No name set'}`);
        console.log(`  Email: ${customer.email || 'No email set'}`);

        // Now update Virginia's record with this customer ID
        console.log('\n🔧 Updating Virginia Samaniego with this Stripe customer...');

        const updateResult = await pool.query(
          `
          UPDATE patients 
          SET 
            stripe_customer_id = $1,
            status = 'qualified',
            membership_hashtags = array_append(
              COALESCE(membership_hashtags, ARRAY[]::text[]), 
              '#activemember'
            ),
            updated_at = NOW()
          WHERE patient_id = 'P0248'
          RETURNING patient_id, first_name, last_name, email, stripe_customer_id, status
        `,
          [customer.id]
        );

        if (updateResult.rowCount > 0) {
          console.log('\n✅ Updated patient:', updateResult.rows[0]);
        }
      }
    } catch (err) {
      console.log('❌ Could not retrieve payment intent:', err.message);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

findByPayment();
