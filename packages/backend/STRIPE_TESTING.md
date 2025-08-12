# Stripe Integration Testing Guide

## Overview

This guide covers testing strategies for the Stripe billing integration, including test card numbers, webhook testing, and idempotency verification.

## Test Environment Setup

1. **Use Test Mode Keys**

   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_test_...
   ```

2. **Test Database**
   - Use a separate test database to avoid affecting production data
   - Run migrations: `psql $TEST_DATABASE_URL < src/config/stripe-webhook-tables.sql`

## Test Card Reference Table

| Card Number                  | Brand      | Description                  | Use Case                |
| ---------------------------- | ---------- | ---------------------------- | ----------------------- |
| **Successful Payments**      |
| 4242 4242 4242 4242          | Visa       | Always succeeds              | General testing         |
| 5555 5555 5555 4444          | Mastercard | Always succeeds              | Multi-brand testing     |
| 3782 822463 10005            | Amex       | Always succeeds              | Amex-specific testing   |
| 6011 1111 1111 1117          | Discover   | Always succeeds              | Discover testing        |
| **3D Secure Authentication** |
| 4000 0027 6000 3184          | Visa       | Requires authentication      | 3DS flow testing        |
| 4000 0025 0000 3155          | Visa       | 3DS2 authentication required | 3DS2 testing            |
| 4000 0082 6000 0000          | Visa       | 3DS2 with browser flow       | Full 3DS2 testing       |
| **Declined Payments**        |
| 4000 0000 0000 0002          | Visa       | Generic decline              | Decline handling        |
| 4000 0000 0000 9995          | Visa       | Insufficient funds           | Specific decline reason |
| 4000 0000 0000 9987          | Visa       | Lost card                    | Lost card handling      |
| 4000 0000 0000 0069          | Visa       | Expired card                 | Expiry handling         |
| 4000 0000 0000 0127          | Visa       | Incorrect CVC                | CVC validation          |
| 4000 0000 0000 0119          | Visa       | Processing error             | Processing errors       |
| **Disputes & Fraud**         |
| 4000 0000 0000 0259          | Visa       | Dispute - fraudulent         | Dispute testing         |
| 4000 0000 0000 2685          | Visa       | Dispute - not received       | Dispute flow            |
| 4000 0000 0000 1976          | Visa       | High risk, blocked           | Risk evaluation         |

### Using Test Cards

- Use any 3-digit CVC (4-digit for Amex)
- Use any future expiration date
- Use any 5-digit ZIP code

## Testing Idempotency

### 1. Test Duplicate Prevention

```bash
# First request - should succeed
curl -X POST http://localhost:5002/api/v1/billing/invoice/create-and-pay \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: test-key-001" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cus_test123",
    "items": [{
      "description": "Test Service",
      "amount": 1000
    }]
  }'

# Second request with same key - should return same result
curl -X POST http://localhost:5002/api/v1/billing/invoice/create-and-pay \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: test-key-001" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cus_test123",
    "items": [{
      "description": "Test Service",
      "amount": 1000
    }]
  }'
```

### 2. Test Auto-Generated Keys

```javascript
// Test that requests without Idempotency-Key header work
const response = await fetch('/api/v1/billing/invoice/create-and-pay', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    customerId: 'cus_test123',
    items: [{ description: 'Test', amount: 1000 }],
  }),
});
```

## Stripe CLI Testing

### 1. Installation and Setup

```bash
# Install Stripe CLI
# macOS
brew install stripe/stripe-cli/stripe

# Linux
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install stripe

# Windows (using scoop)
scoop install stripe

# Login to your Stripe account
stripe login

# Verify connection
stripe config --list
```

### 2. Webhook Forwarding

```bash
# Forward webhooks to local endpoint
stripe listen --forward-to localhost:5002/api/v1/stripe/webhook

# Output will show:
# > Ready! Your webhook signing secret is whsec_xxxx (^C to quit)
# Copy this secret to your .env file as STRIPE_WEBHOOK_SECRET

# Forward specific events only
stripe listen --forward-to localhost:5002/api/v1/stripe/webhook \
  --events customer.subscription.created,customer.subscription.updated,invoice.paid

# Print event payloads for debugging
stripe listen --forward-to localhost:5002/api/v1/stripe/webhook --print-json
```

### 3. Creating Test Objects via CLI

#### Create Customers

```bash
# Basic customer
stripe customers create \
  --email="test@example.com" \
  --name="Test User" \
  --metadata="patientId=P1001"

