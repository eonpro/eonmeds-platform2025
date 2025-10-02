# 🔧 AUTH0 LOGIN FIX - EMERGENCY PLAN

## CRITICAL ISSUE
**Login button doesn't work** - Auth0 configuration missing from production build

## ROOT CAUSE
```javascript
// These are UNDEFINED in production:
process.env.REACT_APP_AUTH0_DOMAIN
process.env.REACT_APP_AUTH0_CLIENT_ID
process.env.REACT_APP_AUTH0_AUDIENCE
```

## SOLUTION OPTIONS (Choose One)

### ⚡ Option 1: HARDCODE FIX (5 minutes)
**Fastest solution - Recommended for immediate fix**

1. Edit `packages/frontend/src/config.js`:
```javascript
export default {
  API_URL: 'https://qm6dnecfhp.us-east-1.awsapprunner.com',
  API_BASE_URL: 'https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1',
  STRIPE_PUBLIC_KEY: 'pk_live_51RPS5NGzKhM7cZeGlOITW4CImzbMEldvaRbrBQV894nLYUjnSM7rNKTpzeYVZJVOhCbNxmOvOjnR7RN60XdAHvJ100Ksh6ziwy',
  // HARDCODE THESE VALUES:
  AUTH0_DOMAIN: 'dev-dvouayl22wlz8zwq.us.auth0.com',
  AUTH0_CLIENT_ID: 'VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L',
  AUTH0_AUDIENCE: 'https://api.eonmeds.com',
};
```

2. Edit `packages/frontend/src/providers/Auth0Provider.tsx`:
```javascript
// Instead of:
const domain = process.env.REACT_APP_AUTH0_DOMAIN!;
const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID!;

// Use:
const domain = 'dev-dvouayl22wlz8zwq.us.auth0.com';
const clientId = 'VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L';
const audience = 'https://api.eonmeds.com';
```

3. Build without npm install (use existing node_modules):
```bash
cd packages/frontend
npm run build
```

4. Deploy:
```bash
aws s3 sync build/ s3://eonmeds-frontend-staging/ --delete
aws cloudfront create-invalidation --distribution-id EZBKJZ75WFBQ9 --paths "/*"
```

### 🛠️ Option 2: FIX BUILD PROCESS (15 minutes)
**Proper solution but requires fixing npm issues**

1. Fix Node version:
```bash
nvm use 22  # or nvm install 22
```

2. Clean install with memory limit:
```bash
cd packages/frontend
rm -rf node_modules package-lock.json
NODE_OPTIONS="--max-old-space-size=4096" npm install
```

3. Build with env vars:
```bash
export REACT_APP_AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
export REACT_APP_AUTH0_CLIENT_ID=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L
export REACT_APP_AUTH0_AUDIENCE=https://api.eonmeds.com
npm run build
```

### 🚀 Option 3: DOWNLOAD & MODIFY (10 minutes)
**Hack the deployed file directly**

1. Download current main.js from S3
2. Find and replace the fallback values
3. Re-upload modified file
4. Invalidate CloudFront

## VERIFICATION STEPS

After fix:
1. Hard refresh browser (Cmd+Shift+R)
2. Open console - should see no Auth0 errors
3. Click "Log In" button
4. Should redirect to Auth0 login page
5. Login with test credentials
6. Should redirect back to app

## AUTH0 DASHBOARD SETTINGS

Ensure these are set in Auth0:
- **Allowed Callback URLs**: https://d3p4f8m2bxony8.cloudfront.net/callback
- **Allowed Logout URLs**: https://d3p4f8m2bxony8.cloudfront.net
- **Allowed Web Origins**: https://d3p4f8m2bxony8.cloudfront.net

## DECISION REQUIRED

**Which option should we implement?**
- Option 1: Quick hardcode (5 min) ← RECOMMENDED
- Option 2: Proper fix (15 min)
- Option 3: Direct modification (10 min)
