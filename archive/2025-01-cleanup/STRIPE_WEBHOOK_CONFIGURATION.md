# Stripe Webhook Configuration Guide

## 🔴 PREREQUISITE: Railway Must Deploy Latest Code First!

**Current Status:** Railway is NOT running the latest code (commit 88ad4c3)
- ❌ /version endpoint → 404
- ❌ /api/v1/tracking/test → 404

**Once Railway deploys the correct code, follow this guide.**

## ✅ Step 1: Verify Deployment

First, confirm Railway has deployed the latest code:

```bash
# Should return JSON with commit/buildId
curl -s https://eonmeds-backend-v2-production.up.railway.app/version | jq .

# Should return {ok: true, ts: ...}
curl -s https://eonmeds-backend-v2-production.up.railway.app/api/v1/tracking/test | jq .
```

## 📌 Step 2: Configure Stripe Dashboard

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set endpoint URL: `https://eonmeds-backend-v2-production.up.railway.app/api/v1/webhooks/stripe`
4. Select events to listen for (e.g., payment_intent.succeeded, customer.created, etc.)
5. Save and copy the webhook signing secret

## 🔐 Step 3: Add Webhook Secret to Railway

1. Go to Railway → Backend Service → Variables
2. Add: `STRIPE_WEBHOOK_SECRET=whsec_...` (your webhook signing secret)

## 🧪 Step 4: Test with Stripe CLI

```bash
# Install Stripe CLI if you haven't
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your Railway app
stripe listen --forward-to https://eonmeds-backend-v2-production.up.railway.app/api/v1/webhooks/stripe

# In another terminal, trigger a test event
stripe trigger payment_intent.succeeded
```

You should see:
- 200 OK in the Stripe CLI
- Event processed in your Railway logs

## 📝 Current Webhook Implementation

Your code already has webhook routes configured correctly:
- Primary: `/api/v1/webhooks/stripe` 
- Compatibility alias: `/api/v1/payments/webhook/stripe`

Both routes:
- ✅ Are mounted BEFORE body parsers
- ✅ Handle raw body internally in the router
- ✅ Are excluded from JWT authentication

## 🔧 Environment Variables to Add

Add these to Railway → Variables:

```env
# Strong encryption key for PHI data
PHI_ENCRYPTION_KEY=your-very-strong-32-character-key-here

# Force SSL (Railway handles SSL, so this is optional)
FORCE_SSL=true
```

## ✨ Final Checklist

- [ ] Railway deployed commit 88ad4c3
- [ ] Version endpoint returns JSON
- [ ] Tracking endpoint returns {ok: true}
- [ ] Stripe webhook endpoint configured in Dashboard
- [ ] STRIPE_WEBHOOK_SECRET added to Railway
- [ ] Stripe CLI test successful
- [ ] PHI_ENCRYPTION_KEY added
- [ ] FORCE_SSL set to true

## 🚨 Troubleshooting

If webhooks fail after deployment:
1. Check Railway logs for signature verification errors
2. Ensure STRIPE_WEBHOOK_SECRET matches Dashboard
3. Verify webhook URL has no typos
4. Check Stripe Dashboard → Webhooks → Recent deliveries for errors
