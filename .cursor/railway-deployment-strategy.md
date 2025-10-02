# PLANNER MODE: Comprehensive Railway Deployment Strategy
## Preventing Old Code Deployments - August 18, 2025

### Problem Analysis: Why Railway Deploys Old Code

#### Root Causes:
1. **Nixpacks Build Cache**: Railway aggressively caches node_modules and build artifacts
2. **GitHub Webhook Failures**: Sometimes Railway doesn't receive push notifications
3. **Branch Confusion**: Railway might be watching wrong branch or detached HEAD
4. **Monorepo Misconfigurations**: Root directory settings can cause Railway to miss updates
5. **Service State Issues**: Services in "removed" or "paused" state don't update
6. **Environment Variable Cache**: Build-time env vars get cached with old builds

#### Evidence from Our Case:
- Multiple commits pushed (e39ea69, 47da6ad, 19be95a, etc.)
- Billing Center code confirmed in GitHub
- Frontend still showing old version without Billing menu
- Static files (test.html) not appearing
- Console logs from new code not showing

### Strategic Solutions

## Solution 1: Immediate Fix Protocol (20 minutes)
```bash
# 1. Force Railway to recognize changes
railway variables set BUILD_CACHE_BUSTER=$(date +%s)
railway variables set NIXPACKS_NO_CACHE=1
railway redeploy --yes

# 2. If that fails, manual trigger
railway up --detach

# 3. Nuclear option
railway service delete
# Then recreate service with correct settings
```

## Solution 2: Railway Configuration Best Practices

### A. Service Settings (Railway Dashboard)
1. **Auto Deploy**: MUST be ON
2. **Branch**: Set to `main` (not master, not HEAD)
3. **Root Directory**: `/packages/frontend` (for monorepo)
4. **Build Command**: Override with explicit command
   ```
   npm ci --production=false && npm run build
   ```
5. **Start Command**: Explicit serve command
   ```
   npx serve -s build -l $PORT
   ```

### B. Environment Variables for Cache Control
```bash
# Add these permanently to Railway service
NIXPACKS_NO_CACHE=1
NIXPACKS_NODE_VERSION=20
BUILD_TIMESTAMP=$RAILWAY_DEPLOYMENT_ID
DISABLE_CACHE=true
```

### C. railway.json Configuration
Create `packages/frontend/railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci --production=false && npm run build",
    "watchPatterns": [
      "src/**",
      "public/**",
      "package.json",
      "package-lock.json"
    ]
  },
  "deploy": {
    "startCommand": "npx serve -s build -l $PORT",
    "healthcheckPath": "/",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### D. nixpacks.toml for Explicit Control
Create `packages/frontend/nixpacks.toml`:
```toml
[phases.setup]
nixPkgs = ["nodejs-20_x"]

