const axios = require('axios');

// Test webhook payload for charge.succeeded
const testChargePayload = {
  id: 'evt_test_charge_' + Date.now(),
  object: 'event',
  type: 'charge.succeeded',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'ch_test_' + Date.now(),
      object: 'charge',
      amount: 9900, // $99.00
      currency: 'usd',
      created: Math.floor(Date.now() / 1000),
      description: 'Test External Payment',
      paid: true,
      status: 'succeeded',
      billing_details: {
        email: 'test.external@example.com',
        name: 'John External',
        phone: '+1234567890'
      },
      customer: null, // No existing customer
      payment_intent: null, // Direct charge, not from payment intent
      metadata: {
        source: 'external_test'
      }
    }
  }
};

// Test webhook payload for checkout.session.completed
const testCheckoutPayload = {
  id: 'evt_test_checkout_' + Date.now(),
  object: 'event',
  type: 'checkout.session.completed',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'cs_test_' + Date.now(),
      object: 'checkout.session',
      amount_total: 19900, // $199.00
      currency: 'usd',
      customer: null,
      customer_email: 'checkout.test@example.com',
      customer_details: {
        email: 'checkout.test@example.com',
        name: 'Jane Checkout',
        phone: '+1987654321'
      },
      mode: 'payment',
      payment_status: 'paid',
      status: 'complete',
      metadata: {
        source: 'external_checkout_test'
      }
    }
  }
};

async function testWebhook(payload, eventType) {
  try {
    console.log(`\n🧪 Testing ${eventType} webhook...`);
    
    const response = await axios.post(
      'http://localhost:3002/api/v1/payments/webhook/stripe',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test_signature' // Will be skipped in dev mode
        }
      }
    );
    
    console.log('✅ Webhook response:', response.data);
    
    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if patient was created
    console.log('\n📊 Checking results...');
    console.log('Check the database for:');
    console.log('- New patient with email:', payload.data.object.billing_details?.email || payload.data.object.customer_email);
    console.log('- New invoice with status: paid');
    console.log('- Patient status should be: subscriptions');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting external payment capture tests...\n');
  
  // Test charge.succeeded
  await testWebhook(testChargePayload, 'charge.succeeded');
  
  // Wait between tests
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test checkout.session.completed
  await testWebhook(testCheckoutPayload, 'checkout.session.completed');
  
  console.log('\n✅ Tests completed! Check your database and logs.');
}

runTests(); 