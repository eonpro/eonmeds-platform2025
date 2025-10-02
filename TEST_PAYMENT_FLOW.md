# 🧪 Payment Flow Testing Script

## Prerequisites
- Backend deployed to Railway
- Stripe test keys configured
- Database migrated with required columns
- At least one test patient in the system

## Test Scenarios

### 1. Test Database Schema
Run these SQL queries in your database to verify schema:

```sql
-- Check if stripe_customer_id column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patients' 
AND column_name = 'stripe_customer_id';

-- Check if invoice_payments table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'invoice_payments'
);

-- Check if stripe_webhook_events table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'stripe_webhook_events'
);
```

### 2. Create Test Patient with Stripe Customer
If you don't have a test patient yet:

```sql
-- Check existing patients
SELECT patient_id, first_name, last_name, email, stripe_customer_id 
FROM patients 
LIMIT 5;

-- If no patients have stripe_customer_id, you need to run migration
```

### 3. Test Payment Method Endpoints

#### Add Payment Method (Setup Intent)
```bash
# Get setup intent for adding a card
curl -X POST https://your-api.railway.app/api/v1/payment-methods/setup-intent \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "YOUR_PATIENT_ID"
  }'
```

Expected response:
```json
{
  "success": true,
  "client_secret": "seti_..._secret_...",
  "setup_intent_id": "seti_..."
}
```

#### List Payment Methods
```bash
curl -X GET https://your-api.railway.app/api/v1/payment-methods/patient/YOUR_PATIENT_ID \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

### 4. Test Invoice Creation and Payment

#### Create Test Invoice
```bash
curl -X POST https://your-api.railway.app/api/v1/payments/invoices/create \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "YOUR_PATIENT_ID",
    "due_date": "2024-12-31",
    "items": [
      {
        "description": "Test Service",
        "quantity": 1,
        "unit_price": 1.00,
        "service_type": "test"
      }
    ],
    "total_amount": 1.00
  }'
```

#### Create Payment Intent
```bash
curl -X POST https://your-api.railway.app/api/v1/payments/create-payment-intent \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "YOUR_INVOICE_ID"
  }'
```

Expected response:
```json
{
  "client_secret": "pi_..._secret_...",
  "payment_intent_id": "pi_...",
  "amount": 1.00,
  "invoice_number": "INV-..."
}
```

### 5. Test Frontend Payment Flow

1. **Login to your application**
2. **Navigate to a patient profile**
3. **Create a new invoice:**
   - Click "Create Invoice"
   - Add a test service for $1.00
   - Save the invoice

4. **Process payment:**
   - Click "Charge" on the invoice
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code

5. **Verify payment success:**
   - Invoice should show as "Paid"
   - Check Stripe Dashboard for payment
   - Check database for payment record

### 6. Verify Webhook Processing

After making a test payment:

```sql
-- Check webhook events
SELECT event_type, processed, created_at 
FROM stripe_webhook_events 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check invoice was updated
SELECT id, invoice_number, status, payment_date, stripe_payment_intent_id 
FROM invoices 
WHERE patient_id = 'YOUR_PATIENT_ID'
ORDER BY created_at DESC
LIMIT 5;

-- Check payment was recorded
SELECT * FROM invoice_payments 
WHERE invoice_id = 'YOUR_INVOICE_ID';
```

## Test Cards for Different Scenarios

### Successful Payment
- Number: `4242 4242 4242 4242`
- Result: Payment succeeds immediately

### Requires Authentication (3D Secure)
- Number: `4000 0025 0000 3155`
- Result: Requires additional authentication

### Declined Card
- Number: `4000 0000 0000 9995`
- Result: Payment declined

### Insufficient Funds
- Number: `4000 0000 0000 9995`
- Result: Card declined due to insufficient funds

## Quick Test Checklist

- [ ] Patient has stripe_customer_id
- [ ] Can create invoice
- [ ] Can create payment intent
- [ ] Payment processes successfully
- [ ] Invoice marked as paid
- [ ] Webhook received and processed
- [ ] Payment recorded in database
- [ ] No errors in logs

## Debugging Commands

### Check Backend Logs
```bash
# Via Railway CLI
railway logs --service backend

# Filter for errors
railway logs --service backend | grep ERROR

# Filter for Stripe
railway logs --service backend | grep -i stripe
```

### Database Queries
```sql
-- Patients without Stripe customers
SELECT COUNT(*) FROM patients WHERE stripe_customer_id IS NULL;

-- Recent payment attempts
SELECT ip.*, i.invoice_number 
FROM invoice_payments ip
JOIN invoices i ON ip.invoice_id = i.id
ORDER BY ip.created_at DESC
LIMIT 10;

-- Failed payments
SELECT * FROM invoice_payments 
WHERE status = 'failed' 
ORDER BY created_at DESC;
```

## Common Issues and Solutions

### "Patient needs Stripe customer setup"
```bash
# Run migration script from Railway
railway run --service backend npx ts-node src/scripts/migrate-stripe-customers.ts
```

### "No payment method on file"
- Patient needs to add a card first via the UI

### Payment succeeds but invoice not updated
- Check webhook configuration
- Verify STRIPE_WEBHOOK_SECRET is set correctly

### CORS errors
- Add frontend domain to CORS_ORIGIN environment variable

## Success Criteria

✅ Test payment of $1.00 processes successfully
✅ Invoice status changes to "paid"
✅ Payment appears in Stripe Dashboard
✅ Webhook event recorded in database
✅ No errors in application logs

---

## After Successful Testing

1. **Switch to Production Keys** (when ready for real payments)
2. **Update webhook endpoint** to use production URL
3. **Test with a real card** (small amount)
4. **Monitor first real payments** carefully

**Remember**: Always test in Stripe test mode first!