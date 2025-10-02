require('dotenv').config();
const Stripe = require('stripe');

// Check what Stripe key we're using
console.log('Stripe key starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 7));

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia'
});

async function verifyCustomer() {
  const customerId = 'cus_Sr42NhQcAzW9JB'; // From the error
  
  try {
    console.log('\nAttempting to retrieve customer:', customerId);
    const customer = await stripe.customers.retrieve(customerId);
    console.log('✅ Customer found:', customer.id, customer.email);
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Check if it's a test/live mode issue
    if (error.message.includes('similar object exists')) {
      console.log('\n⚠️  This customer exists in a different mode (test vs live)');
      console.log('Current key mode:', process.env.STRIPE_SECRET_KEY?.includes('_test_') ? 'TEST' : 'LIVE');
    }
  }
  
  // Also check database
  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const result = await pool.query(
      "SELECT patient_id, stripe_customer_id FROM patients WHERE stripe_customer_id = $1",
      [customerId]
    );
    
    if (result.rows.length > 0) {
      console.log('\n📊 Database info:');
      console.log('Patient ID:', result.rows[0].patient_id);
      console.log('Stripe Customer ID:', result.rows[0].stripe_customer_id);
    } else {
      console.log('\n❌ Customer ID not found in database');
    }
    
    await pool.end();
  } catch (err) {
    console.error('Database error:', err.message);
  }
}

verifyCustomer();
