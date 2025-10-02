#!/usr/bin/env node

const https = require('https');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.argv[2];

if (!STRIPE_SECRET_KEY) {
  console.error('Usage: node test-stripe-key.js <stripe_secret_key>');
  process.exit(1);
}

console.log('=== Testing Stripe API Key ===\n');
console.log(`Key prefix: ${STRIPE_SECRET_KEY.substring(0, 8)}...`);
console.log(`Key type: ${STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'LIVE' : 'TEST'}\n`);

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
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log('✅ SUCCESS: API key is valid!');
        console.log('✅ Can read customers');
        console.log('✅ Key has proper permissions\n');
        
        // Test creating a payment method to verify write permissions
        console.log('Testing payment method creation permissions...\n');
        testPaymentMethodCreation(STRIPE_SECRET_KEY);
      } else if (res.statusCode === 401) {
        console.error('❌ ERROR: Invalid API Key\n');
        console.error('Stripe says:', response.error?.message || 'Authentication failed');
        console.error('\nPossible issues:');
        console.error('1. The API key is incorrect');
        console.error('2. Extra spaces or characters in the key');
        console.error('3. The key was revoked in Stripe Dashboard');
        console.error('4. Wrong key for the account');
      } else {
        console.error(`❌ Unexpected status: ${res.statusCode}`);
        console.error('Response:', JSON.stringify(response, null, 2));
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
      console.error('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Network error:', error.message);
});

req.end();

function testPaymentMethodCreation(apiKey) {
  const testData = 'type=card&card[number]=4242424242424242&card[exp_month]=12&card[exp_year]=2025&card[cvc]=123';
  
  const options = {
    hostname: 'api.stripe.com',
    port: 443,
    path: '/v1/payment_methods',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': testData.length
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
        console.log('✅ Can create payment methods');
        console.log('✅ Key has write permissions');
        console.log(`✅ Test payment method created: ${response.id}`);
      } else {
        console.error('❌ Cannot create payment methods');
        console.error('Error:', response.error?.message || 'Unknown error');
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Network error:', error.message);
  });

  req.write(testData);
  req.end();
}
