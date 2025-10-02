# Railway Nixpacks Deployment Guide

## 🎯 Changes Made

Based on the excellent analysis, I've implemented the following fixes:

### 1. Switched to Nixpacks Builder
- Updated `packages/backend/railway.json` to use `NIXPACKS` builder
- Added explicit `buildCommand: "npm ci && npm run build"`
- Added `watchPaths` to trigger rebuilds on source changes
- This avoids Docker cache issues entirely

### 2. Added Deploy Version Logging
- Added `console.log("🚀 DEPLOY_VERSION:", ...)` to track deployments
- This will show the exact commit SHA in your logs

### 3. Fixed Stripe Webhook Auth Issue
- Moved Stripe webhook route BEFORE body parsing middleware
- This ensures raw body is preserved for signature verification
- Path is: `/api/v1/payments/webhook/stripe`

## 📋 Railway Dashboard Steps

### 1. Clear Build Cache
In Railway Dashboard:
1. Go to **Settings → Build**
2. Set **Builder** to **"Nixpacks"** (not "Automatically detected")
3. Click **"Clear build cache"**

### 2. Trigger Fresh Deployment
Either:
- Wait for auto-deploy from the latest commit
- OR manually click **"Redeploy"**

### 3. Monitor Build Logs
You should see:
```
Installing dependencies...
npm ci
Building application...
npm run build
> backend@2.0.0 build
> tsc -p tsconfig.loose.json --skipLibCheck
```

### 4. Monitor Deploy Logs
You should see:
```
🚀 DEPLOY_VERSION: [commit-sha]
📅 Deploy Time: 2025-08-19T...
✅ Stripe webhook route loaded (requires raw body)
```

## 🧪 Verify Deployment

Run: `./verify-deployment-code.sh`

Expected output:
```
✅ VERSION ENDPOINT EXISTS - NEW CODE IS DEPLOYED!
✅ TRACKING ENDPOINT EXISTS - NEW CODE IS DEPLOYED!
```

## 🔧 Stripe Webhook Configuration

### In Stripe Dashboard:
1. Go to https://dashboard.stripe.com/webhooks
2. Update endpoint URL to:
   ```
   https://eonmeds-backend-v2-production.up.railway.app/api/v1/payments/webhook/stripe
   ```
3. Ensure these events are selected:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - charge.succeeded
   - charge.failed
   - customer.created
   - customer.updated
   - invoice.payment_succeeded
   - invoice.payment_failed

### In Railway Variables:
Update `STRIPE_WEBHOOK_SECRET` with the signing secret from Stripe Dashboard

## 🚀 Benefits of Nixpacks

1. **No Docker cache issues** - Always builds fresh
2. **Faster builds** - No Docker layer management
3. **Automatic dependency detection** - Works with package-lock.json
4. **Better monorepo support** - Respects workspace configurations

## 📝 If Issues Persist

1. Check Railway build logs for the exact commit being built
2. Ensure Railway is set to deploy from `main` branch
3. Verify GitHub connection has proper permissions
4. Try disconnecting and reconnecting GitHub in Railway settings

Your deployment should now work correctly with the latest code! 🎉
