# 🧪 Billing System Test Plan

## Pre-Testing Setup

### 1. Environment Variables
Ensure these are set in your `.env` file:
```bash
# Stripe Test Keys (use test mode keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Database Migration
Run the migration script to ensure all tables and columns exist:
```bash
# From the backend directory
psql -U your_user -d your_database -f src/scripts/database-migration.sql
```

### 3. Migrate Existing Patients
Create Stripe customers for existing patients:
```bash
# From the backend directory
npx ts-node src/scripts/migrate-stripe-customers.ts
```

## Test Scenarios

### ✅ Test 1: Patient Registration Creates Stripe Customer
**Steps:**
1. Submit a new patient through HeyFlow webhook
2. Check database: `SELECT patient_id, stripe_customer_id FROM patients WHERE email = 'test@example.com';`
3. Verify in Stripe Dashboard that customer was created

**Expected Result:**
- Patient has `stripe_customer_id` populated
- Stripe customer exists with correct metadata

---

### ✅ Test 2: Create Invoice
**Steps:**
1. Login to the platform
2. Navigate to a patient profile
3. Click "Create Invoice"
4. Add line items (test with both custom and predefined services)
5. Set due date
6. Submit invoice

**Expected Result:**
- Invoice created with unique invoice_number
- Total amount calculated correctly
- Invoice appears in patient's invoice list

---

### ✅ Test 3: Add Payment Method
**Steps:**
1. Navigate to patient billing section
2. Click "Add Payment Method"
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete setup

**Expected Result:**
- Payment method saved
- Card appears in saved cards list
- Can set as default payment method

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Requires Authentication: `4000 0025 0000 3155`
- Declined: `4000 0000 0000 9995`

---

### ✅ Test 4: Process Payment with New Card
**Steps:**
1. Open an unpaid invoice
2. Click "Charge"
3. Select "Enter new card"
4. Enter test card: `4242 4242 4242 4242`
5. Submit payment

**Expected Result:**
- Payment processes successfully
- Invoice status changes to "paid"
- Payment appears in invoice_payments table
- Stripe webhook received and processed

---

### ✅ Test 5: Process Payment with Saved Card
**Steps:**
1. Open an unpaid invoice
2. Click "Charge"
3. Select a saved card
4. Confirm payment

**Expected Result:**
- Payment processes without re-entering card
- Invoice marked as paid
- Payment recorded in database

---

### ✅ Test 6: Stripe Webhook Processing
**Steps:**
1. Process a payment through the UI
2. Check webhook logs: `SELECT * FROM stripe_webhook_events ORDER BY created_at DESC LIMIT 5;`
3. Verify invoice updated: `SELECT * FROM invoices WHERE id = 'invoice_id';`

**Expected Result:**
- Webhook event recorded in database
- Invoice status updated to "paid"
- Payment recorded in invoice_payments

**Testing Webhooks Locally:**
```bash
# Use Stripe CLI to forward webhooks to local server
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe
```

---

### ✅ Test 7: Failed Payment Handling
**Steps:**
1. Create invoice
2. Try to charge with declining card: `4000 0000 0000 9995`
3. Check error handling

**Expected Result:**
- User sees clear error message
- Invoice remains unpaid
- Failed attempt logged in invoice_payments

---

### ✅ Test 8: Duplicate Payment Prevention
**Steps:**
1. Pay an invoice
2. Try to pay the same invoice again

**Expected Result:**
- System prevents duplicate payment
- Shows "Invoice already paid" message

---

### ✅ Test 9: Payment Method Management
**Steps:**
1. Add multiple payment methods
2. Set one as default
3. Remove a non-default card
4. Try to remove the default card

**Expected Result:**
- Can manage multiple cards
- Default card marked correctly
- Can remove non-default cards
- System handles default card removal appropriately

---

### ✅ Test 10: Invoice with Multiple Line Items
**Steps:**
1. Create invoice with 3+ different services
2. Mix recurring and one-time charges
3. Verify total calculation

**Expected Result:**
- All line items display correctly
- Total calculated accurately
- Recurring items marked appropriately

---

## Database Verification Queries

### Check Patient Stripe Integration
```sql
-- Patients with/without Stripe customers
SELECT 
    COUNT(*) as total_patients,
    COUNT(stripe_customer_id) as with_stripe,
    COUNT(*) - COUNT(stripe_customer_id) as without_stripe
