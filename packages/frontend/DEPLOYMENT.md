# Frontend Deployment Guide - Railway

## Prerequisites
- Railway account
- GitHub repository connected to Railway
- Backend already deployed to Railway

## Deployment Steps

### 1. Create New Railway Service
1. Go to your Railway project dashboard
2. Click "New Service"
3. Select "GitHub Repo"
4. Choose the `eonmeds-platform2025` repository
5. Select the `main` branch

### 2. Configure Service Settings
1. In the service settings, set:
   - **Service Name**: `eonmeds-frontend`
   - **Root Directory**: `/packages/frontend`
   - **Watch Paths**: `/packages/frontend/**`

### 3. Configure Environment Variables
Add the following environment variables in Railway:

```bash
# API Configuration
REACT_APP_API_URL=https://eonmeds-platform2025-production.up.railway.app
REACT_APP_API_BASE_URL=https://eonmeds-platform2025-production.up.railway.app/api/v1

# Auth0 Configuration (replace with your actual values)
REACT_APP_AUTH0_DOMAIN=your-tenant.auth0.com
REACT_APP_AUTH0_CLIENT_ID=your-client-id
REACT_APP_AUTH0_AUDIENCE=https://api.eonmeds.com

# Optional
REACT_APP_DEBUG=false
```

### 4. Deploy
1. Railway will automatically detect the `railway.toml` configuration
2. The build will start automatically
3. Monitor the build logs for any errors
4. Once deployed, Railway will provide a URL like: `https://eonmeds-frontend-production.up.railway.app`

### 5. Post-Deployment Configuration

#### Update Auth0 Settings
1. Go to Auth0 Dashboard
2. Navigate to your application settings
3. Add the Railway frontend URL to:
   - **Allowed Callback URLs**: `https://your-frontend-url.railway.app/callback`
   - **Allowed Logout URLs**: `https://your-frontend-url.railway.app`
   - **Allowed Web Origins**: `https://your-frontend-url.railway.app`

#### Update Backend CORS (if needed)
If you want to restrict CORS, update the backend's `CORS_ORIGIN` environment variable to include your frontend URL.

### 6. Verify Deployment
1. Visit the Railway-provided URL
2. Check browser console for any errors
3. Test the login flow
4. Verify API calls are working

## Troubleshooting

### Build Failures
- Check build logs in Railway dashboard
- Ensure all dependencies are in `package.json` (not devDependencies)
- Verify Node version compatibility

### Runtime Errors
- Check browser console for errors
- Verify all environment variables are set correctly
- Check network tab for failed API requests

### Auth0 Issues
- Ensure all URLs are added to Auth0 settings
- Check that environment variables match Auth0 configuration
- Verify the audience parameter matches your API

## Monitoring
- Railway provides logs for your application
- Set up health checks in Railway for uptime monitoring
- Consider adding error tracking (Sentry, etc.)

## Updates
To update the deployed frontend:
1. Make changes locally
2. Commit and push to GitHub
3. Railway will automatically rebuild and redeploy 