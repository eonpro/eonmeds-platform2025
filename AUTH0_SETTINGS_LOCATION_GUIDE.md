# 📍 Where to Find Web Origins (CORS) in Auth0

## Step-by-Step Guide with Exact Locations

### 1️⃣ Login to Auth0
Go to: https://manage.auth0.com/

### 2️⃣ Select Your Tenant
Make sure you're in: `dev-dvouayl22wlz8zwq.us.auth0.com`

### 3️⃣ Navigate to Applications
In the left sidebar, click: **Applications** → **Applications**

### 4️⃣ Find Your App
Look for the app with Client ID: `VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L`
Click on it to open.

### 5️⃣ Go to Settings Tab
You'll see tabs at the top:
- **Quick Start**
- **Settings** ← CLICK THIS
- **Credentials**
- **Connections**
- etc.

### 6️⃣ Scroll Down to Find These Fields

In the Settings tab, scroll down and you'll find these sections IN THIS ORDER:

#### 📍 Application URIs Section:

1. **Application Login URI** (optional - skip this)

2. **Allowed Callback URLs** 📍
   - This is a text area
   - Add these URLs (one per line):
   ```
   https://d3p4f8m2bxony8.cloudfront.net/callback
   http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com/callback
   http://localhost:3001/callback
   ```

3. **Allowed Logout URLs** 📍
   - Another text area below Callback URLs
   - Add these URLs (one per line):
   ```
   https://d3p4f8m2bxony8.cloudfront.net
   http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com
   http://localhost:3001
   ```

4. **Allowed Web Origins** 📍 ← THIS IS THE CORS SETTING!
   - This is the field you're looking for
   - Add these URLs (one per line):
   ```
   https://d3p4f8m2bxony8.cloudfront.net
   http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com
   http://localhost:3001
   ```

5. **Allowed Origins (CORS)** 📍 (if present)
   - Some Auth0 tenants show this separately
   - If you see it, add the same URLs as Web Origins

### 7️⃣ SAVE CHANGES
**IMPORTANT**: Scroll to the BOTTOM of the page and click the blue **"Save Changes"** button

---

## 🎯 Quick Visual Guide

```
Auth0 Dashboard
├── Applications (left sidebar)
│   └── Applications
│       └── Your App (VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L)
│           └── Settings Tab
│               ├── Basic Information
│               ├── Application URIs
│               │   ├── Allowed Callback URLs ← Add URLs here
│               │   ├── Allowed Logout URLs ← Add URLs here
│               │   └── Allowed Web Origins ← ADD CORS URLs HERE! 
│               └── [Save Changes] button at bottom
```

---

## ⚠️ Common Mistakes to Avoid

1. **Don't forget to scroll down** - Web Origins is below Callback/Logout URLs
2. **Enter one URL per line** - Don't use commas or spaces to separate
3. **Include both HTTP and HTTPS** versions where needed
4. **Don't forget to SAVE** - The save button is at the very bottom
5. **Check the right tenant** - Make sure you're in dev-dvouayl22wlz8zwq.us.auth0.com

---

## 🔍 Can't Find It?

If you don't see "Allowed Web Origins":
1. Try scrolling further down
2. Look for "Cross-Origin Authentication" section
3. Check under "Advanced Settings" at the bottom (click to expand)
4. Some older Auth0 UIs have it under "CORS" directly

---

## ✅ What to Put in Each Field

### Allowed Web Origins (CORS) - COPY THIS EXACTLY:
```
https://d3p4f8m2bxony8.cloudfront.net
http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com
http://localhost:3001
```

**Note**: 
- These are the domains that can make requests to Auth0
- This fixes CORS errors
- Must match exactly where your app is hosted