# Customer with address (for tax calculation)
stripe customers create \
  --email="test.tax@example.com" \
  --name="Tax Test User" \
  --address="line1=123 Main St" \
  --address="city=San Francisco" \
  --address="state=CA" \
  --address="postal_code=94105" \
  --address="country=US"

# Customer with payment method
stripe customers create \
  --email="premium@example.com" \
  --payment-method="pm_card_visa" \
  --invoice-settings="default_payment_method=pm_card_visa"
```

#### Create Subscriptions

```bash
# Basic subscription
stripe subscriptions create \
  --customer="cus_xxx" \
  --items="price=price_xxx"

# Subscription with trial
stripe subscriptions create \
  --customer="cus_xxx" \
  --items="price=price_xxx" \
  --trial-period-days=14

# Subscription with multiple items
stripe subscriptions create \
  --customer="cus_xxx" \
  --items="price=price_base" \
  --items="price=price_addon" \
  --metadata="type=premium"

# Subscription with specific billing cycle
stripe subscriptions create \
  --customer="cus_xxx" \
  --items="price=price_xxx" \
  --billing-cycle-anchor="$(date -u +%s -d '+1 month')"
```

#### Create Invoices

```bash
# Create draft invoice
stripe invoices create \
  --customer="cus_xxx" \
  --description="Custom Service"

# Add invoice items
stripe invoice_items create \
  --customer="cus_xxx" \
  --amount=5000 \
  --currency=usd \
  --description="Consultation Fee"

# Finalize and pay invoice
stripe invoices finalize "in_xxx"
stripe invoices pay "in_xxx"

# Create and auto-finalize
stripe invoices create \
  --customer="cus_xxx" \
  --auto-advance=true \
  --collection-method="charge_automatically"
```

### 4. Triggering Test Events

```bash
# Common webhook events
stripe trigger customer.created
stripe trigger customer.updated
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.created
stripe trigger invoice.finalized
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded

# Trigger with custom data
stripe trigger invoice.paid \
  --override="customer:cus_xxx" \
  --override="subscription:sub_xxx"

# Trigger multiple events in sequence
stripe trigger customer.subscription.updated && \
stripe trigger invoice.created && \
stripe trigger invoice.paid
```

## Test Clocks for Time-Based Testing

### 1. Understanding Test Clocks

Test Clocks allow you to simulate the passage of time for testing:

- Trial periods
- Billing cycles
- Subscription renewals
- Proration scenarios
- Grace periods

### 2. Creating and Using Test Clocks

```bash
# Create a test clock
stripe test_clocks create \
  --name="Subscription Lifecycle Test"

# Output: test_clock_xxx

# Create customer attached to test clock
stripe customers create \
  --test-clock="test_clock_xxx" \
  --email="clock-test@example.com" \
  --name="Clock Test User"

# Create subscription attached to test clock customer
stripe subscriptions create \
  --customer="cus_xxx" \
  --items="price=price_monthly" \
  --trial-period-days=7
```

### 3. Advancing Time

```bash
# Advance by specific duration
stripe test_clocks advance "test_clock_xxx" \
  --frozen-time="$(date -u +%s -d '+7 days')"

# Advance to end of trial
stripe test_clocks advance "test_clock_xxx" \
  --frozen-time="$(date -u +%s -d '+7 days')"

# Advance to next billing cycle
stripe test_clocks advance "test_clock_xxx" \
  --frozen-time="$(date -u +%s -d '+1 month')"

# Advance by 3 months
stripe test_clocks advance "test_clock_xxx" \
  --frozen-time="$(date -u +%s -d '+3 months')"
```

### 4. Test Clock Scenarios

#### Scenario 1: Trial to Paid Conversion

```bash
# 1. Create clock and customer
CLOCK_ID=$(stripe test_clocks create --name="Trial Test" | grep -o 'clock_[^ ]*')
CUSTOMER_ID=$(stripe customers create --test-clock="$CLOCK_ID" --email="trial@test.com" | grep -o 'cus_[^ ]*')

# 2. Create subscription with 7-day trial
SUB_ID=$(stripe subscriptions create \
  --customer="$CUSTOMER_ID" \
  --items="price=price_xxx" \
  --trial-period-days=7 | grep -o 'sub_[^ ]*')

