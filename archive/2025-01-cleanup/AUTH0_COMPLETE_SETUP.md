# 🔐 Auth0 Complete Setup & Login Guide

## 📍 Important: S3 Website URL Clarification

⚠️ **S3 static websites only support HTTP, not HTTPS**
- ❌ `https://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com` - **DOES NOT WORK**
- ✅ `http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com` - Works (HTTP only)
- ✅ `https://d3p4f8m2bxony8.cloudfront.net` - **USE THIS FOR HTTPS**

**For secure HTTPS access, use CloudFront:** `https://d3p4f8m2bxony8.cloudfront.net`

---

## 🔑 Login Credentials

### Option 1: Check Your Auth0 Dashboard for Existing Users
1. Go to: https://manage.auth0.com/
2. Select tenant: `dev-dvouayl22wlz8zwq.us.auth0.com`
3. Navigate to **User Management** → **Users**
4. Check if you have any existing users
5. If you forgot password, use "Forgot Password" on login page

### Option 2: Create a Test User in Auth0
1. In Auth0 Dashboard, go to **User Management** → **Users**
2. Click **"+ Create User"**
3. Enter:
   - Email: `test@eonmeds.com` (or your email)
   - Password: (create a strong password)
   - Connection: `Username-Password-Authentication`
4. Click **Create**
5. Use these credentials to login

### Option 3: Enable Self-Registration
1. In Auth0 Dashboard, go to **Authentication** → **Database**
2. Click on `Username-Password-Authentication`
3. Enable **"Disable Sign Ups"** toggle to OFF (allowing sign-ups)
4. Now users can register themselves at login page

---

## 📋 Complete Auth0 Dashboard URLs Update

### ⚠️ CRITICAL: Add ALL These URLs to Auth0

Go to Applications → Your App → Settings and add:

#### Allowed Callback URLs (ALL of these):
```
https://d3p4f8m2bxony8.cloudfront.net/callback
http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com/callback
http://localhost:3001/callback
https://eonmeds.com/callback
https://app.eonmeds.com/callback
```

#### Allowed Logout URLs (ALL of these):
```
https://d3p4f8m2bxony8.cloudfront.net
http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com
http://localhost:3001
https://eonmeds.com
https://app.eonmeds.com
```

#### Allowed Web Origins (ALL of these):
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

---

## 🌐 Your Application URLs

### Production (HTTPS - Recommended):
- **Frontend**: https://d3p4f8m2bxony8.cloudfront.net
- **Backend**: https://qm6dnecfhp.us-east-1.awsapprunner.com

### Staging (HTTP only):
- **Frontend**: http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com
- **Backend**: https://qm6dnecfhp.us-east-1.awsapprunner.com

### Local Development:
- **Frontend**: http://localhost:3001 (NOT 3000 - that's PHARMAX)
- **Backend**: https://qm6dnecfhp.us-east-1.awsapprunner.com

---

## 🧪 Test Login Flow

### 1. Test on CloudFront (HTTPS):
```bash
# Open in browser
open https://d3p4f8m2bxony8.cloudfront.net
```

### 2. Test on S3 (HTTP):
```bash
# Open in browser (HTTP only)
open http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com
```

### 3. Test Locally:
```bash
cd packages/frontend
npm start
# Opens at http://localhost:3001
```

---

## 🔧 Quick Troubleshooting

### If login doesn't work:
1. **Check Browser Console** for errors (F12 → Console)
2. **Verify Auth0 URLs** are all added correctly
3. **Clear browser cache** and cookies
4. **Check Auth0 Logs**: Dashboard → Monitoring → Logs

### Common Issues:
- **"Callback URL mismatch"** → Add URL to Auth0 settings
- **"CORS error"** → Add origin to Allowed Web Origins
- **"Unable to login"** → Check if user exists in Auth0
- **S3 HTTPS not working** → Use CloudFront URL instead

---

## 📝 Creating Admin User

If you need an admin user with special roles:

1. Create user in Auth0 (as above)
2. Go to **User Management** → **Users**
3. Click on the user
4. Go to **Roles** tab
5. Click **"Assign Roles"**
6. Create/assign roles like:
   - `admin`
   - `provider`
   - `patient`

---

## ✅ Verification Checklist

- [ ] Auth0 Dashboard has all URLs added
- [ ] User account exists in Auth0
- [ ] CloudFront URL works: https://d3p4f8m2bxony8.cloudfront.net
- [ ] Login redirects properly
- [ ] API calls work after login
- [ ] Logout works correctly

---

## 🆘 Need Help?

1. Check Auth0 Logs for errors
2. Verify all environment variables are correct
3. Ensure frontend is using correct Auth0 tenant
4. Check browser console for JavaScript errors

**Your Auth0 Tenant**: `dev-dvouayl22wlz8zwq.us.auth0.com`
**Your Client ID**: `VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L`
