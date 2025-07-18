# Stripe Integration Setup Guide

## 1. Environment Variables

### Backend (.env)
Add these to your `packages/backend/.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

### Frontend (.env)
Add this to your `packages/frontend/.env` file:

```bash
# Stripe Publishable Key
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

## 2. Getting Your Stripe Keys

1. **Login to Stripe Dashboard**: https://dashboard.stripe.com
2. **Get API Keys**:
   - Go to Developers → API keys
   - Copy your test keys:
     - Publishable key (starts with `pk_test_`)
     - Secret key (starts with `sk_test_`)

3. **Set up Webhook** (for local testing):
   - Install Stripe CLI: https://stripe.com/docs/stripe-cli
   - Run: `stripe login`
   - Run: `stripe listen --forward-to localhost:3002/api/v1/payments/webhook/stripe`
   - Copy the webhook signing secret (starts with `whsec_`)

## 3. Testing the Integration

### Step 1: Test Customer Creation
```bash
curl -X POST http://localhost:3002/api/v1/payments/customers/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"patient_id": "P007001"}'
```

### Step 2: Test Invoice Charging
```bash
curl -X POST http://localhost:3002/api/v1/payments/invoices/INVOICE_ID/charge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"payment_method_id": "pm_card_visa"}'
```

### Step 3: Test Webhook
The Stripe CLI will show webhook events as they happen.

## 4. Production Setup

### Railway Environment Variables
1. Go to your Railway project
2. Click on your backend service
3. Go to Variables tab
4. Add:
   - `STRIPE_SECRET_KEY` (use live key for production)
   - `STRIPE_WEBHOOK_SECRET` (from Stripe dashboard webhook)

### Stripe Dashboard Webhook
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint:
   - URL: `https://your-railway-app.up.railway.app/api/v1/payments/webhook/stripe`
   - Events: Select `payment_intent.succeeded` and `payment_intent.failed`
3. Copy the signing secret and add to Railway as `STRIPE_WEBHOOK_SECRET`

## 5. Test Cards

For testing, use these Stripe test cards:
- Success: `4242 4242 4242 4242`
- Requires auth: `4000 0025 0000 3155`
- Declined: `4000 0000 0000 9995`

All test cards use:
- Any future expiry date
- Any 3-digit CVC
- Any 5-digit ZIP

## 6. Verifying Integration

1. Create an invoice in your platform
2. Click "Charge Invoice" 
3. Check Stripe Dashboard for the payment
4. Verify invoice is marked as paid
5. Check payments table in database 