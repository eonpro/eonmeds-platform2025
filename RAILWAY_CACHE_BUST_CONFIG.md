# Railway Cache Bust Configuration

## Critical: Add CACHE_BUST Build Argument

Railway is caching Docker layers even with new commits. To force a complete rebuild:

### 1. Go to Railway Dashboard
- Navigate to your backend service
- Go to **Settings** → **Build**

### 2. Add Build Argument
Add a new build argument:
- **Key**: `CACHE_BUST`
- **Value**: `{{ new Date().toISOString() }}`

Or use a static value that you change manually:
- **Key**: `CACHE_BUST` 
- **Value**: `2025-08-20-v1` (increment this each time)

### 3. Existing Build Arguments
Make sure you still have:
- **Key**: `BUILD_ID`
- **Value**: `{{ RAILWAY_GIT_COMMIT_SHA }}`

### 4. Force Redeploy
After adding CACHE_BUST:
1. Go to Deployments tab
2. Click ⋯ → Redeploy
3. Or trigger by pushing a new commit

### 5. Verify in Logs
Look for these in build logs:
- "Cache bust: [timestamp]"
- "Source copied at: [date]"
- "=== BUILD COMPLETE ==="
- "Checking for routes in index.js:"

### Expected Endpoints After Deploy
- `GET /version` - Returns commit info
- `GET /api/v1/tracking/test` - Returns {ok: true}
- `GET /api/v1/billing/stripe/diagnostics` - Returns Stripe config
- `POST /api/v1/billing/stripe/customers` - Create Stripe customer
- All other Stripe billing endpoints

### If Still Not Working
The nuclear option - delete the service and recreate:
1. Export all environment variables
2. Delete the backend service
3. Create new service
4. Re-add all env vars
5. Deploy fresh
