# Stripe Setup Guide for EONMeds

This guide walks you through setting up Stripe for the EONMeds platform, including products, prices, webhooks, and testing.

## 1. Initial Setup

### Create Your Stripe Account
1. Go to https://dashboard.stripe.com/register
2. Complete the account setup
3. Start in **Test Mode** (toggle in the dashboard)

### Get Your API Keys
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your keys:
   - **Publishable key**: `pk_test_...` (for frontend)
   - **Secret key**: `sk_test_...` (for backend)

### Add to Your .env File
```bash
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

## 2. Create Products and Prices

### Weight Loss Program - Monthly
1. Go to https://dashboard.stripe.com/test/products
2. Click "Add product"
3. Fill in:
   - **Name**: Weight Loss Program - Monthly
   - **Description**: Monthly subscription for EONMeds weight loss program
   - **Image**: Upload your product image
4. Click "Save product"
5. Add pricing:
   - **Price**: $299.00 (or your price)
   - **Billing period**: Monthly
   - Click "Save"
6. Copy the Price ID (starts with `price_`)

### Weight Loss Program - Quarterly
1. Create another product: "Weight Loss Program - Quarterly"
2. Add pricing:
   - **Price**: $799.00 (e.g., discounted for 3 months)
   - **Billing period**: Every 3 months
3. Copy the Price ID

### Testosterone Program - Monthly
1. Create product: "Testosterone Therapy - Monthly"
2. Add pricing: $349.00 monthly
3. Copy the Price ID

### Testosterone Program - Quarterly
1. Create product: "Testosterone Therapy - Quarterly"
2. Add pricing: $949.00 every 3 months
3. Copy the Price ID

### Update Your .env File
```bash
# Weight Loss Pricing
STRIPE_PRICE_WEIGHT_LOSS_MONTHLY=price_1234567890abcdef
STRIPE_PRICE_WEIGHT_LOSS_QUARTERLY=price_0987654321fedcba

# Testosterone Pricing
STRIPE_PRICE_TESTOSTERONE_MONTHLY=price_abcdef1234567890
STRIPE_PRICE_TESTOSTERONE_QUARTERLY=price_fedcba0987654321
```

## 3. Configure Webhooks

### Create Webhook Endpoint
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Enter your endpoint URL:
   - **Production**: `https://your-railway-app.up.railway.app/api/v1/payments/webhook/stripe`
   - **Local Testing**: Use ngrok (see below)
4. Select events to listen for:
   - `customer.created`
   - `customer.updated`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.created`
   - `invoice.finalized`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)

### Add Webhook Secret to .env
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## 4. Testing Locally with ngrok

### Install ngrok
```bash
# Mac
brew install ngrok

# Or download from https://ngrok.com/download
```

### Run Your Backend
```bash
cd packages/backend
npm run dev
```

### Start ngrok
```bash
ngrok http 3000
```

### Update Webhook URL
1. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
2. Update webhook endpoint in Stripe dashboard
3. URL: `https://abc123.ngrok.io/api/v1/payments/webhook/stripe`

## 5. Test Cards

Use these test cards in development:

### Successful Payment
- **Number**: 4242 4242 4242 4242
- **Expiry**: Any future date
- **CVC**: Any 3 digits
- **ZIP**: Any 5 digits

### Payment Requires Authentication
- **Number**: 4000 0025 0000 3155

### Payment Fails
- **Number**: 4000 0000 0000 9995

## 6. Testing the Integration

### Test Customer Creation
```bash
curl -X POST http://localhost:3000/api/v1/payments/customers/create \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"patient_id": "P007001"}'
```

### Test Subscription Creation
```bash
curl -X POST http://localhost:3000/api/v1/payments/subscriptions/create \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "P007001",
    "price_id": "price_1234567890abcdef",
    "payment_method_id": "pm_card_visa"
  }'
```

### Test Webhook
Use Stripe CLI:
```bash
stripe trigger payment_intent.succeeded
```

## 7. Database Setup

Run the invoice schema migration:
```bash
psql -h your-rds-host -U your-user -d your-db -f packages/backend/src/config/invoice-schema.sql
```

Add Stripe fields to patients table:
```sql
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP;
```

## 8. Going Live

When ready for production:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Get Live API Keys** (start with `sk_live_` and `pk_live_`)
3. **Update Railway Environment Variables** with live keys
4. **Create Live Products** (repeat product setup in live mode)
5. **Update Webhook Endpoint** with production URL
6. **Test with Real Card** (small amount first)

## 9. Monitoring

### Stripe Dashboard
- Monitor payments: https://dashboard.stripe.com/payments
- Check subscriptions: https://dashboard.stripe.com/subscriptions
- Review invoices: https://dashboard.stripe.com/invoices

### Logs
- Webhook logs: https://dashboard.stripe.com/webhooks/[endpoint_id]/logs
- API logs: https://dashboard.stripe.com/logs

## 10. Common Issues

### Webhook Signature Verification Failed
- Ensure you're using the raw request body
- Check that the webhook secret is correct
- Verify the endpoint URL matches

### Customer Not Found
- Make sure patient has `stripe_customer_id` in database
- Check if customer exists in correct mode (test/live)

### Subscription Creation Failed
- Verify price ID is correct
- Ensure customer has a valid payment method
- Check for sufficient permissions

## Support

- Stripe Documentation: https://stripe.com/docs
- API Reference: https://stripe.com/docs/api
- Support: https://support.stripe.com 