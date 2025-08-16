# Railway Environment Variable Update

## Stripe Webhook Signing Secret

Add this environment variable to your Railway backend service:

```
STRIPE_WEBHOOK_SECRET=whsec_3I3mCp3g2kd50an0PpgQJuBqUfNKGGYv
```

## How to Add in Railway:

1. Go to your Railway project
2. Click on the backend service (eonmeds-platform2025)
3. Go to the "Variables" tab
4. Click "New Variable"
5. Add:
   - Key: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_3I3mCp3g2kd50an0PpgQJuBqUfNKGGYv`
6. The service will automatically redeploy with the new variable

## Verify Webhook is Working:

Once the environment variable is set, you can test the webhook:

1. Create a test invoice in Stripe Dashboard
2. Check the webhook events in Stripe Dashboard under Developers → Webhooks → Your endpoint
3. Look for successful (200) responses

## Current Stripe Environment Variables:

Make sure you have all these set in Railway:

- `STRIPE_SECRET_KEY` - Your Stripe secret key (live or test)
- `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - The webhook signing secret above

## Security Note:

⚠️ **Important**: The webhook signing secret is sensitive. Only use it in your backend environment variables, never expose it in frontend code or commit it to version control.
