# EONMeds Platform - Fix Deployment Guide

## Current Issues & Solutions

### 1. Auth0 "Missing Refresh Token" Error
**Issue**: Users are getting "Missing Refresh Token" errors because the bypass tokens have been removed.

**Solution**: Users need to log out and log back in to get new refresh tokens.

**Steps**:
1. Clear browser local storage (F12 → Application → Local Storage → Clear)
2. Navigate to: https://intuitive-learning-production.up.railway.app
3. Click "Login" and authenticate with Auth0
4. The new session will have proper refresh tokens

### 2. SOAP Notes 500 Error
**Issue**: SOAP note generation is failing because OpenAI API key is not set.

**Solution**: Add OpenAI API key to Railway environment variables.

**Steps**:
1. Go to Railway Dashboard → Your Project → Backend Service
2. Click "Variables" tab
3. Add: `OPENAI_API_KEY = sk-your-openai-api-key`
4. Save and redeploy

### 3. Environment Variables Setup

#### Backend Service (Railway)
Add these variables in Railway Backend service:

```bash
# Core
NODE_ENV=production
API_VERSION=v1

# Database (Railway provides these automatically)
DATABASE_URL=<Railway PostgreSQL URL>

# Auth0
AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
AUTH0_AUDIENCE=https://api.eonmeds.com
AUTH0_CLIENT_ID=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L
AUTH0_ISSUER=https://dev-dvouayl22wlz8zwq.us.auth0.com/

# Stripe (REQUIRED - Get from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# OpenAI (REQUIRED - Get from OpenAI)
OPENAI_API_KEY=sk-your-openai-api-key

# Security
JWT_SECRET=<generate with: openssl rand -base64 32>
SESSION_SECRET=<generate with: openssl rand -base64 32>
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
BCRYPT_ROUNDS=10

# CORS
CORS_ORIGIN=https://intuitive-learning-production.up.railway.app

# Logging
LOG_LEVEL=info

# HeyFlow (Optional)
HEYFLOW_WEBHOOK_SECRET=your_heyflow_secret
```

#### Frontend Service (Railway)
Add these as build-time variables:

```bash
REACT_APP_AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L
REACT_APP_AUTH0_AUDIENCE=https://api.eonmeds.com
REACT_APP_API_URL=https://your-backend-service.up.railway.app
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

### 4. Deployment Steps

1. **Backend First**:
   ```bash
   cd packages/backend
   git add .
   git commit -m "Remove auth bypass tokens and add robust Stripe handling"
   git push
   ```

2. **Frontend Second**:
   ```bash
   cd packages/frontend
   git add .
   git commit -m "Remove auth bypass tokens from frontend"
   git push
   ```

3. **Verify Deployment**:
   - Check Railway logs for any errors
   - Ensure both services are running
   - Test authentication flow
   - Test webhook endpoints

### 5. Testing Checklist

After deployment, test these features:

- [ ] User can login with Auth0
- [ ] No more "Missing Refresh Token" errors
- [ ] API calls work with proper authentication
- [ ] SOAP notes generation works
- [ ] HeyFlow webhooks create patients
- [ ] Stripe payments process correctly
- [ ] Webhook logging shows detailed information

### 6. Monitoring

Watch the Railway logs for:
- Authentication errors
- Database connection issues
- API errors
- Webhook processing

Use the comprehensive logging we added to debug any issues.

### 7. Rollback Plan

If issues persist:
1. Revert the code changes in Git
2. Redeploy previous version
3. Re-add temporary bypass tokens (NOT RECOMMENDED)

## Next Steps

Once everything is working:
1. Set up proper monitoring (Sentry, LogRocket)
2. Add health check endpoints
3. Set up automated testing
4. Configure backup strategies
5. Document all integrations 