# 3. Check initial state
stripe subscriptions retrieve "$SUB_ID"

# 4. Advance to end of trial
stripe test_clocks advance "$CLOCK_ID" \
  --frozen-time="$(date -u +%s -d '+7 days')"

# 5. Observe webhooks:
# - customer.subscription.updated (trial ending)
# - invoice.created
# - invoice.finalized
# - invoice.paid (or payment_failed)
# - customer.subscription.updated (now active or past_due)
```

#### Scenario 2: Proration Testing

```bash
# 1. Create subscription
SUB_ID=$(stripe subscriptions create \
  --customer="$CUSTOMER_ID" \
  --items="price=price_basic_monthly" | grep -o 'sub_[^ ]*')

# 2. Advance 15 days into billing period
stripe test_clocks advance "$CLOCK_ID" \
  --frozen-time="$(date -u +%s -d '+15 days')"

# 3. Upgrade subscription mid-cycle
stripe subscriptions update "$SUB_ID" \
  --items="id=$(stripe subscriptions retrieve $SUB_ID | jq -r '.items.data[0].id'),price=price_premium_monthly" \
  --proration-behavior="create_prorations"

# 4. Check proration invoice
stripe invoices list --customer="$CUSTOMER_ID" --limit=1
```

#### Scenario 3: Failed Payment Recovery

```bash
# 1. Create subscription with card that will fail
CUSTOMER_ID=$(stripe customers create \
  --test-clock="$CLOCK_ID" \
  --payment-method="pm_card_chargeDeclinedInsufficientFunds" \
  --invoice-settings="default_payment_method=pm_card_chargeDeclinedInsufficientFunds" | grep -o 'cus_[^ ]*')

SUB_ID=$(stripe subscriptions create \
  --customer="$CUSTOMER_ID" \
  --items="price=price_xxx" | grep -o 'sub_[^ ]*')

# 2. Advance to next billing cycle
stripe test_clocks advance "$CLOCK_ID" \
  --frozen-time="$(date -u +%s -d '+1 month')"

# 3. Observe payment failure webhooks
# - invoice.payment_failed
# - customer.subscription.updated (past_due)

# 4. Update payment method
stripe customers update "$CUSTOMER_ID" \
  --invoice-settings="default_payment_method=pm_card_visa"

# 5. Retry payment
INVOICE_ID=$(stripe invoices list --customer="$CUSTOMER_ID" --status=open --limit=1 | jq -r '.data[0].id')
stripe invoices pay "$INVOICE_ID"
```

### 5. Test Clock Best Practices

1. **Isolate Test Clocks**: Each test scenario should use its own clock
2. **Clean Up**: Delete test clocks after testing
   ```bash
   stripe test_clocks delete "test_clock_xxx"
   ```
3. **Document Time Advances**: Keep track of virtual time in your tests
4. **Monitor Webhooks**: Use `stripe listen` to observe all triggered events
5. **Batch Operations**: Advance time once rather than multiple small advances

### 2. Webhook Idempotency Testing

```bash
# Send the same webhook event multiple times
# The processed_events table should prevent duplicate processing
stripe trigger invoice.paid --event-id evt_test_duplicate
stripe trigger invoice.paid --event-id evt_test_duplicate
```

### 3. Verify Webhook Processing

```sql
-- Check processed events
SELECT * FROM processed_events ORDER BY processed_at DESC;

-- Check billing events log
SELECT event_id, type, created_at FROM billing_events ORDER BY created_at DESC;

-- Verify no duplicates
SELECT event_id, COUNT(*) FROM processed_events GROUP BY event_id HAVING COUNT(*) > 1;
```

## Integration Test Suite

### 1. Customer Creation Test

```javascript
describe('Customer Creation', () => {
  it('should create customer with idempotency', async () => {
    const idempotencyKey = 'test-customer-001';

    // First request
    const response1 = await createCustomer(
      {
        patientId: 'P1001',
        email: 'test@example.com',
        name: 'Test User',
      },
      idempotencyKey
    );

    // Second request with same key
    const response2 = await createCustomer(
      {
        patientId: 'P1001',
        email: 'test@example.com',
        name: 'Test User',
      },
      idempotencyKey
    );

    expect(response1.customerId).toBe(response2.customerId);
  });
});
```

### 2. Payment Flow Test

```javascript
describe('Payment Flow', () => {
  it('should handle payment with retry', async () => {
    const idempotencyKey = 'test-payment-001';

    // Simulate network failure and retry
    let attempts = 0;
    const makePayment = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Network error');
      }

      return await createInvoiceAndPay(
        {
          customerId: 'cus_test123',
          items: [{ description: 'Test', amount: 1000 }],
        },
        idempotencyKey
      );
    };

    // Retry logic
    let result;
    for (let i = 0; i < 3; i++) {
      try {
        result = await makePayment();
        break;
      } catch (error) {
        if (i === 2) throw error;
      }
    }

    // Should succeed on third attempt with same idempotency key
    expect(result).toBeDefined();
    expect(attempts).toBe(3);
  });
});
```

## Error Handling Tests

### 1. Card Decline Handling

```bash
# Test with decline card
curl -X POST http://localhost:5002/api/v1/billing/payment-methods/attach \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "P1001",
    "payment_method_id": "pm_card_visa_chargeDeclined"
  }'
