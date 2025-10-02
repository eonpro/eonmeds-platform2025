# N8N for EONMeds

This is the N8N workflow automation service for EONMeds platform.

## Access

Once deployed, N8N will be accessible at your Railway URL with:
- Username: `admin`
- Password: `398Xakf$57`

## Key Features

- Patient onboarding automation from Heyflow
- Stripe payment processing workflows
- Automated billing and invoicing
- Email/SMS notifications
- Financial reporting

## Environment Variables

All environment variables are set in Railway:
- `N8N_BASIC_AUTH_ACTIVE`: Enable basic authentication
- `N8N_BASIC_AUTH_USER`: Admin username
- `N8N_BASIC_AUTH_PASSWORD`: Admin password
- `N8N_ENCRYPTION_KEY`: For encrypting credentials
- `N8N_PROTOCOL`: HTTPS for production
- `GENERIC_TIMEZONE`: America/New_York

## Deployment

Deploy to Railway with:
```bash
railway up
```

## First Workflow

After deployment, create your first workflow:
1. Login to N8N
2. Create new workflow
3. Add Webhook trigger
4. Test with Heyflow integration

## Support

For issues, check the N8N logs in Railway dashboard.

---

Copyright © 2025 EONMeds. All rights reserved.