[phases.install]
cmds = ["npm ci --production=false"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npx serve -s build -l $PORT"
```

## Solution 3: Deployment Verification System

### A. Version Tracking
1. **Build-time Version File**:
```javascript
// scripts/generateBuildInfo.js
const fs = require('fs');
const buildInfo = {
  version: process.env.npm_package_version,
  buildTime: new Date().toISOString(),
  commitHash: process.env.RAILWAY_GIT_COMMIT_SHA || 'local',
  deploymentId: process.env.RAILWAY_DEPLOYMENT_ID || 'local'
};
fs.writeFileSync('public/build-info.json', JSON.stringify(buildInfo, null, 2));
```

2. **Add to package.json**:
```json
"scripts": {
  "prebuild": "node scripts/generateBuildInfo.js",
  "build": "react-scripts build"
}
```

### B. Runtime Version Display
```javascript
// src/components/common/BuildStamp.tsx
import { useEffect, useState } from 'react';

export const BuildStamp = () => {
  const [buildInfo, setBuildInfo] = useState(null);
  
  useEffect(() => {
    fetch('/build-info.json')
      .then(res => res.json())
      .then(setBuildInfo)
      .catch(() => console.error('No build info'));
  }, []);
  
  if (!buildInfo) return null;
  
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 0, 
      right: 0, 
      fontSize: '10px',
      padding: '4px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white'
    }}>
      v{buildInfo.version} • {buildInfo.buildTime} • {buildInfo.commitHash?.slice(0,7)}
    </div>
  );
};
```

### C. Deployment Health Check
```javascript
// pages/api/health (or public/health.json)
{
  "status": "healthy",
  "version": "${BUILD_VERSION}",
  "deployedAt": "${BUILD_TIME}",
  "gitCommit": "${GIT_COMMIT}"
}
```

## Solution 4: Alternative Deployment Strategies

### A. GitHub Actions + Railway API
```yaml
# .github/workflows/deploy-frontend.yml
name: Deploy Frontend
on:
  push:
    branches: [main]
    paths:
      - 'packages/frontend/**'
      
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Railway
        run: npm i -g @railway/cli
      - name: Deploy to Railway
        run: |
          cd packages/frontend
          railway up --service ${{ secrets.RAILWAY_SERVICE_ID }}
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### B. Docker-based Deployment (Bypass Nixpacks)
```dockerfile
# packages/frontend/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### C. Webhook Verification
```bash
# Verify Railway is receiving GitHub webhooks
curl -X POST https://api.railway.app/v1/webhooks/github \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ref": "refs/heads/main", "repository": {"full_name": "eonpro/eonmeds-platform2025"}}'
```

## Solution 5: Monitoring & Alerts

### A. Deployment Verification Script
```javascript
// scripts/verifyDeployment.js
const axios = require('axios');

async function verifyDeployment() {
  const liveUrl = process.env.FRONTEND_URL;
  const expectedVersion = require('../package.json').version;
  
  try {
    const { data } = await axios.get(`${liveUrl}/build-info.json`);
    if (data.version !== expectedVersion) {
      throw new Error(`Version mismatch! Expected ${expectedVersion}, got ${data.version}`);
    }
    console.log('✅ Deployment verified!', data);
  } catch (error) {
    console.error('❌ Deployment verification failed:', error.message);
    process.exit(1);
  }
}

verifyDeployment();
```

### B. Post-Deploy Hook
```json
// railway.json
{
  "deploy": {
    "postDeployCommand": "node scripts/verifyDeployment.js"
  }
}
```

## Recommended Action Plan

### Immediate (Today):
1. **Force Rebuild**:
   ```bash
   railway variables set NIXPACKS_NO_CACHE=1
   railway variables set BUILD_CACHE_BUSTER=$(date +%s)
   railway redeploy
   ```

2. **Add Version Tracking**:
   - Implement BuildStamp component
   - Add build-info.json generation
   - Deploy and verify version shows

3. **Update Railway Settings**:
   - Verify Auto Deploy is ON
   - Check branch is set to 'main'
   - Add cache-busting env vars

### Short-term (This Week):
1. Add railway.json configuration
2. Implement deployment verification
3. Set up GitHub Action backup
4. Add health check endpoint

### Long-term (This Month):
1. Consider Docker deployment
2. Set up monitoring alerts
3. Implement rollback strategy
4. Document deployment process

## Key Takeaways

1. **Never Trust Cache**: Always have cache-busting mechanisms
2. **Version Everything**: Every deployment should have a visible version
3. **Verify Deployments**: Automated checks prevent silent failures
4. **Multiple Strategies**: Have backup deployment methods
5. **Monitor Actively**: Don't assume deployments succeeded

## Success Metrics
- ✅ Every commit triggers a deployment
- ✅ Deployments complete in < 5 minutes
- ✅ Version number visible in app
- ✅ No manual intervention required
- ✅ Automatic rollback on failure

This comprehensive strategy ensures Railway will never serve old code again.
