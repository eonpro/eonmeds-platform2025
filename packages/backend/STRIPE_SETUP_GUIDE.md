# Stripe Payment Processing Setup Guide

## Quick Start - Test Mode

To start processing payments immediately in TEST MODE:

1. **Add these to your backend `.env` file:**
```bash
# Stripe Test Keys (Safe for development)
STRIPE_SECRET_KEY=sk_test_51Q5iGvRu7nEonXXXDummyKeyForTesting
STRIPE_PUBLISHABLE_KEY=pk_test_51Q5iGvRu7nEonXXXDummyKeyForTesting
STRIPE_WEBHOOK_SECRET=whsec_TestWebhookSecretForDevelopment
```

2. **Add to your frontend `.env` file:**
```bash
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_51Q5iGvRu7nEonXXXDummyKeyForTesting
```

3. **Restart your servers**

## Real Stripe Account Setup

### Step 1: Create Stripe Account
1. Go to https://stripe.com
2. Click "Start now" 
3. Create your account
4. Verify your email

### Step 2: Get Your API Keys
1. Login to Stripe Dashboard: https://dashboard.stripe.com
2. Look for "Developers" in the left menu
3. Click on "API keys"
4. You'll see:
   - **Publishable key**: `pk_test_...` (safe to use in frontend)
   - **Secret key**: `sk_test_...` (BACKEND ONLY - keep secret!)

### Step 3: Update Environment Variables

#### Backend (.env):
```bash
# Replace with your actual keys from Stripe Dashboard
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY
```

#### Frontend (.env):
```bash
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY
```

### Step 4: Set Up Webhooks (Optional but Recommended)
1. In Stripe Dashboard, go to "Developers" → "Webhooks"
2. Click "Add endpoint"
3. Add your endpoint URL:
   - Local: Use ngrok or similar tunnel
   - Production: `https://your-app.railway.app/api/v1/payments/webhook/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
5. Copy the webhook secret (starts with `whsec_`)
6. Add to backend .env:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
   ```

## Test Cards for Development

When in test mode, use these card numbers:

| Card Type | Number | CVC | Date |
|-----------|--------|-----|------|
| Success | 4242 4242 4242 4242 | Any 3 digits | Any future date |
| Decline | 4000 0000 0000 0002 | Any 3 digits | Any future date |
| Authentication Required | 4000 0025 0000 3155 | Any 3 digits | Any future date |

## Railway Deployment

### Add Environment Variables in Railway:

1. Go to your Railway project
2. Click on your backend service
3. Go to "Variables" tab
4. Add:
   ```
   STRIPE_SECRET_KEY=sk_test_YOUR_KEY
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
   ```

5. For frontend service, add:
   ```
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
   ```

## Verify Setup

After adding the keys and restarting:

1. Backend logs should show:
   ```
   ✅ Stripe configured successfully
   ```
   Instead of:
   ```
   ⚠️ Stripe API key not configured
   ```

2. Test a payment:
   - Create an invoice
   - Click "Charge"
   - Use test card 4242 4242 4242 4242
   - Payment should process successfully

## Going Live

When ready for real payments:

1. Complete Stripe account activation (business details, bank account)
2. Replace all `sk_test_` and `pk_test_` keys with `sk_live_` and `pk_live_` keys
3. Update webhook endpoint to use live endpoint
4. Test with a real card (small amount)

## Security Notes

- **NEVER** commit API keys to Git
- **NEVER** use secret keys in frontend
- Always use environment variables
- Rotate keys if compromised

## Support

- Stripe Documentation: https://stripe.com/docs
- Test your integration: https://stripe.com/docs/testing
- Stripe Support: https://support.stripe.com 