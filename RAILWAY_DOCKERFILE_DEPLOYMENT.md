# Railway Deterministic Dockerfile Deployment

## 🎯 What We've Implemented

### 1. Multi-Stage Dockerfile
- **Base stage**: Sets up Node.js 20 Alpine with production environment
- **Deps stage**: Installs dependencies using `npm ci` for reproducibility
- **Build stage**: Compiles TypeScript with cache-busting via BUILD_ID
- **Runtime stage**: Minimal production image with only necessary files

### 2. Proper .dockerignore
- Excludes `node_modules`, `dist`, and other build artifacts
- Ensures fresh builds every time
- Keeps Docker context small and fast

### 3. Cache-Busting Strategy
- `ARG BUILD_ID` changes with every commit
- Forces Docker to rebuild from that layer onwards
- No more stale cached builds!

## 📋 Railway Configuration Steps

### 1. In Railway Dashboard → Settings → Build

1. **Builder**: Set to **"Dockerfile"** (not "Automatically detected")
2. **Build Args**: Add this:
   ```
   BUILD_ID={{ RAILWAY_GIT_COMMIT_SHA }}
   ```
3. **Root Directory**: Should be `/packages/backend`

### 2. Clear Cache and Redeploy

1. Click **"Redeploy"** → **"Clear build cache"**
2. This ensures no stale layers from previous builds

### 3. Monitor Build Logs

You should see:
```
[1/4] FROM node:20-alpine AS base
[2/4] COPY package*.json ./
[3/4] RUN npm ci
[4/4] RUN npm run build
```

**No "CACHED" messages** after the deps stage!

### 4. Monitor Deploy Logs

Look for:
```
🚀 DEPLOY_VERSION: <commit-sha>
📅 Deploy Time: 2025-08-19T...
🏗️  Build ID: <commit-sha>
🔨 Railway SHA: <commit-sha>
✅ Stripe webhook route loaded (requires raw body)
```

## 🧪 Verify Deployment

Run: `./verify-deployment-code.sh`

Expected output:
```
✅ VERSION ENDPOINT EXISTS - NEW CODE IS DEPLOYED!
✅ TRACKING ENDPOINT EXISTS - NEW CODE IS DEPLOYED!
```

## 🚀 Benefits of This Approach

1. **Deterministic Builds**: Same input = same output, always
2. **No Cache Issues**: BUILD_ID forces fresh builds
3. **Smaller Images**: Multi-stage build excludes dev dependencies
4. **Faster Deploys**: Only rebuilds what changed
5. **Production Optimized**: Uses NODE_ENV=production

## 🔧 Troubleshooting

### If still seeing old code:

1. **Check Build Args in Railway**:
   - Must have `BUILD_ID={{ RAILWAY_GIT_COMMIT_SHA }}`
   - This template variable is crucial

2. **Verify Dockerfile Path**:
   - Should be `./Dockerfile` (relative to `/packages/backend`)

3. **Check Deploy Logs**:
   - Look for the BUILD_ID value changing
   - If it's "dev" or static, the build arg isn't working

4. **Nuclear Option**:
   - Delete service
   - Create new service
   - Apply all settings fresh

## 📝 One-Time Sanity Checklist

- [x] Railway Root Directory = `/packages/backend`
- [ ] Build Type = **Dockerfile** (pinned, not auto-detected)
- [ ] Build Arg `BUILD_ID={{ RAILWAY_GIT_COMMIT_SHA }}`
- [ ] Click Redeploy → Clear cache
- [ ] Logs show `DEPLOY_VERSION: <your latest SHA>`
- [ ] Build logs show `npm run build` executed inside Docker
- [ ] App boots and `/health` passes
- [ ] `/version` and `/tracking/test` endpoints work

## 🎉 Success Indicators

1. Build logs show actual building (not CACHED)
2. Deploy logs show correct commit SHA
3. All API endpoints work as expected
4. Stripe webhooks receive events properly

This deterministic approach ensures Railway ALWAYS deploys your latest code!
