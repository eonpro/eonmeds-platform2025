#!/usr/bin/env node

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function findLuis() {
  try {
    console.log('🔍 Searching for Luis Pena in Stripe...\n');

    // Search by name
    let hasMore = true;
    let startingAfter = null;
    let found = false;

    while (hasMore && !found) {
      const params = { limit: 100 };
      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const customers = await stripe.customers.list(params);

      for (const customer of customers.data) {
        if (
          customer.name &&
          customer.name.toLowerCase().includes('luis') &&
          customer.name.toLowerCase().includes('pena')
        ) {
          console.log('✅ Found Luis Pena:');
          console.log(`  ID: ${customer.id}`);
          console.log(`  Name: ${customer.name}`);
          console.log(`  Email: ${customer.email}`);
          console.log(`  Created: ${new Date(customer.created * 1000).toLocaleDateString()}`);
          found = true;

          // Get recent payments
          const payments = await stripe.paymentIntents.list({
            customer: customer.id,
            limit: 5,
          });

          console.log(`\n💳 Recent payments:`);
          payments.data.forEach((payment) => {
            if (payment.status === 'succeeded') {
              console.log(
                `  - $${(payment.amount / 100).toFixed(2)} on ${new Date(payment.created * 1000).toLocaleDateString()}`
              );
            }
          });
          break;
        }
      }

      hasMore = customers.has_more;
      if (hasMore && customers.data.length > 0) {
        startingAfter = customers.data[customers.data.length - 1].id;
      }
    }

    if (!found) {
      console.log('❌ Luis Pena not found in Stripe customers');

      // Try searching by the email we saw
      console.log('\n🔍 Searching by email danielexander89@hotmail.com...');
      const byEmail = await stripe.customers.search({
        query: 'email:"danielexander89@hotmail.com"',
      });

      if (byEmail.data.length > 0) {
        console.log('\n✅ Found customer with that email:');
        byEmail.data.forEach((customer) => {
          console.log(`  ID: ${customer.id}`);
          console.log(`  Name: ${customer.name || 'No name'}`);
          console.log(`  Email: ${customer.email}`);
        });
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findLuis();
