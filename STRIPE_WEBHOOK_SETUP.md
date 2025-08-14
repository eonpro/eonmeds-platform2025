# Stripe Webhook Setup Guide

## Working Webhook Endpoint

The production Stripe webhook endpoint is:
```
https://eonmeds-platform2025-production.up.railway.app/api/v1/payments/webhook/stripe
```

## Manual Configuration Steps

1. **Log in to Stripe Dashboard**
   - Go to https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"

2. **Configure Endpoint**
   - **Endpoint URL**: `https://eonmeds-platform2025-production.up.railway.app/api/v1/payments/webhook/stripe`
   - **Events to send**: Select the following events:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.succeeded`
     - `charge.failed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `invoice.created`
     - `invoice.updated`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

3. **Get Webhook Signing Secret**
   - After creating the endpoint, click on it
   - Click "Reveal" under "Signing secret"
   - Copy the secret (starts with `whsec_`)

4. **Update Railway Environment**
   ```bash
   railway variables --set "STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE"
   ```

5. **Deploy Changes**
   - Railway will automatically redeploy when you update the variable

## Testing the Webhook

1. **Use Stripe CLI for local testing**:
   ```bash
   stripe listen --forward-to https://eonmeds-platform2025-production.up.railway.app/api/v1/payments/webhook/stripe
   ```

2. **Trigger test events**:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

3. **Check Railway logs**:
   ```bash
   railway logs
   ```

## Webhook Endpoint Details

- **Location**: Registered directly in `packages/backend/src/index.ts`
- **Handler**: `packages/backend/src/controllers/stripe-webhook.controller.ts`
- **Signature Verification**: Required (uses `stripe-signature` header)
- **Content Type**: Must be `application/json` with raw body

## Common Issues

1. **404 Not Found**: Use the exact URL above, other webhook paths may not be properly registered
2. **Signature Error**: Ensure `STRIPE_WEBHOOK_SECRET` is set correctly in Railway
3. **No Events**: Check that events are enabled in Stripe dashboard
