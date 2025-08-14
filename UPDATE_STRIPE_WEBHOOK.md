# ⚠️ IMPORTANT: Update Stripe Webhook URL

The webhook URL currently configured in Stripe is not working. You need to update it.

## Current Status
- **Configured URL** (Not Working): `https://eonmeds-platform2025-production.up.railway.app/api/v1/webhooks/stripe`
- **Working URL**: `https://eonmeds-platform2025-production.up.railway.app/api/v1/payments/webhook/stripe`

## Steps to Fix

1. **Go back to Stripe Dashboard**
   - https://dashboard.stripe.com/webhooks
   - Click on your webhook endpoint

2. **Update the Endpoint URL**
   - Click "Edit destination" or the edit button
   - Change the URL from:
     ```
     https://eonmeds-platform2025-production.up.railway.app/api/v1/webhooks/stripe
     ```
   - To:
     ```
     https://eonmeds-platform2025-production.up.railway.app/api/v1/payments/webhook/stripe
     ```

3. **Save the changes**

4. **The signing secret remains the same**: `whsec_hv94xzS2J5E1y8qgvfGhFSPYW7q5Z7Vy`
   (Already set in Railway)

## Why This Is Necessary

Our testing revealed that:
- `/api/v1/webhooks/stripe` → 404 Not Found
- `/api/v1/payments/webhook/stripe` → Working (returns signature error as expected)

The working endpoint is registered directly in the Express app before body parsing middleware, which is required for Stripe webhooks to work properly.
