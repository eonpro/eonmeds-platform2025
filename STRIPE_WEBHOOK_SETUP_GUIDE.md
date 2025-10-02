# 🔗 Stripe Webhook Configuration Instructions

## Step 1: Access Stripe Dashboard
1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Log in with your Stripe account

## Step 2: Navigate to Webhooks
1. Click on **Developers** in the left sidebar
2. Click on **Webhooks**
3. Click **Add endpoint**

## Step 3: Configure Webhook Endpoint

### Endpoint URL
Enter your production API URL followed by the webhook path:
```
https://[YOUR-API-DOMAIN]/api/v1/webhooks/stripe
```

For Railway deployment, this would be something like:
```
https://eonmeds-platform2025-production.up.railway.app/api/v1/webhooks/stripe
```

### Events to Listen For
Select the following events (search for them in the event list):

**Payment Events:**
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`

**Customer Events:**
- ✅ `customer.created`
- ✅ `customer.updated`

**Payment Method Events:**
- ✅ `payment_method.attached`
- ✅ `payment_method.detached`

**Invoice Events (for future subscriptions):**
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`
- ✅ `invoice.created`
- ✅ `invoice.finalized`

## Step 4: Save and Get Signing Secret
1. Click **Add endpoint**
2. After creation, you'll see the webhook details
3. Click **Reveal** under "Signing secret"
4. Copy the signing secret (starts with `whsec_`)

## Step 5: Add Signing Secret to Environment
Add the webhook secret to your Railway environment variables:

1. Go to Railway Dashboard
2. Select your backend service
3. Go to Variables tab
4. Add:
```
STRIPE_WEBHOOK_SECRET=whsec_[your_secret_here]
```

## Step 6: Test the Webhook

### Using Stripe CLI (Local Testing)
```bash
# Install Stripe CLI if not already installed
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward events to local server
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe

# In another terminal, trigger a test event
stripe trigger payment_intent.succeeded
```

### Using Dashboard Test
1. In Stripe Dashboard → Webhooks
2. Click on your endpoint
3. Click **Send test webhook**
4. Select `payment_intent.succeeded`
5. Click **Send test webhook**

## Step 7: Verify Webhook is Working

### Check Railway Logs
```bash
railway logs | grep "webhook"
```

### Check Database
```sql
-- Check if webhook events are being recorded
SELECT * FROM stripe_webhook_events 
ORDER BY created_at DESC 
LIMIT 5;
```

## Webhook Security Features

Our implementation includes:
- ✅ **Signature Verification** - Validates all requests are from Stripe
- ✅ **Idempotency** - Prevents duplicate processing
- ✅ **Error Handling** - Gracefully handles failures
- ✅ **Logging** - Records all events for audit

## Troubleshooting

### Common Issues

**Issue: Webhook returns 400 "No signature found"**
- Solution: Ensure STRIPE_WEBHOOK_SECRET is set correctly

**Issue: Webhook returns 400 "Webhook Error"**
- Solution: Check that request body is raw (not parsed JSON)

**Issue: Events not showing in database**
- Solution: Check Railway logs for processing errors

**Issue: 404 Not Found**
- Solution: Verify endpoint URL is exactly: `/api/v1/webhooks/stripe`

## Testing Checklist

- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Signing secret added to environment variables
- [ ] Test event sent successfully
- [ ] Event appears in Railway logs
- [ ] Event recorded in database
- [ ] Invoice status updates on payment

## Important URLs

- **Stripe Dashboard**: https://dashboard.stripe.com/webhooks
- **Railway Logs**: https://railway.app/project/[your-project]/service/[backend-service]/logs
- **Test Webhook**: Use Stripe Dashboard to send test events

## Next Steps

After webhook is configured:
1. Process a test payment
2. Verify webhook receives the event
3. Check invoice is marked as paid
4. Monitor for any errors

---

**Note**: Always use test mode first before switching to live mode!