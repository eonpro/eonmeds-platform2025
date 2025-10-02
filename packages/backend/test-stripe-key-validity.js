const stripe = require('stripe');

// Test if STRIPE_SECRET_KEY is valid
const key = process.env.STRIPE_SECRET_KEY;

if (!key) {
  console.error('❌ STRIPE_SECRET_KEY not set in environment');
  console.error('Please set it in AWS App Runner environment variables');
  process.exit(1);
}

console.log('Testing Stripe key:', key.substring(0, 15) + '...');

const stripeClient = stripe(key);

// Try to list customers (simplest API call)
stripeClient.customers.list({ limit: 1 })
  .then(() => {
    console.log('✅ Stripe API key is VALID');
    console.log('Mode:', key.startsWith('sk_test_') ? 'TEST' : 'LIVE');
  })
  .catch(err => {
    console.error('❌ Stripe API key is INVALID');
    console.error('Error:', err.message);
    console.error('\nPlease update STRIPE_SECRET_KEY in AWS App Runner console:');
    console.error('1. Go to AWS App Runner console');
    console.error('2. Select your service');
    console.error('3. Configuration tab → Edit service');
    console.error('4. Update STRIPE_SECRET_KEY with your valid key');
  });
