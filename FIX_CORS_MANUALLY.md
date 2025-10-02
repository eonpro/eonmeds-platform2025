# 🚨 URGENT: Fix CORS to Enable Client Display

## The Problem
Your clients aren't showing because the backend is **blocking requests from CloudFront** due to CORS policy. The backend needs to be updated to allow your frontend URL.

## ⚡ Quick Fix Instructions

### Option 1: AWS Console (Recommended - 5 minutes)

1. **Open AWS App Runner Console**
   - Go to: https://console.aws.amazon.com/apprunner
   - Region: US East 1 (N. Virginia)
   - Click on service: `eonmeds-api-staging`

2. **Click "Configuration" Tab**

3. **Click "Edit" under Runtime Settings**

4. **Find or Add Environment Variable:**
   ```
   CORS_ORIGINS = http://localhost:3000,http://localhost:3001,https://d3p4f8m2bxony8.cloudfront.net,http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com
   ```

5. **Click "Save and Deploy"**

6. **Wait 3-5 minutes** for deployment

7. **Refresh your browser** - clients should appear!

---

### Option 2: AWS CLI (If you have permissions)

```bash
# Update with proper IAM credentials first
aws configure

# Then update the service
aws apprunner update-service \
  --service-arn "arn:aws:apprunner:us-east-1:148534177795:service/eonmeds-api-staging/b79bb7e959e84c7c8e7b3bd3c5e67a6f" \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "148534177795.dkr.ecr.us-east-1.amazonaws.com/eonmeds-backend:staging",
      "ImageConfiguration": {
        "Port": "8080",
        "RuntimeEnvironmentVariables": {
          "CORS_ORIGINS": "http://localhost:3000,http://localhost:3001,https://d3p4f8m2bxony8.cloudfront.net,http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com"
        }
      },
      "ImageRepositoryType": "ECR"
    }
  }' \
  --region us-east-1
```

---

### Option 3: Temporary Backend Fix (Immediate)

If you need it working RIGHT NOW, update the backend code to allow all origins temporarily:

1. Edit `packages/backend/src/index.ts`
2. Find the CORS configuration (around line 28-34)
3. Change to:
```javascript
// TEMPORARY - Allow all origins for testing
app.use(cors({
  origin: true,  // Allow ALL origins temporarily
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
  exposedHeaders: ['X-Total-Count']
}));
```
4. Deploy backend to App Runner

---

## 📊 What's Happening

### Current Status:
- ✅ **Database**: 1,605 patients exist
- ✅ **Frontend**: Deployed and working
- ✅ **Auth0**: Login successful
- ❌ **CORS**: Backend blocking CloudFront
- ❌ **Display**: No clients showing (due to CORS)

### The CORS Error:
```
Access to XMLHttpRequest at 'https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/patients' 
from origin 'https://d3p4f8m2bxony8.cloudfront.net' 
has been blocked by CORS policy
```

### Currently Allowed Origins:
- ✅ http://localhost:3000
- ✅ http://localhost:3001
- ✅ https://eonmeds-platform2025-production.up.railway.app (old Railway URL)
- ❌ https://d3p4f8m2bxony8.cloudfront.net (NEW CloudFront - NEEDS TO BE ADDED)

---

## ✅ Verification

After updating CORS, test with:

```bash
# This should return patients data
curl -H "Origin: https://d3p4f8m2bxony8.cloudfront.net" \
     -H "Accept: application/json" \
     https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/patients
```

---

## 🎯 Expected Result

Once CORS is fixed:
1. Browser console errors will disappear
2. Clients page will show all 1,605 patients
3. Full application functionality restored

---

## Need Help?

The issue is simple: The backend doesn't recognize the new CloudFront URL. Just add it to the allowed origins list and everything will work!

**Your CloudFront URL**: `https://d3p4f8m2bxony8.cloudfront.net`

This needs to be in the `CORS_ORIGINS` environment variable on App Runner.
