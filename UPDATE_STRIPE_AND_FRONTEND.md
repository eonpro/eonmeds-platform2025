# Update Stripe Webhook and Frontend Configuration

## 1. Update Stripe Webhook URL

### Go to Stripe Dashboard:
1. Visit https://dashboard.stripe.com/webhooks
2. Click on your existing webhook endpoint
3. Update the URL to: `https://eonmeds-backend-v2-production.up.railway.app/api/v1/webhooks/stripe`
4. Make sure these events are selected:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - `charge.failed`
   - `customer.created`
   - `customer.updated`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Update endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)
7. Update in Railway Variables: `STRIPE_WEBHOOK_SECRET=whsec_...`

## 2. Update Frontend API URL

### In your frontend code:
1. Find all references to the old backend URL
2. Replace with: `https://eonmeds-backend-v2-production.up.railway.app`

Common locations:
- `packages/frontend/src/config/services.ts`
- `.env` files
- Environment variables

### Update CORS in Railway:
Add to Railway Variables:
```
CORS_ORIGINS=https://your-frontend-url.com,http://localhost:3000,http://localhost:3001
```

## 3. Test Everything

### Test API Endpoints:
```bash
# Should return version info
curl https://eonmeds-backend-v2-production.up.railway.app/version

# Should return API info
curl https://eonmeds-backend-v2-production.up.railway.app/api/v1

# Should return tracking test
curl https://eonmeds-backend-v2-production.up.railway.app/api/v1/tracking/test
```

### Test Stripe Webhook:
Use Stripe CLI to send a test event:
```bash
stripe trigger payment_intent.succeeded
```

## 4. Update Any Other Services

If you have other services that call your API:
- n8n workflows
- Mobile apps
- Third-party integrations

Update them all to use the new URL: `https://eonmeds-backend-v2-production.up.railway.app`
