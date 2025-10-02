# 🔒 Auth0 Security Implementation Guide - Step by Step

**Time Required**: 15-20 minutes  
**Risk Level**: ZERO (secret not actively used)  
**Date**: January 7, 2025

---

## ✅ **VERIFICATION COMPLETE**
- Auth0 client secret is NOT used in your active code
- Safe to rotate without any code changes
- No deployment required before rotation

---

## 📋 **STEP 1: ROTATE AUTH0 CLIENT SECRET** (5 minutes)

### **1.1 Open Auth0 Dashboard**
1. Go to: https://manage.auth0.com
2. Sign in with your Auth0 account

### **1.2 Navigate to Your Application**
1. Click **Applications** in left sidebar
2. Find and click **"EONMeds"** (or your app name)
3. You should see: `Client ID: VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L`

### **1.3 Rotate the Secret**
1. In the **Settings** tab (should be default)
2. Scroll down to **Client Secret** section
3. Click the **"Rotate"** button (rotating arrows icon)
4. **IMPORTANT**: A dialog will appear:
   - Click **"Rotate"** to confirm
   - The old secret will remain valid for 24 hours (grace period)
5. **COPY THE NEW SECRET** immediately and save it somewhere safe

### **1.4 Document the Rotation**
Save this information:
```
Rotation Date: [TODAY'S DATE]
Old Secret Valid Until: [24 hours from now]
New Secret: [PASTE HERE - KEEP SECURE]
```

---

## 📋 **STEP 2: CLEAN AUTH0 CONFIGURATION** (5 minutes)

While you're in the Auth0 Dashboard, let's fix all security issues:

### **2.1 Remove S3 URLs**
1. Still in **Applications → EONMeds → Settings**
2. Find **"Allowed Callback URLs"** field
3. **REMOVE these lines** (if present):
   ```
   http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com/callback
   http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com
   ```
4. **KEEP ONLY these**:
   ```
   https://d3p4f8m2bxony8.cloudfront.net/callback
   http://localhost:3001/callback
   ```

### **2.2 Fix Logout URLs**
1. Find **"Allowed Logout URLs"** field
2. **REMOVE** any S3 website URLs
3. **KEEP ONLY**:
   ```
   https://d3p4f8m2bxony8.cloudfront.net
   http://localhost:3001
   ```

### **2.3 Fix Web Origins (CORS)**
1. Find **"Allowed Web Origins"** field
2. **REMOVE** any S3 website URLs
3. **KEEP ONLY**:
   ```
   https://d3p4f8m2bxony8.cloudfront.net
   http://localhost:3001
   ```

### **2.4 Set SPA Configuration**
1. Scroll to **"Application Properties"** section
2. **Application Type**: Should be `Single Page Application`
3. **Token Endpoint Authentication Method**: 
   - Click dropdown
   - Select **`None`** (CRITICAL for SPAs)

### **2.5 Verify Grant Types**
1. Scroll to **"Advanced Settings"** at bottom
2. Click to expand
3. Go to **"Grant Types"** tab
4. **ENABLED** (checked):
   - ✅ Authorization Code
   - ✅ Refresh Token
5. **DISABLED** (unchecked):
   - ❌ Implicit (deprecated)
   - ❌ Password (insecure)
   - ❌ Client Credentials (for M2M only)
   - ❌ Device Code (for devices)

### **2.6 Save Changes**
1. Scroll to bottom
2. Click **"Save Changes"** button
3. Wait for green success message

---

## 📋 **STEP 3: UPDATE AWS APP RUNNER** (5 minutes)

### **3.1 Get Current Service ARN**
```bash
aws apprunner list-services --region us-east-1 | grep ServiceArn
```

### **3.2 Update Environment Variable**
```bash
# First, list current configuration
aws apprunner describe-service \
  --service-arn "arn:aws:apprunner:us-east-1:YOUR_ACCOUNT:service/YOUR_SERVICE" \
  --region us-east-1 \
  --query 'Service.SourceConfiguration.ImageRepository.ImageConfiguration.RuntimeEnvironmentVariables'
```

### **3.3 Option A: Update via Console (EASIER)**
1. Go to AWS Console: https://console.aws.amazon.com/apprunner
2. Select your service
3. Click **Configuration** tab
4. Click **Edit** next to Environment Variables
5. Find `AUTH0_CLIENT_SECRET`
6. Update with new value
7. Click **Save**
8. Click **Deploy** (if not automatic)

