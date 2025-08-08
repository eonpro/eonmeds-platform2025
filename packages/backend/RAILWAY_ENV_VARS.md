# Required Backend Environment Variables for Railway

Add these environment variables to your Railway backend service:

## Auth0 Configuration (REQUIRED for SOAP notes)
- `AUTH0_DOMAIN` - Your Auth0 domain (e.g., `dev-dvouayl22wlz8zwq.us.auth0.com`)
- `AUTH0_AUDIENCE` - Your Auth0 API audience (e.g., `https://api.eonmeds.com`)
- `AUTH0_CLIENT_ID` - Your Auth0 application client ID (same as frontend)
- `AUTH0_CLIENT_SECRET` - Your Auth0 application client secret

## Database Configuration
- `DATABASE_URL` - PostgreSQL connection string (usually auto-configured by Railway)

## Security
- `JWT_SECRET` - A secure random string for JWT signing

## AI Configuration (for SOAP notes)
- `OPENAI_API_KEY` - Your OpenAI API key for SOAP note generation

## Stripe Configuration (optional)
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook signing secret
- `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key

## IMPORTANT: After adding these variables

1. Railway will automatically redeploy
2. Wait for the deployment to complete (2-3 minutes)
3. Clear your browser cache and local storage
4. Log out and log back in
5. SOAP notes will work!

The build errors you're seeing are because the Auth0 middleware can't initialize without these environment variables. 