```

### 2. Validation Error Tests

```bash
# Invalid patient ID format
curl -X POST http://localhost:5002/api/v1/billing/customer/get-or-create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "invalid-format",
    "email": "test@example.com",
    "name": "Test User"
  }'

# Should return validation error with details
```

## Performance Testing

### 1. Concurrent Request Testing

```javascript
// Test concurrent requests with different idempotency keys
const promises = [];
for (let i = 0; i < 10; i++) {
  promises.push(
    createSubscription(
      {
        customerId: `cus_test${i}`,
        priceId: 'price_test123',
      },
      `concurrent-key-${i}`
    )
  );
}

const results = await Promise.all(promises);
// All should succeed without conflicts
```

### 2. Webhook Processing Speed

```bash
# Monitor webhook processing time
stripe listen --forward-to localhost:5002/api/v1/stripe/webhook \
  --print-json | jq '.processing_time_ms'
```

## Monitoring and Debugging

### 1. Check Stripe Logs

```bash
# View recent API requests
stripe logs tail

# Filter by request path
stripe logs tail --filter-request-path=/v1/invoices
```

### 2. Database Queries for Debugging

```sql
-- Find failed payments
SELECT * FROM invoices
WHERE status IN ('payment_failed', 'past_due')
ORDER BY created_at DESC;

-- Check subscription states
SELECT * FROM subscriptions
WHERE status != 'active'
ORDER BY updated_at DESC;

-- Analyze webhook processing times
SELECT
  type,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at)))) as avg_processing_time
FROM billing_events
GROUP BY type;
```

## Best Practices

1. **Always Use Test Mode** for development and testing
2. **Test Idempotency** for all payment operations
3. **Simulate Failures** using Stripe test cards
4. **Monitor Webhook Delivery** in Stripe Dashboard
5. **Clean Test Data** regularly to avoid confusion
6. **Document Test Scenarios** for team reference

## Common Testing Patterns

### 1. End-to-End Subscription Flow

```bash
# Complete subscription lifecycle test
./test-subscription-flow.sh

#!/bin/bash
# test-subscription-flow.sh

# 1. Create customer
CUSTOMER=$(stripe customers create \
  --email="e2e-test@example.com" \
  --metadata="patientId=P9999" \
  -d)
CUSTOMER_ID=$(echo $CUSTOMER | jq -r '.id')

# 2. Add payment method
PM=$(stripe payment_methods attach pm_card_visa \
  --customer=$CUSTOMER_ID)

stripe customers update $CUSTOMER_ID \
  --invoice-settings="default_payment_method=pm_card_visa"

# 3. Create subscription
SUB=$(stripe subscriptions create \
  --customer=$CUSTOMER_ID \
  --items="price=$PRICE_ID" \
  --metadata="test=e2e")
SUB_ID=$(echo $SUB | jq -r '.id')

# 4. Verify webhook received
sleep 5
curl -s http://localhost:5002/api/v1/billing/reports/subscriptions \
  -H "Authorization: Bearer $TOKEN" | jq '.data.subscriptions[] | select(.id == "'$SUB_ID'")'

