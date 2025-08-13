#!/usr/bin/env node

/**
 * Stripe Webhook Configuration Script
 * This script helps configure the webhook endpoint in Stripe
 */

const Stripe = require('stripe');

// Initialize Stripe with live key from environment
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

async function configureWebhook() {
  console.log('🎯 Stripe Webhook Configuration');
  console.log('================================\n');

  const webhookUrl = 'https://eonmeds-platform2025-production.up.railway.app/api/v1/webhooks/stripe';
  const webhookSecret = 'whsec_3l3mCp3g2kd50an0PpgQJuBqUfNKGGYv';

  console.log('📋 Webhook Configuration Details:');
  console.log(`   URL: ${webhookUrl}`);
  console.log(`   Secret: ${webhookSecret}`);
  console.log('');

  console.log('📋 Required Events:');
  const events = [
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'customer.created',
    'customer.updated',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'checkout.session.completed',
    'charge.succeeded',
    'charge.failed'
  ];

  events.forEach(event => {
    console.log(`   ✅ ${event}`);
  });

  console.log('\n🔗 Manual Configuration Steps:');
  console.log('1. Go to: https://dashboard.stripe.com/webhooks');
  console.log('2. Click "Add endpoint"');
  console.log(`3. Set URL to: ${webhookUrl}`);
  console.log('4. Select the events listed above');
  console.log(`5. Verify webhook secret: ${webhookSecret}`);
  console.log('6. Click "Add endpoint"');

  console.log('\n🧪 Testing Webhook:');
  console.log('After configuring, test with:');
  console.log(`curl -X POST ${webhookUrl} \\`);
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"test": "webhook"}\'');

  console.log('\n📊 Monitor Webhook Events:');
  console.log('- Stripe Dashboard: https://dashboard.stripe.com/webhooks');
  console.log('- Railway Logs: railway logs');
  console.log('- Recent Events: curl https://eonmeds-platform2025-production.up.railway.app/api/v1/webhooks/recent');

  // Try to create webhook programmatically
  try {
    console.log('\n🚀 Attempting to create webhook programmatically...');
    
    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: events,
      metadata: {
        environment: 'production',
        service: 'eonmeds-backend'
      }
    });

    console.log('✅ Webhook created successfully!');
    console.log(`   Webhook ID: ${webhook.id}`);
    console.log(`   Status: ${webhook.status}`);
    console.log(`   URL: ${webhook.url}`);
    console.log(`   Events: ${webhook.enabled_events.length} events configured`);

    console.log('\n🔑 Webhook Secret:');
    console.log(`   ${webhook.secret}`);
    console.log('\n⚠️  IMPORTANT: Save this secret and update your environment variables if different!');

  } catch (error) {
    console.log('\n❌ Could not create webhook programmatically:');
    console.log(`   Error: ${error.message}`);
    console.log('\n📋 Please configure the webhook manually using the steps above.');
  }
}

async function listExistingWebhooks() {
  try {
    console.log('\n📋 Existing Webhooks:');
    const webhooks = await stripe.webhookEndpoints.list();
    
    if (webhooks.data.length === 0) {
      console.log('   No webhooks found');
    } else {
      webhooks.data.forEach(webhook => {
        console.log(`   - ${webhook.url} (${webhook.status})`);
      });
    }
  } catch (error) {
    console.log(`   Error listing webhooks: ${error.message}`);
  }
}

async function main() {
  try {
    await configureWebhook();
    await listExistingWebhooks();
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { configureWebhook };
