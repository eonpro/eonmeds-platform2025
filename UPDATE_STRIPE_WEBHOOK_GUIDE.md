# Update Stripe Webhook Guide

## Steps to Update Webhook in Stripe Dashboard

1. **Go to Stripe Dashboard**
   - https://dashboard.stripe.com/webhooks
   - Make sure you're in the correct account (Live mode)

2. **Find Your Webhook Endpoint**
   - Look for endpoint ending with `/api/v1/payments/webhook/stripe`
   - Click on it to edit

3. **Update the URL**
   - Change from: `https://eonmeds-platform2025-production.up.railway.app/api/v1/payments/webhook/stripe`
   - To: `https://YOUR-NEW-DEPLOYMENT-URL/api/v1/payments/webhook/stripe`

4. **Verify Events**
   - Ensure these events are selected:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.succeeded`
     - `charge.failed`
     - `customer.created`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `payment_method.attached`

5. **Get New Signing Secret** (Optional)
   - If you want extra security, click "Reveal" under Signing secret
   - Copy the new `whsec_...` value
   - Update `STRIPE_WEBHOOK_SECRET` in Railway with this new value

## Environment Variables to Update in Railway

```bash
# Required Updates
STRIPE_WEBHOOK_URL=https://YOUR-NEW-DEPLOYMENT-URL/api/v1/payments/webhook/stripe

# Optional (if frontend URL changed)
CORS_ORIGIN=https://eonmeds-frontend-production.up.railway.app,http://localhost:3000,http://localhost:3001

# Optional (if you regenerated the webhook signing secret)
STRIPE_WEBHOOK_SECRET=whsec_NEW_SECRET_HERE
```

## Testing the Webhook

After updating, test with Stripe CLI:
```bash
# Install Stripe CLI if needed
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Test webhook
stripe trigger payment_intent.succeeded
```

Or use the "Send test webhook" button in Stripe Dashboard.