# 5. Cancel subscription
stripe subscriptions cancel $SUB_ID
```

### 2. Webhook Event Testing

```javascript
// test-webhooks.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function simulateWebhookSequence() {
  // Create test data
  const customer = await stripe.customers.create({
    email: 'webhook-test@example.com',
    metadata: { patientId: 'P8888' },
  });

  // Attach payment method
  const paymentMethod = await stripe.paymentMethods.create({
    type: 'card',
    card: { token: 'tok_visa' },
  });

  await stripe.paymentMethods.attach(paymentMethod.id, {
    customer: customer.id,
  });

  // Create subscription (triggers multiple webhooks)
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: process.env.STRIPE_PRICE_ID_DEFAULT }],
    default_payment_method: paymentMethod.id,
  });

  console.log('Created subscription:', subscription.id);
  console.log('Expected webhooks:');
  console.log('- customer.created');
  console.log('- payment_method.attached');
  console.log('- customer.subscription.created');
  console.log('- invoice.created');
  console.log('- invoice.finalized');
  console.log('- invoice.paid');
  console.log('- payment_intent.succeeded');
}

simulateWebhookSequence();
```

### 3. Dunning Simulation

```bash
# Simulate dunning process with test clock
CLOCK_ID=$(stripe test_clocks create --name="Dunning Test" | jq -r '.id')

# Customer with card that will fail on renewal
CUSTOMER_ID=$(stripe customers create \
  --test-clock=$CLOCK_ID \
  --email="dunning@test.com" \
  --payment-method="pm_card_visa" \
  --invoice-settings="default_payment_method=pm_card_visa" | jq -r '.id')

# Create subscription
SUB_ID=$(stripe subscriptions create \
  --customer=$CUSTOMER_ID \
  --items="price=price_monthly" | jq -r '.id')

# Advance to first successful payment
stripe test_clocks advance $CLOCK_ID \
  --frozen-time="$(date -u +%s -d '+1 hour')"

# Update to failing card
stripe customers update $CUSTOMER_ID \
  --invoice-settings="default_payment_method=pm_card_chargeDeclinedInsufficientFunds"

# Advance to renewal (payment will fail)
stripe test_clocks advance $CLOCK_ID \
  --frozen-time="$(date -u +%s -d '+1 month')"

# Check dunning status
stripe invoices list --customer=$CUSTOMER_ID --status=past_due
```

## Troubleshooting

### Common Issues

1. **Webhook Signature Failure**

   ```bash
   # Debug webhook signature
   stripe listen --forward-to localhost:5002/api/v1/stripe/webhook --print-json

   # Common causes:
   # - Wrong webhook secret in .env
   # - Body parser middleware interfering
   # - Using test secret with live endpoint
   ```

2. **Idempotency Key Conflicts**

   ```bash
   # Test with unique key
   curl -X POST /api/v1/billing/invoice/create-and-pay \
     -H "Idempotency-Key: $(uuidgen)" \
     -d '{"customerId": "cus_xxx", "items": [...]}'
   ```

3. **Test Mode vs Live Mode**

   ```bash
   # Verify mode
   stripe config --list | grep "test_mode"

   # Switch modes
   stripe config --set test_mode_api_key=$STRIPE_TEST_KEY
   stripe config --set live_mode_api_key=$STRIPE_LIVE_KEY
   ```

4. **Test Clock Limitations**
   - Maximum 5 test clocks per account
   - Cannot advance more than 2 years
   - Some events may batch when advancing large periods

### Debug Commands

```bash
# List recent API requests
stripe logs tail --limit=20

# Filter by status
stripe logs tail --status=failed

# Search by request ID
stripe logs tail --request-id=req_xxx

# Monitor specific customer
stripe logs tail --source=cus_xxx

# Export webhook events
stripe events list --limit=100 > webhook-events.json
```

## Automated Testing Script

```bash
#!/bin/bash
# run-stripe-tests.sh

echo "🧪 Starting Stripe Integration Tests"

# 1. Health check
echo "✓ Checking webhook endpoint..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:5002/api/v1/stripe/webhook

# 2. Test customer creation
echo "✓ Testing customer creation..."
RESULT=$(curl -s -X POST http://localhost:5002/api/v1/billing/customer/get-or-create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "P7777",
    "email": "test@example.com",
    "name": "Test User"
  }')

CUSTOMER_ID=$(echo $RESULT | jq -r '.data.customerId')
echo "  Created customer: $CUSTOMER_ID"

# 3. Test idempotency
echo "✓ Testing idempotency..."
KEY="test-$(date +%s)"
RESPONSE1=$(curl -s -X POST http://localhost:5002/api/v1/billing/invoice/create-and-pay \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"$CUSTOMER_ID\",
    \"items\": [{\"description\": \"Test\", \"amount\": 1000}]
  }")

