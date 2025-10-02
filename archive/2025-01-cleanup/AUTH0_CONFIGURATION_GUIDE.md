# 🔐 Auth0 Configuration Guide for AWS Deployment

## ⚠️ CRITICAL: Auth0 Configuration Mismatch Detected

Your frontend and backend are using **different Auth0 tenants**. This needs to be fixed for login to work.

---

## 🔍 Current Situation

### Backend (AWS App Runner) - WORKING ✅
```
Domain: dev-dvouayl22wlz8zwq.us.auth0.com
Client ID: VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L
Audience: https://api.eonmeds.com
```

### Frontend (Default Config) - MISMATCHED ❌
```
Domain: eonmeds.us.auth0.com
Client ID: PUFG93lFKClBBSaeNNyOF10esoSdPPXl
Audience: https://api.eonmeds.com
```

**Problem**: The frontend is trying to authenticate with a different Auth0 tenant than what the backend expects!

---

## ✅ Solution: Use the Correct Auth0 Tenant

You need to use the **dev-dvouayl22wlz8zwq.us.auth0.com** tenant for both frontend and backend.

### Step 1: Update Auth0 Dashboard Settings

1. **Log into Auth0**: https://manage.auth0.com/
2. **Select Tenant**: `dev-dvouayl22wlz8zwq.us.auth0.com`
3. **Go to Applications** → Find your app (likely named "EONMEDS" or similar)
4. **Update Application Settings**:

#### Allowed Callback URLs (Add ALL of these):
```
https://d3p4f8m2bxony8.cloudfront.net/callback
http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com/callback
http://localhost:3001/callback
https://eonmeds.com/callback
https://app.eonmeds.com/callback
```
⚠️ **Note**: Using port 3001 for EONMEDS (port 3000 is used by PHARMAX)

#### Allowed Logout URLs (Add ALL of these):
```
https://d3p4f8m2bxony8.cloudfront.net
http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com
http://localhost:3001
https://eonmeds.com
https://app.eonmeds.com
```

#### Allowed Web Origins (Add ALL of these):
```
https://d3p4f8m2bxony8.cloudfront.net
http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com
http://localhost:3001
https://eonmeds.com
https://app.eonmeds.com
```

#### Allowed Origins (CORS) - Same as Web Origins:
```
https://d3p4f8m2bxony8.cloudfront.net
http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com
http://localhost:3001
https://eonmeds.com
https://app.eonmeds.com
```

5. **Save Changes**

### Step 2: Configure API Settings

1. Still in Auth0, go to **APIs**
2. Find or create API with identifier: `https://api.eonmeds.com`
3. Ensure it's enabled and configured for:
   - **RS256** signing algorithm
   - **Enable RBAC** if you're using roles
   - **Add permissions** if needed

### Step 3: Update Frontend Environment Variables

Create a `.env.production` file in `packages/frontend/`:

```bash
# Auth0 Configuration - MUST match backend!
REACT_APP_AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L
REACT_APP_AUTH0_AUDIENCE=https://api.eonmeds.com
REACT_APP_AUTH0_REDIRECT_URI=https://d3p4f8m2bxony8.cloudfront.net/callback

# API Configuration - Point to AWS App Runner
REACT_APP_API_BASE_URL=https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1
REACT_APP_API_URL=https://qm6dnecfhp.us-east-1.awsapprunner.com
```

### Step 4: Rebuild and Deploy Frontend

```bash
# 1. Update frontend with correct Auth0 settings
cd packages/frontend

# 2. Create production env file
cat > .env.production << EOF
REACT_APP_AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L
REACT_APP_AUTH0_AUDIENCE=https://api.eonmeds.com
REACT_APP_AUTH0_REDIRECT_URI=https://d3p4f8m2bxony8.cloudfront.net/callback
REACT_APP_API_BASE_URL=https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1
REACT_APP_API_URL=https://qm6dnecfhp.us-east-1.awsapprunner.com
EOF

# 3. Rebuild with production config
npm run build

# 4. Deploy to S3
aws s3 sync build/ s3://eonmeds-frontend-staging/ --delete --region us-east-1

# 5. Invalidate CloudFront cache (if you have distribution ID)
# aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## 🔒 Auth0 Rules/Actions (If Needed)

If you have custom Auth0 Rules or Actions, ensure they're configured:

### Add User Roles to Token (Action):
```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://api.eonmeds.com';
  if (event.authorization) {
    api.idToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
    api.accessToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
  }
};
```

### Add User Metadata (Action):
```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://api.eonmeds.com';
  api.idToken.setCustomClaim(`${namespace}/user_metadata`, event.user.user_metadata);
  api.accessToken.setCustomClaim(`${namespace}/user_metadata`, event.user.user_metadata);
};
```

---

## 🧪 Testing Auth0 Login

### 1. Test Local Development First
```bash
# In packages/frontend
PORT=3001 npm start
# Or just run: npm start (port is already configured in .env.local)
```

### 2. Test Authentication Flow
1. Go to http://localhost:3001 (NOT 3000 - that's PHARMAX)
2. Click Login
3. Should redirect to Auth0 login page
4. After login, should redirect back to http://localhost:3001/callback
5. Should then redirect to dashboard

### 3. Test Production
1. Go to https://d3p4f8m2bxony8.cloudfront.net
2. Click Login
3. Complete auth flow
4. Verify you're logged in and can access protected routes

---

## 🚨 Common Issues & Solutions

### Issue 1: "Callback URL mismatch"
**Solution**: Ensure ALL your URLs are added to Auth0 Application settings exactly as shown above.

### Issue 2: "CORS error"
**Solution**: Add your frontend URL to "Allowed Web Origins" in Auth0.

### Issue 3: "Invalid audience"
**Solution**: Ensure `REACT_APP_AUTH0_AUDIENCE` matches exactly: `https://api.eonmeds.com`

### Issue 4: "No token returned"
**Solution**: Check that your API in Auth0 is enabled and using RS256.

### Issue 5: "401 Unauthorized on API calls"
**Solution**: 
1. Verify frontend is sending Bearer token
2. Check backend is validating against correct Auth0 domain
3. Ensure audience matches in both frontend and backend

---

## 📝 Quick Verification Checklist

- [ ] Auth0 Application has all AWS URLs in callback/logout/origins
- [ ] Frontend `.env.production` uses correct Auth0 domain
- [ ] Frontend rebuilt with production environment variables
- [ ] Frontend deployed to S3 with new build
- [ ] CloudFront cache invalidated (if applicable)
- [ ] Test login works on production URL
- [ ] API calls work with Auth0 token

---

## 🔑 Summary of Correct Values

```javascript
// These MUST be used everywhere:
const AUTH0_CONFIG = {
  domain: "dev-dvouayl22wlz8zwq.us.auth0.com",
  clientId: "VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L",
  audience: "https://api.eonmeds.com",
  
  // Production URLs
  productionCallback: "https://d3p4f8m2bxony8.cloudfront.net/callback",
  productionOrigin: "https://d3p4f8m2bxony8.cloudfront.net",
  
  // Staging URLs  
  stagingCallback: "http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com/callback",
  stagingOrigin: "http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com",
  
  // Development (Port 3001 - since 3000 is used by PHARMAX)
  localCallback: "http://localhost:3001/callback",
  localOrigin: "http://localhost:3001"
};
```

**⚠️ IMPORTANT**: Both frontend and backend MUST use the same Auth0 tenant domain!
