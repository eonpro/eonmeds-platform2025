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

| Card Number | Brand | Description | Use Case |
|-------------|-------|-------------|----------|
| **Successful Payments** |
| 4242 4242 4242 4242 | Visa | Always succeeds | General testing |
| 5555 5555 5555 4444 | Mastercard | Always succeeds | Multi-brand testing |
| 3782 822463 10005 | Amex | Always succeeds | Amex-specific testing |
| 6011 1111 1111 1117 | Discover | Always succeeds | Discover testing |
| **3D Secure Authentication** |
| 4000 0027 6000 3184 | Visa | Requires authentication | 3DS flow testing |
| 4000 0025 0000 3155 | Visa | 3DS2 authentication required | 3DS2 testing |
| 4000 0082 6000 0000 | Visa | 3DS2 with browser flow | Full 3DS2 testing |
| **Declined Payments** |
| 4000 0000 0000 0002 | Visa | Generic decline | Decline handling |
| 4000 0000 0000 9995 | Visa | Insufficient funds | Specific decline reason |
| 4000 0000 0000 9987 | Visa | Lost card | Lost card handling |
| 4000 0000 0000 0069 | Visa | Expired card | Expiry handling |
| 4000 0000 0000 0127 | Visa | Incorrect CVC | CVC validation |
| 4000 0000 0000 0119 | Visa | Processing error | Processing errors |
| **Disputes & Fraud** |
| 4000 0000 0000 0259 | Visa | Dispute - fraudulent | Dispute testing |
| 4000 0000 0000 2685 | Visa | Dispute - not received | Dispute flow |
| 4000 0000 0000 1976 | Visa | High risk, blocked | Risk evaluation |

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
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customerId: 'cus_test123',
    items: [{ description: 'Test', amount: 1000 }]
  })
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
    const response1 = await createCustomer({
      patientId: 'P1001',
      email: 'test@example.com',
      name: 'Test User'
    }, idempotencyKey);
    
    // Second request with same key
    const response2 = await createCustomer({
      patientId: 'P1001',
      email: 'test@example.com',
      name: 'Test User'
    }, idempotencyKey);
    
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
      
      return await createInvoiceAndPay({
        customerId: 'cus_test123',
        items: [{ description: 'Test', amount: 1000 }]
      }, idempotencyKey);
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
    createSubscription({
      customerId: `cus_test${i}`,
      priceId: 'price_test123'
    }, `concurrent-key-${i}`)
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
    metadata: { patientId: 'P8888' }
  });

  // Attach payment method
  const paymentMethod = await stripe.paymentMethods.create({
    type: 'card',
    card: { token: 'tok_visa' }
  });

  await stripe.paymentMethods.attach(paymentMethod.id, {
    customer: customer.id
  });

  // Create subscription (triggers multiple webhooks)
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: process.env.STRIPE_PRICE_ID_DEFAULT }],
    default_payment_method: paymentMethod.id
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
