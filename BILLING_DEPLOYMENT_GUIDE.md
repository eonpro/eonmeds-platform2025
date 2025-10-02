# 🚀 Billing System Deployment Guide

## Overview
This guide walks through deploying the critical billing system fixes that enable revenue generation through Stripe payment processing.

## What's Being Deployed

### New Features
1. ✅ Automatic Stripe customer creation on patient registration
2. ✅ Working payment intent creation endpoint
3. ✅ Stripe webhook handler for payment events
4. ✅ Payment method management
5. ✅ Migration script for existing patients

### Files Changed
- `packages/backend/src/controllers/webhook.controller.ts` - Added Stripe customer creation
- `packages/backend/src/controllers/payment.controller.ts` - Implemented createPaymentIntent
- `packages/backend/src/routes/stripe-webhook.routes.ts` - New webhook handler
- `packages/backend/src/index.ts` - Registered webhook routes
- `packages/backend/src/scripts/migrate-stripe-customers.ts` - Migration script
- `packages/backend/src/scripts/database-migration.sql` - Database schema updates

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure these are set in Railway/Production:
```bash
# Required Stripe Keys
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for staging)
STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_... for staging)
STRIPE_WEBHOOK_SECRET=whsec_...

# Database should already be configured
DATABASE_URL=postgresql://...
```

### 2. Stripe Dashboard Setup
1. Log into [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers → Webhooks
3. Add endpoint: `https://your-api-domain.com/api/v1/webhooks/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.created`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

## Deployment Steps

### Step 1: Database Migration
Run the migration to add necessary columns:

```bash
# Connect to production database
psql $DATABASE_URL

# Run migration
\i packages/backend/src/scripts/database-migration.sql

# Verify migration
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'patients' AND column_name = 'stripe_customer_id';
```

### Step 2: Deploy Code
```bash
# Commit all changes
git add .
git commit -m "feat: Implement complete Stripe billing integration

- Add automatic Stripe customer creation on patient registration
- Implement createPaymentIntent endpoint
- Add Stripe webhook handler for payment events
- Create migration script for existing patients
- Add comprehensive test plan and deployment guide"

# Push to trigger Railway deployment
git push origin main
```

### Step 3: Verify Deployment
1. Check Railway logs for successful deployment
2. Test health endpoint: `curl https://your-api.com/health`
3. Verify webhook endpoint: `curl -I https://your-api.com/api/v1/webhooks/stripe`

### Step 4: Migrate Existing Patients
After deployment is stable, create Stripe customers for existing patients:

```bash
# SSH into Railway or run via Railway CLI
railway run npx ts-node packages/backend/src/scripts/migrate-stripe-customers.ts

# Or run locally with production database
DATABASE_URL=your_production_url npx ts-node packages/backend/src/scripts/migrate-stripe-customers.ts
```

### Step 5: Test Payment Flow
1. Use a test patient account
2. Create a test invoice for $1.00
3. Process payment with test card: `4242 4242 4242 4242`
4. Verify:
   - Payment succeeds
   - Invoice marked as paid
   - Webhook received in Stripe Dashboard
   - Database updated correctly

## Post-Deployment Verification

### Quick Health Checks
```sql
-- Check patients have Stripe customers
SELECT 
    COUNT(*) as total,
    COUNT(stripe_customer_id) as with_stripe
FROM patients;

-- Check recent webhooks
SELECT event_type, processed, created_at 
FROM stripe_webhook_events 
ORDER BY created_at DESC 
LIMIT 5;

-- Check invoice payments
SELECT * FROM invoice_payments 
ORDER BY created_at DESC 
LIMIT 5;
```

### Frontend Testing
1. Login to the platform
2. Navigate to a patient profile
3. Create an invoice
4. Click "Charge" on the invoice
5. Enter test card information
6. Verify payment processes successfully

## Monitoring

### First Hour
- Watch Railway logs for errors
- Monitor Stripe Dashboard → Events
- Check database for webhook processing

### First Day
- Review all payment attempts
- Check for any failed webhooks
- Monitor error rates

### Ongoing
- Set up alerts for payment failures
- Weekly reconciliation of payments
- Monthly review of webhook reliability

## Rollback Procedure

If critical issues arise:

### 1. Immediate Code Rollback
```bash
# Revert the deployment
git revert HEAD
git push origin main

# Railway will auto-deploy the revert
```

### 2. Disable Webhook (if needed)
1. Go to Stripe Dashboard → Webhooks
2. Disable the webhook endpoint temporarily
3. This prevents duplicate processing while fixing issues

### 3. Database Cleanup (if needed)
```sql
-- Mark recent payments as pending for reprocessing
UPDATE invoices 
SET status = 'pending' 
WHERE payment_date > NOW() - INTERVAL '1 hour'
AND status = 'paid';
```

## Common Issues and Solutions

### Issue: "Patient needs Stripe customer setup"
**Cause:** Patient doesn't have stripe_customer_id
**Fix:** Run migration script or manually create:
```bash
npx ts-node packages/backend/src/scripts/migrate-stripe-customers.ts
```

### Issue: Webhook signature verification fails
**Cause:** Wrong webhook secret
**Fix:** Update STRIPE_WEBHOOK_SECRET from Stripe Dashboard

### Issue: Payment succeeds but invoice not updated
**Cause:** Webhook not processing
**Fix:** Check webhook logs and endpoint configuration

### Issue: CORS errors on payment
**Cause:** Frontend domain not in CORS whitelist
**Fix:** Add domain to CORS_ORIGIN environment variable

## Success Metrics

After deployment, you should see:
- ✅ New patients automatically get Stripe customers
- ✅ Invoices can be charged successfully
- ✅ Payments appear in Stripe Dashboard
- ✅ Webhooks show "200 OK" in Stripe
- ✅ Invoice status updates to "paid"
- ✅ Payment history tracked in database

## Support Contacts

- **Stripe Support:** dashboard.stripe.com/support
- **Railway Support:** railway.app/support
- **Database Issues:** Check Railway PostgreSQL addon

## Next Steps

Once billing is working:
1. Enable production Stripe keys (currently using test keys)
2. Set up subscription billing for recurring services
3. Implement automated payment retries
4. Add payment analytics dashboard
5. Set up revenue reporting

## Important Notes

⚠️ **Security:** Never log or store full card numbers, CVV, or sensitive payment data
⚠️ **Compliance:** Ensure HIPAA compliance when storing payment metadata
⚠️ **Testing:** Always test with Stripe test cards before going live
⚠️ **Backups:** Ensure database backups are running before processing real payments

---

## Quick Start Commands

```bash
# Deploy to Railway
git push origin main

# Run migration locally
DATABASE_URL=postgres://... npx ts-node packages/backend/src/scripts/migrate-stripe-customers.ts

# Check logs
railway logs

# Test webhook locally
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe

# Verify deployment
curl https://your-api.com/health
```

## Confirmation

Before marking deployment complete, ensure:
- [ ] All environment variables set
- [ ] Database migration completed
- [ ] Code deployed successfully
- [ ] Webhook endpoint configured in Stripe
- [ ] Test payment processed successfully
- [ ] Existing patients migrated
- [ ] Monitoring in place
- [ ] Team notified of changes

🎉 Once all checks pass, your billing system is ready to generate revenue!