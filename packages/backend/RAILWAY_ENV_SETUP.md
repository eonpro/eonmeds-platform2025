# Railway Environment Variables Setup for Stripe

## Required Environment Variables

Add these to your Railway dashboard under the Backend service:

### Stripe Configuration (REQUIRED)
```bash
# Live Stripe Keys
STRIPE_SECRET_KEY=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
STRIPE_WEBHOOK_SECRET=whsec_3l3mCp3g2kd50an0PpgQJuBqUfNKGGYv
STRIPE_PUBLISHABLE_KEY=pk_live_51RPS5NGzKhM7cZeGlOITW4CImzbMEldvaRbrBQV894nLYUjnSM7rNKTpzeYVZJVOhCbNxmOvOjnR7RN60XdAHvJ100Ksh6ziwy

# Optional Stripe Settings
STRIPE_TRIAL_DAYS=0
INVOICE_DUE_DAYS=30
```

### Database Configuration (Already Set)
```bash
DATABASE_URL=postgresql://username:password@host:port/database
DATABASE_SSL=true
```

### Auth0 Configuration (Already Set)
```bash
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=your-api-identifier
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
```

### Other Required Variables
```bash
JWT_SECRET=your-jwt-secret
NODE_ENV=production
PORT=3002
```

## Setting Variables in Railway

1. Go to your Railway dashboard
2. Select your backend service
3. Go to "Variables" tab
4. Click "Add Variable"
5. Add each variable above

## Webhook Configuration in Stripe Dashboard

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Endpoint URL: `https://eonmeds-platform2025-production.up.railway.app/api/v1/payments/webhook/stripe`
4. Select events to listen to:
   - `charge.succeeded`
   - `checkout.session.completed`
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

5. After creating, copy the "Signing secret" and update `STRIPE_WEBHOOK_SECRET` in Railway

## Testing the Webhook

Once deployed, you can test with Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your account
stripe login

# Forward webhooks to your local server (for local testing)
stripe listen --forward-to https://eonmeds-platform2025-production.up.railway.app/api/v1/payments/webhook/stripe

# Trigger a test event
stripe trigger payment_intent.succeeded
```

## Troubleshooting

### Common Issues:

1. **"No stripe-signature header"**
   - Make sure you're using the correct webhook endpoint
   - Ensure Stripe is sending to the right URL

2. **"Unable to extract timestamp and signatures from header"**
   - Check that STRIPE_WEBHOOK_SECRET is set correctly
   - Make sure the webhook secret matches what's in Stripe dashboard

3. **Module not found errors**
   - All required files have been created
   - Push changes and wait for Railway to rebuild

4. **Payment failures**
   - Verify STRIPE_SECRET_KEY is the live key
   - Check that the key has proper permissions

## Verifying Setup

After deployment, check:
1. Railway logs show "✅ Stripe configuration loaded successfully"
2. Webhook endpoint responds with 200 OK
3. Test a payment to verify processing 