RESPONSE2=$(curl -s -X POST http://localhost:5002/api/v1/billing/invoice/create-and-pay \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"$CUSTOMER_ID\",
    \"items\": [{\"description\": \"Test\", \"amount\": 1000}]
  }")

if [ "$(echo $RESPONSE1 | jq -r '.data.invoiceId')" = "$(echo $RESPONSE2 | jq -r '.data.invoiceId')" ]; then
  echo "  ✓ Idempotency working correctly"
else
  echo "  ✗ Idempotency test failed"
fi

echo "🎉 Tests complete"
```

## External Payment Mirroring Tests

### Test A: No Platform Invoice

This test verifies that external Stripe payments are correctly mirrored to EONPRO invoices.

```bash
# 1. Create a test patient with specific email
psql $DATABASE_URL -c "
INSERT INTO patients (patient_id, first_name, last_name, email, created_at)
VALUES ('P9001', 'Mirror', 'Test', 'test+mirror@example.com', NOW())
ON CONFLICT (patient_id) DO UPDATE
SET email = 'test+mirror@example.com';"

# 2. From Stripe Dashboard (Test mode):
# - Go to Payments > Create a payment
# - Create a Payment Link or direct charge:
#   - Amount: $50.00
#   - Email: test+mirror@example.com
#   - Description: "External Test Payment"
# - Complete the payment using test card 4242 4242 4242 4242

# 3. Observe webhook logs
tail -f webhook.log | grep -E "(payment_intent.succeeded|charge.succeeded|Mirror result)"

# Expected output:
# Processing payment_intent.succeeded event: evt_xxx
# Mirror result for charge ch_xxx: { action: 'created', invoiceId: 'in_xxx' }

# 4. Verify database records
psql $DATABASE_URL -c "
SELECT * FROM external_payment_mirrors
WHERE email = 'test+mirror@example.com'
ORDER BY created_at DESC LIMIT 1;"

# Expected: mode = 'created_invoice', matched_patient_id = 'P9001'

# 5. Verify Stripe invoice metadata
stripe invoices retrieve in_xxx | jq '.metadata'

# Expected:
# {
#   "platform": "EONPRO",
#   "mirrored_from_charge": "ch_xxx"
# }
```

### Test B: Already Has Stripe Invoice

This test ensures we don't create duplicate invoices when Stripe already has one.

```bash
# 1. Create a manual Stripe invoice in Dashboard
# - Customer: Use existing or create with email test+mirror@example.com
# - Add line item: "Manual Service" for $75.00
# - Finalize the invoice
# - Mark as paid manually or pay with test card

# 2. Observe webhook processing
# The system should detect the existing invoice and record it without duplication

# 3. Verify database
psql $DATABASE_URL -c "
SELECT charge_id, mode, created_invoice_id, note
FROM external_payment_mirrors
WHERE charge_id LIKE 'ch_%'
AND mode = 'imported_invoice'
ORDER BY created_at DESC LIMIT 1;"

# Expected: mode = 'imported_invoice', no created_invoice_id
```

### Test C: Unmatched Email

This test verifies handling of payments from unknown customers.

```bash
# 1. Create a Stripe payment with non-existent email
# From Stripe Dashboard:
# - Create payment with email: unknown@example.com
# - Amount: $25.00
# - Complete payment

# 2. Observe webhook logs
tail -f webhook.log | grep "no-match"

# 3. Verify database
psql $DATABASE_URL -c "
SELECT charge_id, mode, matched_patient_id, email
FROM external_payment_mirrors
WHERE email = 'unknown@example.com'
ORDER BY created_at DESC LIMIT 1;"

