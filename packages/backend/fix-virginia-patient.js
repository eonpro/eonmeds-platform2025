#!/usr/bin/env node

/**
 * Fix Virginia Samaniego's patient record
 * - Correct email typo
 * - Link Stripe customer
 * - Update status to qualified
 */

require('dotenv').config();
const { Pool } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixPatient() {
  try {
    console.log('🔧 Fixing Virginia Samaniego patient record...\n');
    
    // First, find the Stripe customer
    const stripeCustomers = await stripe.customers.list({
      email: 'danielexander89@hotmail.com',
      limit: 1
    });
    
    if (stripeCustomers.data.length === 0) {
      console.log('❌ No Stripe customer found with email danielexander89@hotmail.com');
      return;
    }
    
    const stripeCustomer = stripeCustomers.data[0];
    console.log('✅ Found Stripe customer:', stripeCustomer.id, stripeCustomer.name || stripeCustomer.email);
    
    // Update the patient record
    const result = await pool.query(`
      UPDATE patients 
      SET 
        email = 'danielexander89@hotmail.com',
        stripe_customer_id = $1,
        status = 'qualified',
        membership_hashtags = array_append(
          COALESCE(membership_hashtags, ARRAY[]::text[]), 
          '#activemember'
        ),
        updated_at = NOW()
      WHERE patient_id = 'P0248'
      RETURNING patient_id, first_name, last_name, email, stripe_customer_id, status
    `, [stripeCustomer.id]);
    
    if (result.rowCount > 0) {
      console.log('\n✅ Updated patient:', result.rows[0]);
      
      // Check for payments
      const payments = await stripe.paymentIntents.list({
        customer: stripeCustomer.id,
        limit: 10
      });
      
      console.log(`\n💳 Found ${payments.data.length} payments for this customer`);
      payments.data.forEach(payment => {
        if (payment.status === 'succeeded') {
          console.log(`  - $${(payment.amount / 100).toFixed(2)} on ${new Date(payment.created * 1000).toLocaleDateString()}`);
        }
      });
      
      // Create invoice records if needed
      const invoiceCheck = await pool.query(
        'SELECT COUNT(*) as count FROM invoices WHERE patient_id = $1',
        ['P0248']
      );
      
      console.log(`\n📄 Current invoices in database: ${invoiceCheck.rows[0].count}`);
      
    } else {
      console.log('❌ Patient P0248 not found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixPatient(); 