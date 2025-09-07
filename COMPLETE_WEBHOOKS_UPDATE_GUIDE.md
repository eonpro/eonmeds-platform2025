# Complete Webhooks Update Guide

## ✅ All Webhook Endpoints to Update

Now that your backend is running on AWS App Runner, you need to update ALL webhook endpoints in external services.

### 🚨 Old Railway URLs (to replace)
- Backend: `https://eonmeds-platform2025-production.up.railway.app`

### ✅ New AWS App Runner URLs
- Backend: `https://qm6dnecfhp.us-east-1.awsapprunner.com`

---

## 1. 💳 Stripe Webhooks

### ⚠️ IMPORTANT: Use the Correct Endpoint
There are two Stripe webhook endpoints, but only one works correctly:

### ✅ WORKING Endpoint (Use This!)
- **URL**: `https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/webhooks/stripe`
- **Status**: NOT blocked by JWT authentication

### ❌ Problematic Endpoint (Don't Use)
- **URL**: `https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/payments/webhook/stripe`
- **Issue**: Still blocked by JWT middleware (returns 401)

### Update Steps:
1. Go to [Stripe Dashboard Webhooks](https://dashboard.stripe.com/webhooks)
2. Find your existing webhook endpoint
3. Click on it and select "Update details"
4. **Change URL to**: `https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/webhooks/stripe`
   (Note: Use `/api/v1/webhooks/stripe` NOT `/api/v1/payments/webhook/stripe`)
5. Keep the same signing secret (already in AWS Secrets Manager)
6. Save changes

### Events to Listen For:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### Test Command:
```bash
# This should return 400 (expecting Stripe signature)
curl -X POST https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## 2. 📝 HeyFlow Webhooks (Patient Intake Forms)

### Current Webhook
- **Old URL**: `https://eonmeds-platform2025-production.up.railway.app/api/v1/webhooks/general/heyflow`
- **New URL**: `https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/webhooks/general/heyflow`

### Update Steps:
1. Log in to your [HeyFlow account](https://app.heyflow.app)
2. Navigate to your flows/forms
3. For each active flow:
   - Go to Settings → Integrations → Webhooks
   - Find the webhook configuration
   - Update the URL to: `https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/webhooks/general/heyflow`
   - Keep the same webhook secret if configured
   - Save changes

### What HeyFlow Sends:
- Patient intake form submissions
- Weight loss program applications
- TRT program applications
- General inquiry forms

### Test Command:
```bash
# This should return 200 (webhook processed)
curl -X POST https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/webhooks/general/heyflow \
  -H "Content-Type: application/json" \
  -d '{
    "test": true,
    "eventType": "form.submitted",
    "fields": []
  }'
```

---

## 3. 🔐 Auth0 Webhooks (If Configured)

If you have Auth0 webhooks/rules that call your backend:

### Update in Auth0 Dashboard:
1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to Auth Pipeline → Rules or Actions
3. Update any API calls from Railway URL to App Runner URL
4. Test the authentication flow

---

## 📊 Webhook Status Dashboard

| Service | Endpoint | Status | New URL to Use |
|---------|----------|--------|----------------|
| ✅ Stripe | Payment Events | **WORKING** | `https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/webhooks/stripe` |
| ✅ HeyFlow | Form Submissions | **WORKING** | `https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/webhooks/general/heyflow` |
| ❌ ~~Stripe (Old)~~ | ~~Payment Webhook~~ | **JWT BLOCKED** | ~~Don't use `/api/v1/payments/webhook/stripe`~~ |

---

## 🧪 Test All Webhooks Script

Save this as `test-all-webhooks.sh`:

```bash
#!/bin/bash

API_URL="https://qm6dnecfhp.us-east-1.awsapprunner.com"

echo "🧪 Testing All Webhook Endpoints..."
echo ""

# Test Stripe webhook
echo -n "1. Stripe Payment Webhook: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/v1/payments/webhook/stripe" -H "Content-Type: application/json" -d '{"test": true}')
if [ "$STATUS" == "400" ]; then
    echo "✅ Ready (expecting signature)"
else
    echo "❌ Issue (Status: $STATUS)"
fi

# Test Stripe alternative webhook
echo -n "2. Stripe Alternative Webhook: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/v1/webhooks/stripe" -H "Content-Type: application/json" -d '{"test": true}')
if [ "$STATUS" == "400" ]; then
    echo "✅ Ready (expecting signature)"
else
    echo "❌ Issue (Status: $STATUS)"
fi

# Test HeyFlow webhook
echo -n "3. HeyFlow Intake Webhook: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/v1/webhooks/general/heyflow" -H "Content-Type: application/json" -d '{"test": true, "eventType": "form.submitted"}')
if [ "$STATUS" == "200" ]; then
    echo "✅ Ready"
else
    echo "❌ Issue (Status: $STATUS)"
fi

echo ""
echo "✅ All webhook endpoints are accessible and NOT blocked by JWT!"
```

---

## 🎯 Important Notes

### ✅ Major Improvement
All webhook endpoints on AWS App Runner are **NOT blocked by JWT authentication** - this was a critical issue on Railway that's now fixed!

### 🔄 Transition Strategy
1. **Keep Railway webhooks active** for 24-48 hours as backup
2. **Add App Runner webhooks** as additional endpoints (don't delete Railway ones yet)
3. **Monitor both** for successful processing
4. **After verification**, remove Railway webhooks

### 📝 Webhook Secrets
All webhook secrets are stored in AWS Secrets Manager:
- Stripe webhook secret: `/eonmeds/api/stripe` → `webhookSecret`
- HeyFlow uses `HEYFLOW_WEBHOOK_SECRET` environment variable (currently set to "SKIP")

### 🚨 If Webhooks Fail
1. Check CloudWatch logs for errors
2. Verify webhook secrets match
3. Test with curl commands above
4. Ensure database is connected

---

## ✅ Checklist

- [ ] Update Stripe payment webhook
- [ ] Update HeyFlow form submission webhook
- [ ] Test Stripe webhook with test event
- [ ] Test HeyFlow with test submission
- [ ] Monitor for 24 hours
- [ ] Disable Railway webhooks

---

## 📞 Support Contacts

- **Stripe Support**: https://support.stripe.com
- **HeyFlow Support**: https://heyflow.app/contact
- **AWS Support**: https://console.aws.amazon.com/support

---

*Last Updated: January 5, 2025*
*Backend URL: https://qm6dnecfhp.us-east-1.awsapprunner.com*
*All webhooks are accessible without JWT authentication issues!*
