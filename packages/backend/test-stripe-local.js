/**
 * Quick Stripe Test Script
 * 
 * 1. Get a TEST key from https://dashboard.stripe.com/test/apikeys
 * 2. Run: STRIPE_SECRET_KEY=sk_test_XXX node test-stripe-local.js
 */

const Stripe = require('stripe');

// Use environment variable or replace with your TEST key
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_TEST_KEY';

if (!stripeKey.startsWith('sk_test_')) {
  console.error('❌ Please use a TEST key (starts with sk_test_) for safety!');
  process.exit(1);
}

const stripe = new Stripe(stripeKey);

async function testStripe() {
  try {
    console.log('🔍 Testing Stripe connection...\n');

    // Test 1: Check account
    const account = await stripe.accounts.retrieve();
    console.log('✅ Connected to Stripe account:', account.email);
    console.log('   Mode: TEST MODE (safe for development)\n');

    // Test 2: Create a test customer
    const customer = await stripe.customers.create({
      email: 'test@eonmeds.com',
      name: 'Test Patient',
      metadata: {
        patient_id: 'P0001',
        platform: 'eonmeds'
      }
    });
    console.log('✅ Created test customer:', customer.id);

    // Test 3: Create a test payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 9900, // $99.00
      currency: 'usd',
      customer: customer.id,
      description: 'Test consultation',
      automatic_payment_methods: {
        enabled: true,
      },
    });
    console.log('✅ Created test payment intent:', paymentIntent.id);
    console.log('   Amount: $' + (paymentIntent.amount / 100));
    console.log('   Status:', paymentIntent.status);

    console.log('\n🎉 All tests passed! Your Stripe setup is working.\n');
    console.log('Next steps:');
    console.log('1. Add this TEST key to Railway: STRIPE_SECRET_KEY=' + stripeKey);
    console.log('2. Deploy and test the endpoints');
    console.log('3. Only switch to live key when ready for production');

  } catch (error) {
    console.error('❌ Stripe test failed:', error.message);
    if (error.code === 'api_key_expired') {
      console.error('   Your API key has expired. Get a new one from Stripe Dashboard.');
    } else if (error.code === 'invalid_api_key') {
      console.error('   Your API key is invalid. Check for typos.');
    }
  }
}

testStripe();
