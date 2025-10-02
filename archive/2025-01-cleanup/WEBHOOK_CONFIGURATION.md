# Webhook Configuration Guide

## Stripe Webhook Endpoint

The correct Stripe webhook endpoint for this application is:

```
https://eonmeds-platform2025-production.up.railway.app/api/v1/webhooks/stripe
```

### Important Notes:

1. **Do NOT use**: `/api/v1/payments/webhook/stripe` (this endpoint doesn't exist)
2. **Use**: `/api/v1/webhooks/stripe`

### Setting up in Stripe Dashboard:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter the endpoint URL: `https://eonmeds-platform2025-production.up.railway.app/api/v1/webhooks/stripe`
4. Select the events you want to listen for:
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_method.attached`
   - `payment_method.detached`
   - `subscription.created`
   - `subscription.updated`
   - `subscription.deleted`
   - `charge.succeeded`
   - `charge.failed`

### Environment Variables:

Make sure to set the webhook signing secret in Railway:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

## HeyFlow Webhook Endpoint

The HeyFlow webhook endpoint is:
```
https://eonmeds-platform2025-production.up.railway.app/api/v1/webhooks/heyflow
```

## Testing Webhooks

You can test if webhooks are accessible:
```bash
curl https://eonmeds-platform2025-production.up.railway.app/api/v1/webhooks/test
```

This should return a response without requiring authentication.
