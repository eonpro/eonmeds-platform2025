# Railway Backend Environment Variables

Add these to your Railway backend service (eonmeds-platform2025):

```
AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
AUTH0_AUDIENCE=https://api.eonmeds.com
AUTH0_CLIENT_ID=VPA89aq0Y7N0SGvX5KqkDm5JLXPknG0L
AUTH0_CLIENT_SECRET=(get this from Auth0 dashboard)
JWT_SECRET=eon-meds-jwt-secret-2024-secure-key
OPENAI_API_KEY=(your OpenAI API key)
```

## How to Add Variables in Railway:

1. Go to Railway dashboard
2. Click on your backend service (eonmeds-platform2025)
3. Go to "Variables" tab
4. Click "Raw Editor"
5. Add the variables above
6. Click "Save"
7. Railway will automatically redeploy

## Important Notes:

- The `AUTH0_CLIENT_SECRET` needs to be obtained from your Auth0 dashboard
- These values must match what's configured in your frontend
- After adding variables, Railway will redeploy automatically (2-3 minutes)
- After deployment completes, clear browser data and login again 