FROM patients;
```

### Check Invoice Status
```sql
-- Invoice payment status distribution
SELECT 
    status, 
    COUNT(*) as count, 
    SUM(total_amount) as total_amount
FROM invoices
GROUP BY status;
```

### Recent Payments
```sql
-- Last 10 payments
SELECT 
    ip.*, 
    i.invoice_number, 
    p.first_name, 
    p.last_name
FROM invoice_payments ip
JOIN invoices i ON ip.invoice_id = i.id
JOIN patients p ON i.patient_id = p.patient_id
ORDER BY ip.payment_date DESC
LIMIT 10;
```

### Webhook Events
```sql
-- Recent webhook events
SELECT 
    event_type, 
    processed, 
    created_at, 
    error_message
FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 20;
```

## Stripe Dashboard Verification

1. **Customers Tab**: Verify patients appear as customers
2. **Payments Tab**: Check successful payments appear
3. **Events Tab**: Verify webhooks are being sent
4. **Logs Tab**: Check for any API errors

## Performance Testing

### Load Test Payment Processing
1. Create 10 invoices for different patients
2. Process payments in rapid succession
3. Monitor response times and error rates

### Webhook Resilience
1. Temporarily disable webhook endpoint
2. Process payments
3. Re-enable endpoint
4. Verify Stripe retries and events are processed

## Security Testing

### 1. Payment Method Security
- Verify no full card numbers stored in database
- Check that CVV is never logged
- Ensure payment methods tied to authenticated users only

### 2. Authorization
- Try to charge invoice for another patient
- Attempt to view payment methods of another patient
- Verify Auth0 protection on all payment endpoints

### 3. Webhook Security
- Send webhook without signature - should reject
- Send webhook with invalid signature - should reject
- Verify signature validation is working

## Rollback Plan

If issues arise during deployment:

1. **Immediate Rollback:**
```bash
# Revert code deployment
git revert HEAD
npm run build
npm run deploy
```

2. **Database Rollback:**
```sql
-- Remove Stripe customer IDs if needed
UPDATE patients SET stripe_customer_id = NULL;

-- Mark invoices as pending if payment issues
UPDATE invoices SET status = 'pending' 
WHERE status = 'paid' AND payment_date > '2024-01-01';
```

3. **Stripe Cleanup:**
- Disable webhook endpoint in Stripe Dashboard
- Switch back to test mode if in production

## Success Criteria

✅ All test scenarios pass
✅ No console errors in frontend
✅ No error logs in backend
✅ Stripe Dashboard shows successful payments
✅ Database integrity maintained
✅ User experience is smooth
✅ Error messages are clear and helpful

## Post-Deployment Monitoring

1. **First 24 Hours:**
   - Monitor error logs every hour
   - Check Stripe Dashboard for failed payments
   - Review webhook success rate

2. **First Week:**
   - Daily review of payment success rate
   - Check for any stuck invoices
   - Monitor customer support tickets

3. **Ongoing:**
   - Weekly payment reconciliation
   - Monthly review of failed payments
   - Quarterly security audit

## Support Documentation

### Common Issues and Solutions

**Issue:** "Patient needs Stripe customer setup"
**Solution:** Run migration script or manually create customer

**Issue:** Payment succeeds but invoice not updated
**Solution:** Check webhook configuration and logs

**Issue:** "No payment method on file"
**Solution:** Guide user to add payment method first

**Issue:** Duplicate payment attempts
**Solution:** Check invoice_payments for existing payment

## Contact for Issues

- **Development Team:** Check CLAUDE.md for context
- **Stripe Support:** dashboard.stripe.com/support
- **Database Admin:** Check connection and permissions

---

## Checklist Before Going Live

- [ ] All tests pass in test environment
- [ ] Stripe webhook endpoint configured
- [ ] Production API keys set
- [ ] Database migration completed
- [ ] Existing patients migrated
- [ ] Error monitoring in place
- [ ] Support team briefed
- [ ] Rollback plan documented
- [ ] First payment tested successfully
- [ ] Documentation updated