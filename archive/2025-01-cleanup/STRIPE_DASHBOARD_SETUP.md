# Stripe Dashboard Configuration Guide

## Current Status ✅

**Backend Stripe Integration**: ✅ WORKING
- Stripe environment variables configured
- Webhook endpoints functional
- Payment processing logic implemented
- Database schema ready

## Phase 2: Stripe Dashboard Configuration

### Step 1: Webhook Endpoint Configuration

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/webhooks
2. **Click "Add endpoint"**
3. **Set Webhook URL**: `https://eonmeds-platform2025-production.up.railway.app/api/v1/webhooks/stripe`
4. **Select Events** (check these boxes):
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `customer.created`
   - ✅ `customer.updated`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `checkout.session.completed`
   - ✅ `charge.succeeded`
   - ✅ `charge.failed`

5. **Verify Webhook Secret**: `whsec_3l3mCp3g2kd50an0PpgQJuBqUfNKGGYv`
6. **Click "Add endpoint"**

### Step 2: Product Configuration

#### Weight Loss Products
1. **Go to**: https://dashboard.stripe.com/products
2. **Create Weight Loss Monthly Product**:
   - Name: "Weight Loss Program - Monthly"
   - Description: "Monthly weight loss program with medical supervision"
   - Price: Set your monthly price (e.g., $199/month)
   - Billing: Recurring, Monthly
   - Note the Product ID (starts with `prod_`)

3. **Create Weight Loss Quarterly Product**:
   - Name: "Weight Loss Program - Quarterly"
   - Description: "Quarterly weight loss program with medical supervision"
   - Price: Set your quarterly price (e.g., $499/quarter)
   - Billing: Recurring, Quarterly
   - Note the Product ID (starts with `prod_`)

#### Testosterone Products
1. **Create Testosterone Monthly Product**:
   - Name: "Testosterone Therapy - Monthly"
   - Description: "Monthly testosterone replacement therapy"
   - Price: Set your monthly price (e.g., $149/month)
   - Billing: Recurring, Monthly
   - Note the Product ID (starts with `prod_`)

2. **Create Testosterone Quarterly Product**:
   - Name: "Testosterone Therapy - Quarterly"
   - Description: "Quarterly testosterone replacement therapy"
   - Price: Set your quarterly price (e.g., $399/quarter)
   - Billing: Recurring, Quarterly
   - Note the Product ID (starts with `prod_`)

### Step 3: Environment Variables Update

After creating products, update the Railway environment variables:

```bash
# Backend Environment Variables
railway variables --set "STRIPE_PRODUCT_WEIGHT_LOSS_MONTHLY=prod_XXXXX"
railway variables --set "STRIPE_PRODUCT_WEIGHT_LOSS_QUARTERLY=prod_XXXXX"
railway variables --set "STRIPE_PRODUCT_TESTOSTERONE_MONTHLY=prod_XXXXX"
railway variables --set "STRIPE_PRODUCT_TESTOSTERONE_QUARTERLY=prod_XXXXX"
```

### Step 4: Price Configuration

For each product, create prices:

1. **Go to each product** and click "Add price"
2. **Set pricing**:
   - Weight Loss Monthly: $199/month
   - Weight Loss Quarterly: $499/quarter
   - Testosterone Monthly: $149/month
   - Testosterone Quarterly: $399/quarter

3. **Note Price IDs** (start with `price_`) and update environment variables:

```bash
railway variables --set "STRIPE_PRICE_WEIGHT_LOSS_MONTHLY=price_XXXXX"
railway variables --set "STRIPE_PRICE_WEIGHT_LOSS_QUARTERLY=price_XXXXX"
railway variables --set "STRIPE_PRICE_TESTOSTERONE_MONTHLY=price_XXXXX"
railway variables --set "STRIPE_PRICE_TESTOSTERONE_QUARTERLY=price_XXXXX"
```

## Phase 3: Database Schema Verification

### Check Required Tables

Connect to your production database and run:

```sql
-- Verify these tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('invoices', 'invoice_payments', 'patients', 'webhook_events');

-- Check if invoice_payments table exists (critical for payment tracking)
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'invoice_payments'
);
```

### Create Missing Tables (if needed)

If `invoice_payments` table is missing:

```sql
CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'succeeded',
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payment_invoice ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_date ON invoice_payments(payment_date);
```

## Phase 4: Testing

### Test Webhook Endpoint

```bash
# Test webhook is accessible
curl https://eonmeds-platform2025-production.up.railway.app/api/v1/webhooks/test

# Test Stripe webhook endpoint
curl -X POST https://eonmeds-platform2025-production.up.railway.app/api/v1/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

### Test Payment Flow

1. **Create test patient** through the API
2. **Create test invoice** for the patient
3. **Process payment** using Stripe Elements
4. **Verify webhook events** are received
5. **Check database records** are updated

### Monitor Webhook Events

1. **Stripe Dashboard**: Check webhook delivery status
2. **Database**: Check `webhook_events` table
3. **Logs**: Monitor Railway logs for webhook processing

## Success Criteria

- ✅ Webhook endpoint configured in Stripe dashboard
- ✅ All required events selected
- ✅ Products and prices created
- ✅ Environment variables updated with product/price IDs
- ✅ Database tables verified/created
- ✅ Payment flow tested end-to-end
- ✅ Webhook events received and processed

## Troubleshooting

### Webhook Not Receiving Events
1. Check webhook URL is correct
2. Verify webhook secret matches
3. Check Railway logs for errors
4. Ensure webhook endpoint is accessible

### Payment Processing Issues
1. Verify Stripe keys are correct
2. Check database connection
3. Monitor error logs
4. Verify invoice_payments table exists

### Product/Price Issues
1. Ensure product IDs are correct
2. Verify price IDs are active
3. Check environment variables are set
4. Restart application after variable changes

## Next Steps

After completing this configuration:

1. **Test live payment processing**
2. **Monitor webhook reliability**
3. **Set up payment notifications**
4. **Configure refund capabilities**
5. **Implement subscription management**

## Support Resources

- [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
- [Stripe Products & Prices](https://stripe.com/docs/products-prices)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Stripe Dashboard](https://dashboard.stripe.com)
