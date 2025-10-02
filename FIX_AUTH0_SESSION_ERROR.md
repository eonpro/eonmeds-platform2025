# 🔧 Fix Auth0 Session/Cookie Error

## Error: "invalid_request" - Session/Cookie Issues

This error happens when there are authentication conflicts. Here's how to fix it:

---

## ✅ QUICK FIX STEPS:

### 1️⃣ Clear Browser Data
1. Open Chrome/Safari/Firefox
2. Clear ALL cookies and cache for these domains:
   - `dev-dvouayl22wlz8zwq.us.auth0.com`
   - `d3p4f8m2bxony8.cloudfront.net`
   - `eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com`
3. Or use Incognito/Private mode (easier!)

### 2️⃣ Use a Fresh Browser Session
**Recommended**: Open an Incognito/Private window:
- Chrome: Cmd+Shift+N (Mac) or Ctrl+Shift+N (Windows)
- Safari: Cmd+Shift+N
- Firefox: Cmd+Shift+P

### 3️⃣ Use the Correct URL
Go directly to: https://d3p4f8m2bxony8.cloudfront.net

**Don't use**: Back button, refresh during login, or multiple tabs

---

## 🎯 COMPLETE FRESH START:

### Step 1: Open Incognito Window
Open a new incognito/private browser window

### Step 2: Go Directly to App
Navigate to: https://d3p4f8m2bxony8.cloudfront.net

### Step 3: Click Login Once
Click the login button ONLY ONCE

### Step 4: Create or Use Existing User
- If you haven't created a user yet, create one in Auth0 first
- If you have a user, enter credentials

---

## 🛠️ If Error Persists - Check Auth0 Settings:

### 1. Verify Application Type
1. Go to: https://manage.auth0.com/
2. Applications → Your App → Settings
3. Check "Application Type" is set to: **Single Page Application**

### 2. Check Token Settings
In the same Settings page:
- Token Endpoint Authentication Method: **None**
- Grant Types: Should include **Authorization Code** and **Refresh Token**

### 3. Advanced Settings
Scroll to bottom → Advanced Settings → OAuth:
- OIDC Conformant: **ON**
- JsonWebToken Signature Algorithm: **RS256**

---

## 🔍 Common Causes:

1. **Multiple login attempts** - Wait 30 seconds between attempts
2. **Old cookies** - Clear browser data
3. **Back button during login** - Don't use back button
4. **Multiple tabs** - Use only one tab for login
5. **Cached redirect** - Clear cache and try again

---

## 💡 Alternative Solution - Test Locally:

```bash
# Test with local development
cd packages/frontend
npm start
# Opens at http://localhost:3001
```

Local development sometimes bypasses cookie issues.

---

## ✅ Working Test Flow:

1. Open new incognito window
2. Go to: https://d3p4f8m2bxony8.cloudfront.net
3. Click Login
4. You should see Auth0 login page
5. Enter credentials (create user first if needed)
6. Should redirect back to app

---

## 🚨 Still Not Working?

Try this diagnostic URL to test Auth0 directly:
```
https://dev-dvouayl22wlz8zwq.us.auth0.com/authorize?
  client_id=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L&
  redirect_uri=https://d3p4f8m2bxony8.cloudfront.net/callback&
  scope=openid profile email&
  response_type=code&
  response_mode=query
```

If this works, the issue is in the frontend app.
If this fails, the issue is in Auth0 configuration.
