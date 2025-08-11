# Railway Environment Variables Checklist

## Backend Environment Variables

### Core Configuration

- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = (Railway will set this automatically)
- [ ] `API_VERSION` = `v1`

### Database (PostgreSQL)

- [ ] `DATABASE_URL` = (Railway PostgreSQL connection string)
- [ ] `DB_HOST` = (from Railway PostgreSQL)
- [ ] `DB_PORT` = (from Railway PostgreSQL)
- [ ] `DB_NAME` = (from Railway PostgreSQL)
- [ ] `DB_USER` = (from Railway PostgreSQL)
- [ ] `DB_PASSWORD` = (from Railway PostgreSQL)

### Auth0 Configuration

- [ ] `AUTH0_DOMAIN` = `dev-dvouayl22wlz8zwq.us.auth0.com`
- [ ] `AUTH0_AUDIENCE` = `https://api.eonmeds.com`
- [ ] `AUTH0_CLIENT_ID` = `VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L`
- [ ] `AUTH0_ISSUER` = `https://dev-dvouayl22wlz8zwq.us.auth0.com/`

### Stripe Configuration

- [ ] `STRIPE_SECRET_KEY` = (Your Stripe secret key)
- [ ] `STRIPE_WEBHOOK_SECRET` = (Your Stripe webhook endpoint secret)
- [ ] `STRIPE_TRIAL_DAYS` = `0`
- [ ] `INVOICE_DUE_DAYS` = `30`

### Stripe Product IDs

- [ ] `STRIPE_PRODUCT_WEIGHT_LOSS_MONTHLY` = (Your product ID)
- [ ] `STRIPE_PRODUCT_WEIGHT_LOSS_QUARTERLY` = (Your product ID)
- [ ] `STRIPE_PRODUCT_TESTOSTERONE_MONTHLY` = (Your product ID)
- [ ] `STRIPE_PRODUCT_TESTOSTERONE_QUARTERLY` = (Your product ID)

### Stripe Price IDs

- [ ] `STRIPE_PRICE_WEIGHT_LOSS_MONTHLY` = (Your price ID)
- [ ] `STRIPE_PRICE_WEIGHT_LOSS_QUARTERLY` = (Your price ID)
- [ ] `STRIPE_PRICE_TESTOSTERONE_MONTHLY` = (Your price ID)
- [ ] `STRIPE_PRICE_TESTOSTERONE_QUARTERLY` = (Your price ID)

### AI Service

- [ ] `OPENAI_API_KEY` = (Your OpenAI API key for SOAP notes)

### Security & Session

- [ ] `JWT_SECRET` = (Generate a secure random string)
- [ ] `JWT_EXPIRES_IN` = `7d`
- [ ] `REFRESH_TOKEN_EXPIRES_IN` = `30d`
- [ ] `BCRYPT_ROUNDS` = `10`
- [ ] `SESSION_SECRET` = (Generate a secure random string)

### CORS

- [ ] `CORS_ORIGIN` = `https://intuitive-learning-production.up.railway.app`

### Logging & Rate Limiting

- [ ] `LOG_LEVEL` = `info`
- [ ] `RATE_LIMIT_WINDOW_MS` = `900000`
- [ ] `RATE_LIMIT_MAX_REQUESTS` = `100`

### HeyFlow Webhook (if using)

- [ ] `HEYFLOW_WEBHOOK_SECRET` = (Your HeyFlow webhook secret)

## Frontend Environment Variables

### Auth0 Configuration (in build settings)

- [ ] `REACT_APP_AUTH0_DOMAIN` = `dev-dvouayl22wlz8zwq.us.auth0.com`
- [ ] `REACT_APP_AUTH0_CLIENT_ID` = `VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L`
- [ ] `REACT_APP_AUTH0_AUDIENCE` = `https://api.eonmeds.com`

### API Configuration

- [ ] `REACT_APP_API_URL` = (Your backend Railway URL, e.g., `https://your-backend.up.railway.app`)

### Stripe Public Key

- [ ] `REACT_APP_STRIPE_PUBLISHABLE_KEY` = (Your Stripe publishable key)

## How to Set in Railway

1. Go to your Railway project
2. Select the service (backend or frontend)
3. Go to the "Variables" tab
4. Click "Raw Editor"
5. Paste all variables in KEY=value format
6. Save and redeploy

## Generating Secure Secrets

For `JWT_SECRET` and `SESSION_SECRET`, use:

```bash
openssl rand -base64 32
```

## Important Notes

1. Never commit these values to Git
2. Use different values for production vs development
3. Rotate secrets regularly
4. Monitor for exposed secrets in logs
