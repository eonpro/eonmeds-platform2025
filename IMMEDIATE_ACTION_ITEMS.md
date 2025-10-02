# 🚨 IMMEDIATE ACTION ITEMS FOR BILLING SYSTEM

## ✅ Step 1: Deployment (IN PROGRESS)
Code has been pushed to GitHub and Railway is deploying the changes.
- Monitor Railway dashboard for deployment status
- Check logs for any deployment errors

## 📋 Step 2: Database Migration (DO THIS NOW)
Once deployment is complete, run the database migration:

### Option A: Via Railway CLI
```bash
railway run --service backend psql $DATABASE_URL < packages/backend/src/scripts/database-migration.sql
```

### Option B: Direct Database Connection
1. Get your database URL from Railway
2. Connect using psql or your database client
3. Run the migration script from `packages/backend/src/scripts/database-migration.sql`

## 🔗 Step 3: Configure Stripe Webhook (DO THIS NOW)
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers → Webhooks
3. Add endpoint: `https://[your-railway-url]/api/v1/webhooks/stripe`
4. Select these events:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - customer.created
5. Copy the signing secret (starts with `whsec_`)
6. Add to Railway environment variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_[your_secret]
   ```

## 👥 Step 4: Migrate Existing Patients
After database migration is complete:

```bash
# Run from Railway
railway run --service backend npx ts-node src/scripts/migrate-stripe-customers.ts
```

This will create Stripe customers for all existing patients.

## 🧪 Step 5: Test Payment Flow
1. Login to your application
2. Create a test invoice for $1.00
3. Click "Charge" and use test card: `4242 4242 4242 4242`
4. Verify:
   - Payment succeeds
   - Invoice marked as paid
   - Check Stripe Dashboard for payment

## ✅ Verification Checklist

### Database Check
```sql
-- Run these queries to verify setup
SELECT COUNT(*) as total, 
       COUNT(stripe_customer_id) as with_stripe 
FROM patients;

SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('stripe_payment_intent_id', 'payment_date', 'amount_paid');

SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'invoice_payments'
);
```

### API Endpoints to Test
- `POST /api/v1/payments/create-payment-intent` - Should return 200 (not 501)
- `POST /api/v1/webhooks/stripe` - Should accept webhook events
- `GET /api/v1/payment-methods/patient/:id` - Should list payment methods

## 🚨 CRITICAL ENVIRONMENT VARIABLES

Make sure these are set in Railway:

```bash
# Stripe (REQUIRED)
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_... (from step 3)

# Database (should already be set)
DATABASE_URL=postgresql://...
```

## 📊 Success Metrics

Once everything is configured, you should see:
- ✅ New patients automatically get Stripe customers
- ✅ Can create and pay invoices
- ✅ Payments appear in Stripe Dashboard
- ✅ Webhooks show 200 OK in Stripe
- ✅ Database tracks all payments

## 🆘 If Something Goes Wrong

1. **Check Railway Logs**: Look for deployment or runtime errors
2. **Check Stripe Dashboard**: Verify webhook events and payments
3. **Database Issues**: Ensure migration ran successfully
4. **Rollback if Needed**: `git revert HEAD && git push`

## 📚 Documentation References

- **Full Deployment Guide**: BILLING_DEPLOYMENT_GUIDE.md
- **Testing Plan**: BILLING_SYSTEM_TEST_PLAN.md
- **Webhook Setup**: STRIPE_WEBHOOK_SETUP_GUIDE.md
- **Payment Testing**: TEST_PAYMENT_FLOW.md

---

## 🎯 PRIORITY ORDER:

1. **NOW**: Check Railway deployment status
2. **NOW**: Run database migration
3. **NOW**: Configure Stripe webhook
4. **THEN**: Migrate existing patients
5. **FINALLY**: Test with $1.00 payment

Once these steps are complete, your billing system will be fully operational and ready to generate revenue!

**Time Estimate**: 15-30 minutes to complete all steps

---

**Remember**: Use Stripe TEST keys first, then switch to LIVE when ready for real payments!