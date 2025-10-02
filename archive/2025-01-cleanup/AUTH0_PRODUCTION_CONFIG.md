# 🔐 **Auth0 Production Configuration Guide**

## **CRITICAL SECURITY NOTE**
⚠️ **CLIENT SECRET EXPOSED**: `-m-_pXKhsatTz88dK1jG7LLruSgsikaf9vQRjFQIDODjzKyL3d3F_xsJctwMpVz6`
- **Action Required**: Rotate this secret immediately after configuration
- Single Page Applications (SPAs) should NOT use client secrets
- Client secrets are only for server-side applications

---

## **Correct Auth0 Settings for Production**

### **1. Basic Information** ✅
```
Name: EONMeds Web App (or EONPRO Web App)
Domain: dev-dvouayl22wlz8zwq.us.auth0.com
Client ID: VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L
Application Type: Single Page Application
```

### **2. Application URIs**
```
Application Login URI: https://d3p4f8m2bxony8.cloudfront.net
```

### **3. Allowed Callback URLs** (CLEAN THIS UP)
```
https://d3p4f8m2bxony8.cloudfront.net/callback
http://localhost:3001/callback
```
**REMOVE THESE:**
- ❌ `http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com/callback`
- ❌ `https://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com/callback`

### **4. Allowed Logout URLs** (CLEAN THIS UP)
```
https://d3p4f8m2bxony8.cloudfront.net
http://localhost:3001
```
**REMOVE THESE:**
- ❌ `http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com`
- ❌ `https://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com`

### **5. Allowed Web Origins** (CLEAN THIS UP)
```
https://d3p4f8m2bxony8.cloudfront.net
http://localhost:3001
```
**REMOVE THESE:**
- ❌ `http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com`
- ❌ `https://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com`

### **6. Cross-Origin Authentication**
- **Allow Cross-Origin Authentication**: ✅ Enabled (Keep as is)

### **7. Allowed Origins (CORS)**
```
https://d3p4f8m2bxony8.cloudfront.net
http://localhost:3001
```

### **8. ID Token Expiration**
- **Maximum ID Token Lifetime**: 36000 seconds (10 hours) ✅

### **9. Refresh Token Settings**
- **Refresh Token Rotation**: ✅ Enabled
- **Refresh Token Expiration**: 
  - Idle Lifetime: 1296000 seconds (15 days)
  - Maximum Lifetime: 2592000 seconds (30 days)
- **Rotation Overlap Period**: 0 seconds

---

## **Why These Changes?**

### **Security Best Practices:**

1. **No S3 Website URLs**: 
   - S3 websites don't support HTTPS by default
   - CloudFront provides SSL/TLS encryption
   - Better caching and performance

2. **HTTPS Only in Production**:
   - All production URLs must use HTTPS
   - HTTP only allowed for localhost development

3. **Client Secret Not Needed**:
   - SPAs are public clients
   - Cannot securely store secrets
   - Use PKCE flow instead

4. **Consistent URL Strategy**:
   - Production: CloudFront only
   - Development: localhost:3001 only
   - No mixing of deployment methods

---

## **Implementation Steps**

### **Step 1: Update Auth0 Dashboard**
1. Go to Applications → EONMeds Web App → Settings
2. Update all URL fields as specified above
3. Click "Save Changes" at the bottom

### **Step 2: Rotate Client Secret** (CRITICAL)
1. Go to Settings tab
2. Click "Rotate Secret"
3. Confirm rotation
4. The old secret will be invalidated

### **Step 3: Update Frontend Configuration**
