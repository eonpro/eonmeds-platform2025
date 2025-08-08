# Auth0 Setup for Railway Deployment

## Required Environment Variables

Make sure these environment variables are set in your Railway deployment:

1. **AUTH0_DOMAIN** - Your Auth0 domain (e.g., `your-tenant.us.auth0.com`)
2. **AUTH0_AUDIENCE** - Your Auth0 API audience (e.g., `https://api.eonmeds.com`)
3. **AUTH0_CLIENT_ID** - Your Auth0 application client ID
4. **AUTH0_CLIENT_SECRET** - Your Auth0 application client secret
5. **JWT_SECRET** - A secure random string for JWT signing

## Setting Environment Variables in Railway

1. Go to your Railway project dashboard
2. Click on the backend service
3. Go to the "Variables" tab
4. Add each of the above variables with their corresponding values

## Fixing the Authentication Issue

If you're getting "Missing Refresh Token" or 401 Unauthorized errors:

1. **Clear your browser's local storage**:
   - Open Developer Tools (F12)
   - Go to Application tab
   - Find Local Storage for your domain
   - Clear all Auth0 related entries

2. **Log out and log back in**:
   - This will request a new token with the proper scopes
   - Make sure the login includes the `offline_access` scope

3. **Verify Auth0 Application Settings**:
   - In Auth0 Dashboard, go to Applications
   - Check that your application has these settings:
     - Application Type: Single Page Application
     - Allowed Callback URLs includes your production URL
     - Allowed Logout URLs includes your production URL
     - Allowed Web Origins includes your production URL
     - Refresh Token Rotation is enabled
     - Refresh Token Expiration is set appropriately

## Testing the Fix

After setting the environment variables and redeploying:

1. Clear browser cache and local storage
2. Log out completely
3. Log back in
4. Try generating a SOAP note again

The SOAP notes should now work properly! 