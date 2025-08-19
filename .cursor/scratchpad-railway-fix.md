# Railway Frontend Deployment Fix Strategy - August 17, 2025

## PLANNER MODE: Systematic Railway Fix

### Core Issues Identified:
1. **Persistent Cache**: Railway is serving old builds despite multiple service recreations
2. **Service Linking**: Monorepo confusion - Railway might be linked to wrong service
3. **Build Cache**: Railway's aggressive caching preventing updates
4. **Billing Center Missing**: Despite code being on GitHub, not showing in deployed app

### Strategic Fix Plan:

**Phase 1: Update & Authenticate**
```bash
# Update CLI & auth
npm i -g @railway/cli@latest
railway login
```
- Ensures latest CLI features
- Fresh authentication token

**Phase 2: Correct Service Linking**
```bash
# Go to the frontend package and link the *correct* service
cd packages/frontend
railway link
```
- Critical for monorepo structure
- Ensures commands target frontend service, not backend

**Phase 3: Force Clean Build**
```bash
# Make sure Node is sensible for Nixpacks and bust the build cache
railway variables set NIXPACKS_NODE_VERSION=20
railway variables set BUILD_CACHE_BUSTER=$(date +%s)
```
- Explicit Node version prevents Nixpacks confusion
- Cache buster forces complete rebuild

**Phase 4: Local Validation**
```bash
# Local sanity build (optional but helpful)
npm ci && npm run build
```
- Confirms build works locally
- Catches any local issues before deployment

**Phase 5: Deploy & Monitor**
```bash
# Deploy without streaming; then fetch logs explicitly
railway up --detach
DEP_ID=$(railway deployments --limit 1 --json | jq -r '.[0].id')
railway logs --deployment "$DEP_ID" --lines 300
```
- Detached deployment for cleaner process
- Explicit log fetching for debugging

### Why This Will Work:
1. **Fresh CLI**: Ensures no stale auth/config issues
2. **Correct Linking**: Targets right service in monorepo
3. **Cache Busting**: Forces Railway to build from scratch
4. **Explicit Node**: Prevents version detection issues
5. **Local Validation**: Confirms code is buildable
6. **Clean Deploy**: Avoids streaming issues

### Expected Result:
- Frontend deploys with latest code
- Billing Center menu item appears
- All environment variables work
- Clean deployment logs

### Current Code Status:
- ✅ Billing Center is in GitHub main branch (verified)
- ✅ Syntax errors fixed (commit `28cd410`)
- ✅ Environment variables configured
- ❌ Railway serving old cached build

### Alternative if Railway Continues to Fail:
```bash
# Quick Vercel deployment
cd packages/frontend
npx vercel --prod
```
- Takes 5 minutes
- No caching issues
- Better frontend platform

### Execution Order:
1. First run Phase 1-2 (CLI update & linking)
2. Then Phase 3 (cache busting variables)
3. Optional Phase 4 (local validation)
4. Finally Phase 5 (deploy & monitor)

This systematic approach addresses all identified issues and provides clear debugging at each step.
