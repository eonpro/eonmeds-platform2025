# Stripe Customer Migration Guide

## Overview
This guide helps you create Stripe customers for all existing patients in your database who don't already have one. This is necessary for patients to be able to add payment methods and process payments.

## Prerequisites
1. Stripe account with API keys configured
2. Database connection
3. Node.js installed

## Running the Migration Script

### Option 1: Run Locally (Recommended for Testing)

1. **Navigate to the backend directory**:
   ```bash
   cd packages/backend
   ```

2. **Ensure environment variables are set**:
   Create a `.env` file if it doesn't exist:
   ```
   STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
   DATABASE_URL=postgresql://username:password@host:port/database
   ```

3. **Run the script**:
   ```bash
   node create-stripe-customers.js
   ```

4. **Review the output**:
   - The script will show how many patients need Stripe customers
   - It will wait 5 seconds before starting (press Ctrl+C to cancel)
   - Progress will be shown for each patient
   - A summary will be displayed at the end

### Option 2: Run on Railway (Production)

1. **SSH into your Railway service** or use Railway's run command feature

2. **Set environment variables** (if not already set):
   ```bash
   export STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
   export DATABASE_URL=your_production_database_url
   ```

3. **Run the script**:
   ```bash
   cd packages/backend
   node create-stripe-customers.js
   ```

## What the Script Does

1. **Finds patients without Stripe customers**:
   - Queries the database for patients where `stripe_customer_id` is NULL or empty

2. **Creates Stripe customers**:
   - Uses patient email (or user email if patient email is missing)
   - Sets customer name from first_name and last_name
   - Includes phone number if available
   - Adds metadata with patient_id for reference

3. **Updates the database**:
   - Saves the Stripe customer ID to the patient record
   - Updates the `updated_at` timestamp

## Sample Output

```
🚀 Starting Stripe customer creation for existing patients...
Using Stripe key: sk_test_51...

Found 5 patients without Stripe customer IDs

This will create Stripe customers for all patients without one.
Press Ctrl+C to cancel, or wait 5 seconds to continue...

Creating customer for John Doe (john@example.com)... ✅ cus_ABC123
Creating customer for Jane Smith (jane@example.com)... ✅ cus_DEF456
⚠️  Skipping patient PAT003 - no email address

==================================================
📊 SUMMARY
==================================================
✅ Successfully created: 2 Stripe customers
❌ Errors: 1
📝 Total processed: 3

✨ Script completed successfully!
Patients can now add payment methods and make payments.
```

## After Running the Script

1. **Verify in Stripe Dashboard**:
   - Go to https://dashboard.stripe.com/customers
   - You should see the newly created customers

2. **Test Payment Methods**:
   - Patients can now add cards via the patient portal
   - The `/api/v1/payment-methods/setup-intent` endpoint will work

3. **Process Payments**:
   - Invoices can now be charged using saved payment methods
   - The payment flow should be fully functional

## Troubleshooting

### Error: No email address
- Some patients might not have email addresses
- These will be skipped and reported in the summary
- You'll need to manually add email addresses for these patients

### Error: Stripe API error
- Check your Stripe API key is valid
- Ensure you're using the correct key (test vs live)
- Check Stripe dashboard for any API restrictions

### Error: Database connection
- Verify DATABASE_URL is correct
- Check network connectivity to database
- Ensure database user has UPDATE permissions

## Important Notes

1. **Test Mode First**: Always test with your test Stripe key first
2. **Backup**: Consider backing up your database before running in production
3. **Idempotent**: The script only creates customers for patients without one
4. **Monitoring**: Check your Stripe dashboard for the new customers

## Next Steps

After successfully creating Stripe customers:

1. **Enable Payment Methods**: Patients can add cards through the UI
2. **Process Payments**: The charge invoice functionality will work
3. **Financial Dashboard**: Payment data will appear in reports
