# Stripe Invoice Creation Guide for EONMeds Platform

## Overview
This guide demonstrates how to create and send invoices using the Stripe API, integrated with the EONMeds platform.

## Step-by-Step Invoice Creation

### 1. Create a Product with a Price
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const product = await stripe.products.create({
  name: 'Medical Consultation',
  description: 'General medical consultation services',
  default_price_data: {
    currency: 'usd',
    unit_amount: 15000, // $150.00 in cents
  },
});
```

### 2. Create or Get a Customer
```javascript
// For existing patients, first check if they have a Stripe customer ID
const patientResult = await pool.query(
  'SELECT stripe_customer_id FROM patients WHERE patient_id = $1',
  [patientId]
);

let customerId;
if (patientResult.rows[0]?.stripe_customer_id) {
  customerId = patientResult.rows[0].stripe_customer_id;
} else {
  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: patientEmail,
    name: `${patientFirstName} ${patientLastName}`,
    metadata: {
      patient_id: patientId,
      platform: 'EONPRO'
    }
  });
  
  // Save to database
  await pool.query(
    'UPDATE patients SET stripe_customer_id = $1 WHERE patient_id = $2',
    [customer.id, patientId]
  );
  
  customerId = customer.id;
}
```

### 3. Create an Invoice
```javascript
const invoice = await stripe.invoices.create({
  customer: customerId,
  collection_method: 'send_invoice',
  days_until_due: 30,
  metadata: {
    patient_id: patientId,
    platform: 'EONPRO'
  },
  custom_fields: [
    {
      name: 'Patient ID',
      value: patientId
    }
  ]
});
```

### 4. Add Invoice Items
```javascript
// Add multiple items to the invoice
const consultationItem = await stripe.invoiceItems.create({
  customer: customerId,
  price: product.default_price, // Use the price from the product
  invoice: invoice.id,
  description: 'Medical Consultation - 45 minutes'
});

// Add additional items as needed
const labItem = await stripe.invoiceItems.create({
  customer: customerId,
  amount: 7500, // $75.00 in cents
  currency: 'usd',
  invoice: invoice.id,
  description: 'Lab Work - Blood Test'
});
```

### 5. Finalize and Send the Invoice
```javascript
// Finalize the invoice
const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

// Send the invoice via email
const sentInvoice = await stripe.invoices.sendInvoice(invoice.id);

// Store in local database
await pool.query(
  `INSERT INTO invoices (invoice_number, patient_id, amount, status, stripe_invoice_id, due_date)
   VALUES ($1, $2, $3, $4, $5, $6)`,
  [
    sentInvoice.number,
    patientId,
    sentInvoice.amount_due / 100, // Convert from cents
    'sent',
    sentInvoice.id,
    new Date(sentInvoice.due_date * 1000)
  ]
);
```

## Using the Existing Billing Controller

The EONMeds platform already has endpoints for invoice creation. You can use them like this:

### Create Invoice via API
```bash
curl -X POST https://eonmeds-platform2025-production.up.railway.app/api/v1/payments/invoices/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient_123",
    "items": [
      {
        "description": "Medical Consultation",
        "amount": 150.00,
        "currency": "usd"
      },
      {
        "description": "Lab Work",
        "amount": 75.00,
        "currency": "usd"
      }
    ],
    "behavior": "finalize_and_email"
  }'
```

### Available Behaviors:
- `draft` - Creates a draft invoice (not sent)
- `finalize` - Finalizes the invoice but doesn't send
- `finalize_and_email` - Finalizes and sends via email
- `finalize_and_charge` - Finalizes and attempts immediate payment

## Webhook Events

Once configured, your webhook will receive these invoice-related events:

1. **invoice.created** - When a new invoice is created
2. **invoice.finalized** - When an invoice is finalized
3. **invoice.sent** - When an invoice is sent to customer
4. **invoice.payment_succeeded** - When payment is received
5. **invoice.payment_failed** - When payment fails

## Example: Complete Invoice Flow

```javascript
// Complete example using the billing service
const billingService = require('./services/billing-system.service');

async function createAndSendInvoice(patientId, items) {
  try {
    // 1. Ensure customer exists
    const customerId = await billingService.ensureStripeCustomer(patientId);
    
    // 2. Create invoice with items
    const invoice = await billingService.createInvoice({
      customer_id: customerId,
      items: items,
      collection_method: 'send_invoice',
      days_until_due: 30
    });
    
    // 3. Send the invoice
    const sentInvoice = await stripe.invoices.sendInvoice(invoice.id);
    
    // 4. Update local database
    await pool.query(
      'UPDATE invoices SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE stripe_invoice_id = $2',
      ['sent', invoice.id]
    );
    
    return sentInvoice;
  } catch (error) {
    console.error('Invoice creation failed:', error);
    throw error;
  }
}

// Usage
const invoice = await createAndSendInvoice('patient_123', [
  { description: 'Consultation', amount: 150.00 },
  { description: 'Lab Work', amount: 75.00 }
]);
```

## Testing in Development

For testing, use Stripe's test mode:
1. Use test API keys (sk_test_...)
2. Use test card numbers like 4242 4242 4242 4242
3. Test webhooks using Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:8080/api/v1/webhooks/stripe
   ```

## Common Invoice Scenarios

### 1. Partial Payment
```javascript
// Allow partial payments on large invoices
const invoice = await stripe.invoices.create({
  customer: customerId,
  collection_method: 'send_invoice',
  days_until_due: 30,
  payment_settings: {
    payment_method_types: ['card', 'ach_debit'],
    default_mandate: null
  }
});
```

### 2. Recurring Subscription Invoice
```javascript
// Create subscription for recurring billing
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: 'price_monthly_consultation' }],
  metadata: { patient_id: patientId }
});
```

### 3. Invoice with Discount
```javascript
// Apply discount to invoice
const invoice = await stripe.invoices.create({
  customer: customerId,
  collection_method: 'send_invoice',
  days_until_due: 30,
  discounts: [{
    coupon: 'SENIOR_DISCOUNT' // 20% off coupon
  }]
});
```

## Error Handling

Always handle Stripe errors appropriately:

```javascript
try {
  const invoice = await stripe.invoices.create({...});
} catch (error) {
  if (error.type === 'StripeCardError') {
    // Card was declined
    console.error('Card error:', error.message);
  } else if (error.type === 'StripeInvalidRequestError') {
    // Invalid parameters
    console.error('Invalid request:', error.message);
  } else {
    // Other errors
    console.error('Stripe error:', error);
  }
}
```

## Security Best Practices

1. Always verify webhook signatures
2. Use idempotency keys for critical operations
3. Store sensitive data (like full card numbers) only in Stripe
4. Log all payment activities for audit trails
5. Implement proper error handling and retry logic

## Additional Resources

- [Stripe Invoice API Docs](https://stripe.com/docs/api/invoices)
- [Stripe Billing Overview](https://stripe.com/docs/billing)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
