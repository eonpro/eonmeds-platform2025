# Update Stripe Webhook URLs Guide

## 🔄 Stripe Webhook Configuration

Now that your backend is running on AWS App Runner, you need to update your Stripe webhook endpoints.

### Current Setup
- **Old Railway URL**: `https://eonmeds-platform2025-production.up.railway.app/api/v1/payments/webhook/stripe`
- **New App Runner URL**: `https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/payments/webhook/stripe`

### Steps to Update Stripe Webhooks

1. **Go to Stripe Dashboard**
   - Visit: https://dashboard.stripe.com/webhooks
   - Or navigate: Dashboard → Developers → Webhooks

2. **Find Your Current Webhook**
   - Look for the webhook pointing to Railway URL
   - It should be listening to events like:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

3. **Update the Endpoint URL**
   - Click on the webhook endpoint
   - Click "Update details" or edit icon
   - Change the URL to: `https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/payments/webhook/stripe`
   - Keep the same webhook signing secret (already stored in AWS Secrets Manager)

4. **Alternative: Create New Webhook (Recommended for Testing)**
   - Click "+ Add endpoint"
   - URL: `https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/payments/webhook/stripe`
   - Select events to listen to (same as above)
   - Click "Add endpoint"
   - Copy the new signing secret
   - Update AWS Secrets Manager if using new webhook:
     ```bash
     aws secretsmanager update-secret \
       --secret-id /eonmeds/api/stripe \
       --secret-string '{
         "secretKey": "sk_live_51RPS5NGzKhM7c2eG...",
         "webhookSecret": "NEW_WEBHOOK_SECRET_HERE"
       }' \
       --region us-east-1
     ```

5. **Test the Webhook**
   - In Stripe Dashboard, click "Send test webhook"
   - Select any event type (e.g., `payment_intent.succeeded`)
   - Click "Send test webhook"
   - You should see a successful response (200 OK)

### Verify Webhook is Working

Run this command to check recent webhook events:
```bash
curl -s https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/webhooks/test
```

### Important Notes

- The App Runner endpoint is NOT blocked by JWT authentication (major improvement!)
- Keep the Railway webhook active for a few days as backup
- Monitor both webhooks during transition
- Once verified, disable the old Railway webhook

### Webhook Security

Your webhook endpoint verifies the Stripe signature to ensure requests are legitimate. The signing secret is stored securely in AWS Secrets Manager and loaded automatically by App Runner.

## Next: Test Complete Billing Flow

Once webhooks are updated, you can test the complete billing flow with real transactions!
