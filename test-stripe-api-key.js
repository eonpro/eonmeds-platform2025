#!/usr/bin/env node

/**
 * Test Stripe API Key Configuration
 * This script verifies that your Stripe API key is valid and has proper permissions
 */

const https = require('https');

// Get environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_MODE = process.env.STRIPE_MODE || 'test';

if (!STRIPE_SECRET_KEY) {
  console.error('❌ ERROR: STRIPE_SECRET_KEY environment variable is not set');
  console.log('\nTo test, run:');
  console.log('STRIPE_SECRET_KEY=sk_live_YOUR_KEY node test-stripe-api-key.js');
  process.exit(1);
}

// Check key prefix matches mode
const isLiveKey = STRIPE_SECRET_KEY.startsWith('sk_live_');
const isTestKey = STRIPE_SECRET_KEY.startsWith('sk_test_');

console.log('=== Stripe API Key Test ===\n');
console.log(`Mode: ${STRIPE_MODE}`);
console.log(`Key type: ${isLiveKey ? 'LIVE' : isTestKey ? 'TEST' : 'UNKNOWN'}`);

if (STRIPE_MODE === 'live' && !isLiveKey) {
  console.error('❌ ERROR: STRIPE_MODE is "live" but key doesn\'t start with "sk_live_"');
} else if (STRIPE_MODE === 'test' && !isTestKey) {
  console.error('❌ ERROR: STRIPE_MODE is "test" but key doesn\'t start with "sk_test_"');
}

// Test the API key by making a simple request to Stripe
console.log('\nTesting API key validity...\n');

const options = {
  hostname: 'api.stripe.com',
  port: 443,
  path: '/v1/customers?limit=1',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    const response = JSON.parse(data);
    
    if (res.statusCode === 200) {
      console.log('✅ SUCCESS: Stripe API key is valid!');
      console.log(`✅ Mode: ${STRIPE_MODE}`);
      console.log('✅ Permissions: Can read customers');
      console.log('\nAPI Response:');
      console.log(`- Status: ${res.statusCode}`);
      console.log(`- Has customers: ${response.data && response.data.length > 0}`);
      console.log(`- URL: ${response.url || 'N/A'}`);
    } else if (res.statusCode === 401) {
      console.error('❌ ERROR: Invalid API Key');
      console.error('\nStripe Error:', response.error?.message || 'Authentication failed');
      console.error('\nPossible issues:');
      console.error('1. The API key is incorrect');
      console.error('2. The API key was revoked');
      console.error('3. There are extra spaces or characters in the key');
    } else {
      console.error(`❌ ERROR: Unexpected status code: ${res.statusCode}`);
      console.error('Response:', JSON.stringify(response, null, 2));
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Network error:', error.message);
});

req.end();
