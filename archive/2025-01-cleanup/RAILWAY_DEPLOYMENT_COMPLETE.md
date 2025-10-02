# Railway Deployment Complete Guide

## ✅ Issues Fixed

1. **n8n Dockerfile Issue** - Railway was building the wrong Dockerfile (n8n instead of backend)
2. **Trust Proxy Error** - Fixed X-Forwarded-For rate limiter error
3. **Stripe Webhook Auth** - Webhook now bypasses JWT authentication
4. **Cache Issues** - Deterministic Dockerfile with BUILD_ID prevents stale builds
5. **Verification Routes** - Added endpoints to verify correct deployment

## 🔧 Final Configuration

### Railway Settings (Backend Service)

1. **General**
   - Root Directory: `/packages/backend`
   - Service Name: `eonmeds-backend-v2`

2. **Build**
   - Builder: `Dockerfile` (pinned, not auto-detected)
   - Dockerfile Path: `./Dockerfile`
   - Build Args:
     ```
     BUILD_ID={{ RAILWAY_GIT_COMMIT_SHA }}
     ```

3. **Deploy**
   - Port: `8080` (NOT 5678 which is n8n)
   - Health Check: `/health`

### Environment Variables

Critical ones to verify:
- `PORT=8080`
- `NODE_ENV=production`
- `STRIPE_WEBHOOK_SECRET=whsec_...` (from Stripe Dashboard)
- `CORS_ORIGINS=https://your-frontend-url.com`

## 🧪 Verification Commands

```bash
# Run the verification script
chmod +x verify-railway-deployment.sh
./verify-railway-deployment.sh

# Or test manually:
curl -s https://eonmeds-backend-v2-production.up.railway.app/version | jq .
curl -s https://eonmeds-backend-v2-production.up.railway.app/api/v1/tracking/test | jq .
curl -i -X POST https://eonmeds-backend-v2-production.up.railway.app/api/v1/webhooks/stripe \
  -H "Content-Type: application/json" -d '{}'
```

## 📍 API Endpoints

### Public (No Auth)
- `GET /health` - Health check
- `GET /version` - Deployment version info
- `GET /api/v1/tracking/test` - Simple test endpoint
- `POST /api/v1/webhooks/stripe` - Stripe webhook (requires signature)

### Protected (Auth Required)
- All other endpoints require Auth0 JWT token

## 🔄 Stripe Webhook Configuration

1. **In Stripe Dashboard**
   - URL: `https://eonmeds-backend-v2-production.up.railway.app/api/v1/webhooks/stripe`
   - Events: payment_intent.succeeded, charge.succeeded, etc.

2. **In Railway Variables**
   - Copy signing secret from Stripe
   - Set: `STRIPE_WEBHOOK_SECRET=whsec_...`

## 🚀 Deploy Checklist

- [x] Dockerfile uses `FROM node:20-alpine`
- [x] BUILD_ID build arg configured in Railway
- [x] Root directory set to `/packages/backend`
- [x] Port 8080 exposed and configured
- [x] Trust proxy enabled in code
- [x] Stripe webhook bypasses auth
- [x] Verification endpoints added
- [ ] Stripe webhook URL updated in Dashboard
- [ ] Frontend updated with new API URL

## 🎯 Success Indicators

In Deploy Logs:
```
🚀 DEPLOY_VERSION: abc123...
🏗️  Build ID: abc123...
📡 Listening on port 8080
✅ Stripe webhook route loaded at /api/v1/webhooks/stripe
```

Verification Results:
```
✅ Version endpoint working! Commit: abc123...
✅ Tracking test endpoint working!
✅ Stripe webhook bypasses auth correctly (400 = missing signature)
```

## 🆘 Troubleshooting

### If still deploying old code:
1. Check Railway commit hash in Deployments tab
2. Click "Redeploy" → "Clear build cache"
3. Verify BUILD_ID is set in Build Args
4. Check that Dockerfile path is correct

### If seeing port 5678:
- Wrong Dockerfile! Should be backend, not n8n
- Check root directory is `/packages/backend`

### If webhooks fail with 401:
- Webhook route must be before auth middleware
- Check that bypassAuth is applied

## 🎉 You're Done!

Your Railway backend is now:
- Running the correct code
- Using Node.js 20
- Properly configured for Stripe webhooks
- Easy to verify with test endpoints
- Cache-proof with deterministic builds

Next: Update your frontend to use the new API URL!
