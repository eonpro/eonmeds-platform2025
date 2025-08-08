# Complete Stripe Integration Setup Checklist

## 🔍 Overview
This document provides a comprehensive checklist to ensure your Stripe integration is properly configured to handle all payment scenarios, especially external payments via link/QR code.

## ✅ Required Environment Variables

### Backend (.env)
```bash
# Core Stripe Configuration
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY  # Or sk_test_ for testing
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY  # Or pk_test_ for testing

# Product Configuration (Optional but recommended)
STRIPE_PRODUCT_WEIGHT_LOSS_MONTHLY=prod_xxx
STRIPE_PRODUCT_WEIGHT_LOSS_QUARTERLY=prod_xxx
STRIPE_PRODUCT_TESTOSTERONE_MONTHLY=prod_xxx
STRIPE_PRODUCT_TESTOSTERONE_QUARTERLY=prod_xxx

# Price IDs (Optional but recommended)
STRIPE_PRICE_WEIGHT_LOSS_MONTHLY=price_xxx
STRIPE_PRICE_WEIGHT_LOSS_QUARTERLY=price_xxx
STRIPE_PRICE_TESTOSTERONE_MONTHLY=price_xxx
STRIPE_PRICE_TESTOSTERONE_QUARTERLY=price_xxx
```

### Frontend (.env)
```bash
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY  # Or pk_test_ for testing
REACT_APP_API_URL=https://your-backend-url.com
```

## 🔐 Stripe Dashboard Configuration

### 1. Webhook Endpoint Setup
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/v1/payments/webhook/stripe`
3. Select events to listen for:

#### Required Events:
- [ ] `checkout.session.completed` - For payment link/QR completions
- [ ] `charge.succeeded` - For direct charges
- [ ] `payment_intent.succeeded` - For payment intents
- [ ] `customer.created` - New customer registration
- [ ] `customer.updated` - Customer info changes
- [ ] `customer.subscription.created` - New subscriptions
- [ ] `customer.subscription.updated` - Subscription changes
- [ ] `customer.subscription.deleted` - Cancellations
- [ ] `invoice.created` - New invoices
- [ ] `invoice.finalized` - Invoice ready for payment
- [ ] `invoice.paid` - Successful invoice payment
- [ ] `invoice.payment_failed` - Failed payments

### 2. Payment Links Configuration
1. Create payment links for your services
2. Add metadata to each payment link:
   ```json
   {
     "service_type": "weight_loss",
     "billing_period": "monthly",
     "form_type": "external_stripe"
   }
   ```

### 3. Customer Portal Configuration
1. Enable Customer Portal in Stripe Dashboard
2. Configure allowed actions:
   - [ ] Update payment methods
   - [ ] Cancel subscriptions
   - [ ] View invoices
   - [ ] Update billing address

## 📊 Database Tables Required

### Verify these tables exist:
```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'patients',
  'invoices', 
  'invoice_items',
  'invoice_payments',
  'webhook_events',
  'service_packages'
);
```

### Required Patient Columns:
```sql
-- Check patient columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'patients' 
AND column_name IN (
  'stripe_customer_id',
  'subscription_id',
  'subscription_status',
  'membership_hashtags'
);
```

## 🧪 Testing Checklist

### 1. Test External Payment Flow
```bash
# Test with Stripe CLI
stripe listen --forward-to localhost:3002/api/v1/payments/webhook/stripe

# In another terminal, trigger test event
stripe trigger checkout.session.completed
```

### 2. Test Card Numbers
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### 3. Verify Patient Creation
1. Make external payment via Stripe link
2. Check database:
```sql
-- Find latest patient
SELECT patient_id, email, status, membership_hashtags, stripe_customer_id
FROM patients 
WHERE form_type = 'external_stripe'
ORDER BY created_at DESC 
LIMIT 1;
```

### 4. Verify Invoice Creation
```sql
-- Check invoice was created
SELECT * FROM invoices 
WHERE stripe_customer_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 1;
```

## 🚨 Common Issues & Solutions

### 1. Webhook Signature Verification Failing
**Solution**: Ensure you're using the raw body:
```javascript
// Correct
app.post('/webhook', express.raw({type: 'application/json'}), handler);

// Incorrect
app.post('/webhook', express.json(), handler);
```

### 2. Patients Not Moving to Subscriptions
**Check**:
- Patient status update logic in webhook handler
- Hashtag array operations
- Database permissions

### 3. Missing Customer Email
**Solution**: Ensure payment links collect email:
- Enable "Collect customer email" in payment link settings
- Add fallback email generation for anonymous payments

## 🔄 Production Deployment

### Railway Environment Variables
Add all variables from `.env` to Railway:
1. Go to Railway Dashboard → Your Project → Variables
2. Add each variable (bulk import available)
3. Deploy and verify webhook endpoint

### Verify Webhook URL
```bash
# Test production webhook
curl -X POST https://your-domain.railway.app/api/v1/payments/webhook/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## 📈 Monitoring & Logging

### 1. Check Webhook Events
```sql
-- Recent webhook events
SELECT event_type, processed, error_message, created_at 
FROM webhook_events 
WHERE source = 'stripe' 
ORDER BY created_at DESC 
LIMIT 20;

-- Failed events
SELECT * FROM webhook_events 
WHERE source = 'stripe' 
AND (processed = false OR error_message IS NOT NULL)
ORDER BY created_at DESC;
```

### 2. Patient Status Distribution
```sql
-- Check patient distribution
SELECT status, COUNT(*) as count 
FROM patients 
GROUP BY status;

-- Check hashtag distribution
SELECT membership_hashtags, COUNT(*) as count 
FROM patients 
WHERE membership_hashtags IS NOT NULL 
GROUP BY membership_hashtags;
```

## 🎯 Final Verification Steps

1. [ ] Create test payment link in Stripe
2. [ ] Make test payment (use 4242... card)
3. [ ] Verify webhook received in logs
4. [ ] Check patient created with status='subscriptions'
5. [ ] Verify invoice created in database
6. [ ] Confirm '#activemember' hashtag added
7. [ ] Test subscription management via Customer Portal
8. [ ] Verify all webhook events processing correctly

## 📞 Support Contacts

- **Stripe Support**: https://support.stripe.com
- **Stripe Status**: https://status.stripe.com
- **API Docs**: https://stripe.com/docs/api

## 🔒 Security Reminders

1. **Never commit API keys** to version control
2. **Rotate keys regularly** (every 90 days)
3. **Use restricted keys** for specific operations
4. **Enable 2FA** on Stripe account
5. **Monitor for suspicious activity** via Stripe Radar

---

Last Updated: July 2025
Version: 1.0 