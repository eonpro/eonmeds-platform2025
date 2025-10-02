# Auth0 Configuration Fix Guide

## Current Issue
The Auth0 login is showing "Oops, something went wrong" error. This is typically caused by:
1. Incorrect redirect URI configuration
2. Mismatched Auth0 application settings
3. Missing or incorrect environment variables

## Immediate Fixes Applied

### 1. Dynamic Redirect URI
Updated `packages/frontend/src/providers/Auth0Provider.tsx` to use dynamic redirect URI:
- Now uses `window.location.origin + '/callback'` in production
- This ensures the redirect URI matches your actual deployment URL

## Required Actions in Auth0 Dashboard

### 1. Update Allowed Callback URLs
1. Go to your Auth0 Dashboard
2. Navigate to **Applications** > Select your application
3. In the **Settings** tab, find **Allowed Callback URLs**
4. Add these URLs (replace with your actual domains):
   ```
   http://localhost:3000/callback
   https://eonmeds-platform2025-production.up.railway.app/callback
   https://intuitive-learning-production.up.railway.app/callback
   ```

### 2. Update Allowed Logout URLs
In the same settings page, add to **Allowed Logout URLs**:
```
http://localhost:3000
https://eonmeds-platform2025-production.up.railway.app
https://intuitive-learning-production.up.railway.app
```

### 3. Update Allowed Web Origins
Add to **Allowed Web Origins**:
```
http://localhost:3000
https://eonmeds-platform2025-production.up.railway.app
https://intuitive-learning-production.up.railway.app
```

### 4. Update Allowed Origins (CORS)
Add to **Allowed Origins (CORS)**:
```
http://localhost:3000
https://eonmeds-platform2025-production.up.railway.app
https://intuitive-learning-production.up.railway.app
```

## Environment Variables on Railway

Make sure these are set in your Railway frontend service:

```
REACT_APP_AUTH0_DOMAIN=dev-dvouayi22wiz8zwq.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=<your-client-id>
REACT_APP_AUTH0_AUDIENCE=https://eonmeds-api
REACT_APP_AUTH0_REDIRECT_URI=https://eonmeds-platform2025-production.up.railway.app/callback
```

## Verification Steps

1. **Check Auth0 Application Type**:
   - Should be set to "Single Page Application"

2. **Check Grant Types**:
   - Ensure these are enabled:
     - Authorization Code
     - Refresh Token
     - Implicit (for backward compatibility)

3. **Token Settings**:
   - Refresh Token Rotation: Enabled
   - Refresh Token Expiration: Absolute lifetime

## Debugging Tips

1. **Check Browser Console**:
   - Look for specific error messages
   - Check network tab for failed requests

2. **Auth0 Logs**:
   - Go to Auth0 Dashboard > Monitoring > Logs
   - Look for failed login attempts

3. **Test Locally First**:
   - Ensure login works on localhost:3000
   - Then test on production

## Common Error Messages

- **"Callback URL mismatch"**: Update Allowed Callback URLs in Auth0
- **"CORS error"**: Update Allowed Origins in Auth0
- **"Invalid state"**: Clear browser cache/cookies
- **"Missing configuration"**: Check environment variables

## Next Steps

1. Apply the Auth0 Dashboard changes above
2. Redeploy the frontend with the updated code
3. Clear browser cache and cookies
4. Try logging in again

If issues persist, check the Auth0 logs for specific error details.
