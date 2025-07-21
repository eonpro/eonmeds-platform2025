#!/usr/bin/env node

/**
 * Test Stripe Webhook Integration
 * This script simulates various Stripe webhook events to verify proper handling
 */

const axios = require('axios');
const crypto = require('crypto');

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3002/api/v1/payments/webhook/stripe';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Test events
const testEvents = {
  // 1. Checkout session completed (external payment link)
  checkoutSessionCompleted: {
    id: 'evt_test_checkout_' + Date.now(),
    object: 'event',
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'cs_test_' + Date.now(),
        object: 'checkout.session',
        amount_total: 29900, // $299.00
        currency: 'usd',
        customer: 'cus_test_' + Date.now(),
        customer_email: 'test@example.com',
        customer_details: {
          email: 'test@example.com',
          name: 'Test Patient',
          phone: '+1234567890'
        },
        metadata: {
          service_type: 'weight_loss',
          billing_period: 'monthly'
        },
        mode: 'payment',
        payment_status: 'paid',
        status: 'complete',
        success_url: 'https://example.com/success'
      }
    }
  },

  // 2. Charge succeeded (direct charge)
  chargeSucceeded: {
    id: 'evt_test_charge_' + Date.now(),
    object: 'event',
    type: 'charge.succeeded',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'ch_test_' + Date.now(),
        object: 'charge',
        amount: 29900,
        currency: 'usd',
        customer: null, // External payment without customer
        billing_details: {
          email: 'external@example.com',
          name: 'External Patient',
          phone: '+1987654321'
        },
        metadata: {
          service_type: 'weight_loss',
          form_type: 'external_stripe'
        },
        paid: true,
        payment_method: 'card_' + Date.now(),
        status: 'succeeded'
      }
    }
  },

  // 3. Customer subscription created
  subscriptionCreated: {
    id: 'evt_test_sub_' + Date.now(),
    object: 'event',
    type: 'customer.subscription.created',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'sub_test_' + Date.now(),
        object: 'subscription',
        customer: 'cus_test_existing',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
        current_period_start: Math.floor(Date.now() / 1000),
        items: {
          data: [{
            price: {
              id: 'price_test_weight_loss',
              product: 'prod_test_weight_loss',
              recurring: {
                interval: 'month'
              }
            }
          }]
        },
        metadata: {
          patient_id: 'P007123'
        }
      }
    }
  },

  // 4. Invoice paid
  invoicePaid: {
    id: 'evt_test_invoice_' + Date.now(),
    object: 'event',
    type: 'invoice.paid',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'in_test_' + Date.now(),
        object: 'invoice',
        customer: 'cus_test_invoice',
        amount_paid: 29900,
        currency: 'usd',
        metadata: {
          patient_id: 'P007124'
        },
        payment_intent: 'pi_test_' + Date.now(),
        status: 'paid',
        subscription: 'sub_test_invoice'
      }
    }
  }
};

// Generate webhook signature
function generateSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return {
    signature: `t=${timestamp},v1=${signature}`,
    timestamp
  };
}

// Send webhook event
async function sendWebhook(eventName, event) {
  try {
    console.log(`\n📤 Sending ${eventName}...`);
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add signature if webhook secret is configured
    if (WEBHOOK_SECRET) {
      const { signature } = generateSignature(event, WEBHOOK_SECRET);
      headers['stripe-signature'] = signature;
    } else {
      console.log('⚠️  No webhook secret configured - sending without signature');
    }
    
    const response = await axios.post(WEBHOOK_URL, event, { headers });
    
    console.log(`✅ Response: ${response.status} ${response.statusText}`);
    console.log('📥 Data:', JSON.stringify(response.data, null, 2));
    
    return { success: true, response: response.data };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    return { success: false, error: error.message };
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Testing Stripe Webhook Integration');
  console.log('=====================================');
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`Has Secret: ${WEBHOOK_SECRET ? 'Yes' : 'No'}`);
  
  const results = [];
  
  // Test each event type
  for (const [name, event] of Object.entries(testEvents)) {
    const result = await sendWebhook(name, event);
    results.push({ name, ...result });
    
    // Wait a bit between events
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  // Show failed tests
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`- ${r.name}: ${r.error}`);
    });
  }
  
  // Database verification queries
  console.log('\n🔍 Verification Queries:');
  console.log('========================');
  console.log('\n1. Check for new patients:');
  console.log("SELECT patient_id, email, status, form_type, stripe_customer_id FROM patients WHERE email IN ('test@example.com', 'external@example.com') ORDER BY created_at DESC;");
  
  console.log('\n2. Check webhook events:');
  console.log("SELECT event_type, processed, error_message FROM webhook_events WHERE source = 'stripe' ORDER BY created_at DESC LIMIT 5;");
  
  console.log('\n3. Check invoices:');
  console.log("SELECT invoice_number, stripe_customer_id, status, total_amount FROM invoices ORDER BY created_at DESC LIMIT 5;");
}

// Run tests
runTests().catch(console.error); 