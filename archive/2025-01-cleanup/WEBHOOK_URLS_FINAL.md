# 🔄 Final Webhook URLs to Update

## ✅ YES - You Need to Update HeyFlow Too!

Both Stripe and HeyFlow webhooks need to be updated to point to your new AWS App Runner backend.

---

## 📋 Quick Copy-Paste URLs

### 1. Stripe Webhook
```
https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/webhooks/stripe
```
⚠️ **IMPORTANT**: Use `/api/v1/webhooks/stripe` NOT `/api/v1/payments/webhook/stripe`

### 2. HeyFlow Webhook
```
https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/webhooks/general/heyflow
```

---

## ✅ Verified Working Status

| Service | Endpoint | Test Result | JWT Issue? |
|---------|----------|-------------|------------|
| **Stripe** | `/api/v1/webhooks/stripe` | ✅ Returns 400 (expects signature) | **NO** - Fixed! |
| **HeyFlow** | `/api/v1/webhooks/general/heyflow` | ✅ Returns 200 (processes webhook) | **NO** - Fixed! |
| ~~Stripe (Old)~~ | ~~/api/v1/payments/webhook/stripe~~ | ❌ Returns 401 | **YES** - Still blocked |

---

## 🚀 Action Items

### 1️⃣ Update Stripe
1. Go to https://dashboard.stripe.com/webhooks
2. Edit your webhook endpoint
3. Change URL to: `https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/webhooks/stripe`
4. Save (keep same signing secret)

### 2️⃣ Update HeyFlow
1. Log in to https://app.heyflow.app
2. Go to each form's webhook settings
3. Change URL to: `https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/webhooks/general/heyflow`
4. Save (signature verification is currently skipped with HEYFLOW_WEBHOOK_SECRET=SKIP)

### 3️⃣ Test Both
```bash
# Test Stripe (should return 400)
curl -X POST https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/webhooks/stripe \
  -H "Content-Type: application/json" -d '{"test": true}'

# Test HeyFlow (should return 200)
curl -X POST https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/webhooks/general/heyflow \
  -H "Content-Type: application/json" -d '{"test": true, "eventType": "form.submitted"}'
```

---

## ✨ Benefits of the Migration

### Before (Railway):
- ❌ Stripe webhooks blocked by JWT (401 errors)
- ❌ Random deployment failures
- ❌ Webhook events lost due to auth issues

### After (AWS App Runner):
- ✅ All webhooks accessible without auth issues
- ✅ Reliable deployments
- ✅ Proper webhook route configuration
- ✅ CloudWatch logging for debugging

---

## 📝 Final Notes

- **Keep Railway webhooks active** for 24-48 hours as backup
- **Monitor both** environments during transition
- **Check CloudWatch logs** if any issues arise
- **Database is connected** and working on App Runner

Your webhook infrastructure is now properly configured on AWS! 🎉