### **3.4 Option B: Update via CLI**
Create a file `update-env.json`:
```json
{
  "RuntimeEnvironmentVariables": {
    "AUTH0_CLIENT_SECRET": "YOUR_NEW_SECRET_HERE",
    "AUTH0_DOMAIN": "dev-dvouayl22wlz8zwq.us.auth0.com",
    "AUTH0_AUDIENCE": "https://api.eonmeds.com"
  }
}
```

Then run:
```bash
aws apprunner update-service \
  --service-arn "YOUR_SERVICE_ARN" \
  --source-configuration file://update-env.json \
  --region us-east-1
```

---

## 📋 **STEP 4: DEPLOY BACKEND SECURITY FIXES** (5 minutes)

### **4.1 Verify Files Are Ready**
Check these files exist:
```bash
ls -la packages/backend/src/middleware/emergency-auth.ts
ls -la packages/backend/src/utils/log-sanitizer.ts
ls -la packages/backend/src/utils/hipaa-audit.ts
```

### **4.2 Test Locally First**
```bash
cd packages/backend
npm run dev
# In another terminal:
curl http://localhost:8080/api/v1/patients
# Should return: 401 Unauthorized
```

### **4.3 Commit Changes**
```bash
git add .
git commit -m "HIPAA Security: Add emergency auth, log sanitization, and audit system"
git push origin main
```

### **4.4 Trigger Deployment**
- **If auto-deploy enabled**: Push triggers deployment
- **If manual**: Go to AWS App Runner console and click Deploy

---

## 📋 **STEP 5: VERIFICATION CHECKLIST** (5 minutes)

### **5.1 Test Auth0 Login**
1. Open: https://d3p4f8m2bxony8.cloudfront.net
2. Click Login
3. Should redirect to Auth0
4. Login with test account
5. Should redirect back successfully

### **5.2 Test API Protection**
```bash
# Should return 401 Unauthorized
curl https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/patients

# Health check should work (public)
curl https://qm6dnecfhp.us-east-1.awsapprunner.com/health
```

### **5.3 Check S3 Security**
```bash
# Verify bucket is private
aws s3api get-bucket-acl --bucket eonmeds-frontend-staging --region us-east-1
# Should show only owner has FULL_CONTROL

# Try public access (should fail)
curl http://eonmeds-frontend-staging.s3.amazonaws.com/index.html
# Should return: Access Denied
```

### **5.4 Monitor Logs**
```bash
# Check App Runner logs for any errors
aws logs tail /aws/apprunner/YOUR_SERVICE_NAME --follow --region us-east-1
```

---

## ✅ **SUCCESS CRITERIA**

After completing all steps, verify:

- [ ] Auth0 secret rotated (old one expires in 24h)
- [ ] No S3 URLs in Auth0 configuration
- [ ] Token Endpoint Auth = "None"
- [ ] Only Auth Code + Refresh Token grants enabled
- [ ] Backend deployed with security fixes
- [ ] All patient APIs return 401 without auth
- [ ] Frontend login still works
- [ ] S3 bucket is private

---

## 🚨 **TROUBLESHOOTING**

### **If login stops working:**
1. Check Auth0 logs: Dashboard → Monitoring → Logs
2. Verify Allowed Callback URLs includes your domain
3. Check browser console for errors

### **If API calls fail with 401:**
1. This is EXPECTED for unauthenticated calls
2. Frontend should include Bearer token automatically
3. Check token expiration

### **If deployment fails:**
1. Check App Runner logs
2. Verify all environment variables are set
3. Ensure DATABASE_URL is configured

---

## 📝 **POST-IMPLEMENTATION NOTES**

1. **Old secret expires**: In 24 hours automatically
2. **Monitor for 48 hours**: Watch for any auth issues
3. **Document completion**: Update compliance records
4. **Schedule RBAC**: Plan role implementation for next sprint

---

## 🎯 **NEXT STEPS AFTER THIS**

1. Implement RBAC in Auth0
2. Add frontend route guards
3. Configure S3 signed URLs
4. Enable database encryption
5. Run security audit

---

**Implementation Support**: If you encounter any issues, check:
- Auth0 System Status: https://status.auth0.com
- AWS Service Health: https://health.aws.amazon.com
