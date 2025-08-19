# Railway Backend Nuke Steps - Complete Guide

## ⚠️ PRE-FLIGHT CHECKLIST
Before proceeding, ensure you have:
- [x] Backed up all environment variables (✅ Done - railway-env-backup.txt)
- [x] Database connection string saved (✅ Done in env backup)
- [ ] Committed and pushed all code changes
- [ ] Current deployment URL noted: `https://eonmeds-platform2025-production.up.railway.app`

## 🔥 STEP-BY-STEP NUKE PROCESS

### Step 1: Commit and Push Your Code
```bash
# Check current status
git status

# Add all changes
git add .

# Commit with clear message
git commit -m "fix: Prepare for Railway backend reset - includes tracking routes and all fixes"

# Push to remote (this will likely need merge)
git push origin main
```

**If you get merge conflicts:**
```bash
# Pull remote changes
git pull origin main

# Resolve conflicts in VS Code
# Then commit the merge
git add .
git commit -m "fix: Merge remote changes"
git push origin main
```

### Step 2: Open Railway Dashboard
1. Go to https://railway.app
2. Click on your project: **diligent-reflection**
3. You should see your services listed

### Step 3: Delete the Backend Service (NOT the database!)
1. Click on **eonmeds-platform2025** service
2. Click on **Settings** tab
3. Scroll to bottom - **Danger Zone**
4. Click **Delete Service**
5. Type the service name to confirm
6. Click **Delete**

⚠️ **DO NOT DELETE THE DATABASE SERVICE!**

### Step 4: Clear Local Railway Config
```bash
# Remove any local Railway artifacts
rm -rf .railway
rm -f railway.json
cd packages/backend
rm -f railway.json
cd ../..
```

### Step 5: Create New Backend Service
1. In Railway dashboard, click **+ New**
2. Select **GitHub Repo**
3. Choose your repository: **EONPRO 2025**
4. Railway will create a new service

### Step 6: Configure the New Service
1. Click on the new service
2. Go to **Settings** tab
3. Change service name to: **eonmeds-backend-v2** (or similar)
4. Set **Root Directory**: `/packages/backend`
5. Set **Build Command**: `npm install && npm run build`
6. Set **Start Command**: `node dist/index.js`

### Step 7: Add All Environment Variables
1. Go to **Variables** tab
2. Click **Raw Editor**
3. Paste ALL variables from your backup:

```
AUTH0_AUDIENCE=https://api.eonmeds.com
AUTH0_CLIENT_ID=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L
AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
CORS_ORIGIN=https://eonmeds-frontend-production.up.railway.app,http://localhost:3000,http://localhost:3001
DATABASE_URL=postgresql://eonmeds_admin:398Xakf$57@eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com:5432/eonmeds?sslmode=disable
DB_HOST=eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com
DB_NAME=eonmeds
DB_PASSWORD=398Xakf$57
DB_PORT=5432
DB_SSL=false
DB_USER=eonmeds_admin
EXECUTIONS_DATA_SAVE_ON_ERROR=all
EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
GENERIC_TIMEZONE=America/New_York
HEYFLOW_WEBHOOK_SECRET=SKIP
INVOICE_DUE_DAYS=30
JWT_SECRET=A7SIqN7OF9mtnobJD8aJKFeW5+z301u+WRQGE5IHo10=
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_PASSWORD=398Xakf$57
N8N_BASIC_AUTH_USER=admin
N8N_EDITOR_BASE_URL=https://n8n-production.up.railway.app
N8N_ENCRYPTION_KEY=e2452e6bd077fddc48c0129cb8187c79a8a80ca6ef344200d795872de02289ef
N8N_LOG_LEVEL=info
N8N_METRICS=true
N8N_PORT=5678
N8N_PROTOCOL=https
N8N_VERSION_NOTIFICATIONS_ENABLED=false
NIXPACKS_NODE_VERSION=20
NODE_ENV=production
NPM_CONFIG_PRODUCTION=false
OPENAI_API_KEY=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
SESSION_SECRET=a32cd242439e04d262b03842d4ce6c2c22796b800f24baa7db4f180f50eef7be
STRIPE_PRICE_TESTOSTERONE_MONTHLY=price_1RvTbsGzKhM7c2eGmMxoKIm3
STRIPE_PRICE_TESTOSTERONE_QUARTERLY=price_1RvTbsGzKhM7c2eGWieUqyyN
STRIPE_PRICE_WEIGHTLOSS_MONTHLY=price_1RvTbrGzKhM7c2eG7qHrh6Ks
STRIPE_PRICE_WEIGHTLOSS_QUARTERLY=price_1RvTbrGzKhM7c2eGA6msXYyV
STRIPE_PRODUCT_TESTOSTERONE_MONTHLY=prod_SrBznfUE2z0Fgz
STRIPE_PRODUCT_TESTOSTERONE_QUARTERLY=prod_SrBzVc6IchtTTH
STRIPE_PRODUCT_WEIGHTLOSS_MONTHLY=prod_SrBz62W3CrfmUP
STRIPE_PRODUCT_WEIGHTLOSS_QUARTERLY=prod_SrBzsGnJiNHmBC
STRIPE_SECRET_KEY=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
STRIPE_TRIAL_DAYS=0
STRIPE_WEBHOOK_SECRET=whsec_hv94xzS2J5E1y8qgvfGhF5PYW7q5Z7Vy
STRIPE_WEBHOOK_URL=https://eonmeds-platform2025-production.up.railway.app/api/v1/payments/webhook/stripe
TRACKING_API_KEY=8f372a1ac2c1721be6c8549178cddeb56d3a690b8bd08be5fc14f3157c669f19
WEBHOOK_URL=https://n8n-production.up.railway.app
```

4. Click **Update Variables**

### Step 8: Trigger Deployment
1. The deployment should start automatically
2. Go to **Deployments** tab to monitor
3. Watch the build logs
4. Wait for "Deployment live" status

### Step 9: Get New URL and Update CORS
1. Once deployed, click on the service
2. Copy the new deployment URL
3. Update the CORS_ORIGIN variable:
   - Replace the old URL with the new one
   - Keep localhost entries

### Step 10: Verify Deployment
```bash
# Update the test script with new URL
# Edit test-railway-deployment.sh and change the API_URL

# Run verification
./test-railway-deployment.sh
```

### Step 11: Update External Services
1. **Update Stripe Webhook**:
   - Go to Stripe Dashboard
   - Update webhook endpoint with new URL
   - Update STRIPE_WEBHOOK_URL env var

2. **Update Frontend**:
   - Update API URL in frontend config
   - Redeploy frontend if needed

## 🎯 SUCCESS CRITERIA
- [ ] New service deployed successfully
- [ ] Health endpoint returns 200
- [ ] Version endpoint exists
- [ ] Tracking routes are accessible
- [ ] Database connection works
- [ ] All API endpoints functional

## 🚨 TROUBLESHOOTING
If deployment fails:
1. Check build logs for errors
2. Verify all environment variables are set
3. Ensure git repository is properly connected
4. Check Railway service logs

## 🔄 ROLLBACK PLAN
If something goes wrong:
1. The old deployment URL will stop working
2. Database remains intact
3. Can create another new service
4. All environment variables are backed up
