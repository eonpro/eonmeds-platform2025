# Railway Dockerfile Setup - Action Required!

## �� CRITICAL: Add Build Arg in Railway Dashboard

### 1. Go to Railway → Settings → Build

1. **Builder**: Set to **"Dockerfile"** (not "Automatically detected")
2. **Build Args**: Click "Add" and enter:
   - Key: `BUILD_ID`
   - Value: `{{ RAILWAY_GIT_COMMIT_SHA }}`
   
   ⚠️ IMPORTANT: Use the exact value with double curly braces!

3. **Root Directory**: Verify it's `/packages/backend`

### 2. Clear Cache and Redeploy

1. Click **"Redeploy"**
2. Select **"Clear build cache"**
3. Deploy

### 3. What You Should See

In Build Logs:
```
[build 3/4] COPY . .
[build 4/4] RUN npm run build
> backend@2.0.0 build
> tsc -p tsconfig.loose.json --skipLibCheck
```

In Deploy Logs:
```
🚀 DEPLOY_VERSION: cffe4a6...
📅 Deploy Time: 2025-08-19T...
🏗️  Build ID: cffe4a6...
✅ Stripe webhook route loaded (requires raw body)
```

### 4. Test Deployment

```bash
./verify-deployment-code.sh
```

Should show:
```
✅ VERSION ENDPOINT EXISTS - NEW CODE IS DEPLOYED!
✅ TRACKING ENDPOINT EXISTS - NEW CODE IS DEPLOYED!
```

## ⚡ Quick Checklist

- [ ] Builder = "Dockerfile" (pinned)
- [ ] Build Arg: BUILD_ID={{ RAILWAY_GIT_COMMIT_SHA }}
- [ ] Clicked "Clear build cache"
- [ ] Build logs show actual building (not CACHED)
- [ ] Deploy logs show correct commit SHA

This setup ensures Railway ALWAYS deploys your latest code!