# Expected: mode = 'unmatched', matched_patient_id = NULL
```

### Test D: Idempotency Verification

This test ensures webhook events are processed exactly once.

```bash
# 1. Find a processed payment_intent.succeeded event
LAST_EVENT=$(psql $DATABASE_URL -t -c "
SELECT event_id FROM processed_events
WHERE event_id LIKE 'evt_%'
ORDER BY processed_at DESC LIMIT 1;" | xargs)

# 2. Re-send the same event using Stripe CLI
stripe events resend $LAST_EVENT

# 3. Check logs for skip message
tail -f webhook.log | grep "already processed"

# 4. Verify no duplicate in processed_events
psql $DATABASE_URL -c "
SELECT event_id, COUNT(*)
FROM processed_events
WHERE event_id = '$LAST_EVENT'
GROUP BY event_id;"

# Expected: COUNT = 1 (no duplicates)
```

## SQL Inspection Queries

### External Payment Mirrors Table

```sql
-- View recent mirroring activity
SELECT
  charge_id,
  mode,
  matched_patient_id,
  created_invoice_id,
  amount::decimal/100 as amount_dollars,
  currency,
  email,
  created_at
FROM external_payment_mirrors
ORDER BY created_at DESC
LIMIT 10;

-- Summary by mode
SELECT
  mode,
  COUNT(*) as count,
  SUM(amount)::decimal/100 as total_amount
FROM external_payment_mirrors
GROUP BY mode
ORDER BY count DESC;

-- Find all successfully mirrored payments for a patient
SELECT
  epm.*,
  p.first_name || ' ' || p.last_name as patient_name
FROM external_payment_mirrors epm
JOIN patients p ON p.patient_id = epm.matched_patient_id
WHERE epm.mode = 'created_invoice'
AND p.patient_id = 'P9001'
ORDER BY epm.created_at DESC;
```

### Processed Events Table

```sql
-- Check for duplicate event processing
SELECT
  event_id,
  COUNT(*) as process_count,
  MIN(processed_at) as first_processed,
  MAX(processed_at) as last_processed
FROM processed_events
GROUP BY event_id
HAVING COUNT(*) > 1;

-- Recent webhook activity
SELECT
  pe.event_id,
  pe.processed_at,
  be.type as event_type,
  be.payload->>'created' as event_created
FROM processed_events pe
LEFT JOIN billing_events be ON be.event_id = pe.event_id
ORDER BY pe.processed_at DESC
LIMIT 20;

-- Processing time analysis
SELECT
  DATE(processed_at) as process_date,
  COUNT(*) as events_processed,
  AVG(EXTRACT(EPOCH FROM (processed_at - (payload->>'created')::timestamp))) as avg_delay_seconds
FROM processed_events pe
JOIN billing_events be ON be.event_id = pe.event_id
WHERE processed_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(processed_at)
ORDER BY process_date DESC;
```

## Troubleshooting External Payment Mirroring

### Common Issues

1. **Payment not mirrored**
   - Check if charge has `metadata.platform = 'EONPRO'`
   - Verify email exists in patients table
   - Check webhook logs for errors

2. **Duplicate invoices created**
   - Verify idempotency keys are working
   - Check `processed_events` for duplicates
   - Ensure webhook endpoint returns 200 quickly

3. **Wrong patient matched**
   - Check for duplicate emails in patients table
   - Verify email normalization (lowercase, trimmed)

### Debug Commands

```bash
# Monitor real-time mirroring
watch -n 5 "psql $DATABASE_URL -c \"
SELECT charge_id, mode, created_at
FROM external_payment_mirrors
ORDER BY created_at DESC LIMIT 5;\""

# Check for stuck payments
psql $DATABASE_URL -c "
SELECT * FROM external_payment_mirrors
WHERE mode = 'failed'
AND created_at > NOW() - INTERVAL '24 hours';"

# Verify notification logs
grep "BILLING NOTIFICATION" app.log | tail -20
```

## Mirroring External Payments → Invoices (Paid Out of Band)

This feature automatically creates EONPRO invoices for external Stripe payments that don't originate from the EONPRO platform, ensuring all payments are tracked in the local system.

### Overview

When a payment is made directly in Stripe (e.g., via Payment Links, Stripe Dashboard, or other integrations), the webhook handler:
1. Detects it's not a platform-originated payment
2. Matches the customer to a patient by email
3. Creates a corresponding EONPRO invoice marked as "paid out-of-band"
4. Records the operation in the `external_payment_mirrors` table

### Testing via Stripe CLI

#### 1. Create Test Patient
```bash
# First, ensure you have a test patient in your database
psql $DATABASE_URL -c "
INSERT INTO patients (patient_id, first_name, last_name, email) 
VALUES ('P9001', 'External', 'Test', 'external.test@example.com')
ON CONFLICT (patient_id) DO UPDATE SET email = 'external.test@example.com';"
```

#### 2. Create External Payment via CLI
```bash
# Create a Stripe customer
CUSTOMER_ID=$(stripe customers create \
  --email="external.test@example.com" \
  --name="External Test" | jq -r '.id')

# Create a payment intent (no invoice)
stripe payment_intents create \
  --amount=5000 \
  --currency=usd \
  --customer="$CUSTOMER_ID" \
  --confirm \
  --payment-method="pm_card_visa" \
  --description="External payment test"
```

#### 3. Verify Webhook Processing
```bash
# Check webhook logs
tail -f webhook.log | grep -E "Mirror result|external.test@example.com"

# Check database
psql $DATABASE_URL -c "
SELECT * FROM external_payment_mirrors 
WHERE email = 'external.test@example.com' 
ORDER BY created_at DESC LIMIT 1;"
```

### Testing via Stripe Dashboard

#### 1. Create Payment Link
1. Go to Stripe Dashboard (Test mode)
2. Navigate to Payment Links
3. Create a new payment link:
   - Product: "One-time service"
   - Amount: $50.00
   - Collect email: Yes
4. Open the payment link
5. Enter email: `external.test@example.com`
6. Pay with test card: `4242 4242 4242 4242`

#### 2. Create Direct Payment
1. Go to Payments > Create
2. Enter details:
   - Amount: $75.00
   - Customer email: `external.test@example.com`
   - Description: "Manual payment test"
3. Process payment

#### 3. Verify in Database
```sql
-- Check external_payment_mirrors table
SELECT 
  charge_id,
  mode,
  matched_patient_id,
  created_invoice_id,
  amount::decimal/100 as amount_dollars,
  email,
  created_at
FROM external_payment_mirrors
WHERE email = 'external.test@example.com'
ORDER BY created_at DESC;

-- Check created invoices
SELECT 
  i.invoice_number,
  i.stripe_invoice_id,
  i.total_amount::decimal/100 as amount_dollars,
  i.status,
  i.payment_date
FROM invoices i
JOIN external_payment_mirrors epm ON epm.created_invoice_id = i.stripe_invoice_id
WHERE epm.email = 'external.test@example.com';
```

### Understanding Mirror Modes

The `external_payment_mirrors.mode` field indicates how the payment was processed:

| Mode | Description |
|------|-------------|
| `created_invoice` | New EONPRO invoice created and marked paid |
| `imported_invoice` | Existing Stripe invoice recorded, no duplicate created |
| `unmatched` | No patient found with the email address |
| `failed` | Error during processing (see note field) |

### Checking Billing Notifications

When an external payment is successfully mirrored, a notification is logged:

```bash
# View recent billing notifications
grep "BILLING NOTIFICATION" app.log | grep "external_payment_mirrored" | tail -10

# Example output:
# === BILLING NOTIFICATION ===
# Type: external_payment_mirrored
# Patient ID: P9001
# Email: external.test@example.com
# Amount: 50.00 USD
# Mirrored Charge ID: ch_3PxxxxxxxxxxxxXXXX
# Created Invoice ID: in_1PxxxxxxxxxxxxXXXX
# Stripe Invoice URL: https://dashboard.stripe.com/invoices/in_1PxxxxxxxxxxxxXXXX
```

### Troubleshooting

#### Payment Not Mirrored
1. Check if charge has platform metadata:
   ```bash
   stripe charges retrieve ch_xxx | jq '.metadata'
   ```
   If `platform: "EONPRO"` exists, it won't be mirrored.

2. Verify patient exists with matching email:
   ```sql
   SELECT patient_id, email FROM patients 
   WHERE LOWER(email) = LOWER('test@example.com');
   ```

3. Check webhook processing:
   ```sql
   SELECT * FROM processed_events 
   WHERE event_id LIKE 'evt_%' 
   ORDER BY processed_at DESC LIMIT 10;
   ```

#### Testing Idempotency
```bash
# Get a recent event ID
EVENT_ID=$(stripe events list --limit 1 | jq -r '.data[0].id')

# Resend the same event
stripe events resend $EVENT_ID

# Verify no duplicate processing
psql $DATABASE_URL -c "
SELECT event_id, COUNT(*) as count 
FROM processed_events 
WHERE event_id = '$EVENT_ID' 
GROUP BY event_id;"
```

### Cleanup Test Data
```bash
# Remove test payment mirrors
psql $DATABASE_URL -c "
DELETE FROM external_payment_mirrors 
WHERE email LIKE '%test@example.com';"

# Remove test patient
psql $DATABASE_URL -c "
DELETE FROM patients WHERE patient_id = 'P9001';"
```
