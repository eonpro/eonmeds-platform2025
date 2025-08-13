# Stripe Payment Backfill Guide

This guide explains how to backfill historical Stripe payments into your EONMeds platform.

## What Does It Do?

The backfill script will:

1. Fetch all successful payments from your Stripe account
2. Create or update patient records
3. Generate invoices for each payment
4. Move patients from "qualified" to "subscriptions" status
5. Add the "activemember" hashtag

## Running the Backfill

### 1. First, Do a Dry Run (Recommended)

This will show you what would happen without making any changes:

```bash
cd packages/backend
npm run backfill-payments -- --dry-run
```

### 2. Run for a Specific Date Range

To process payments from a specific date:

```bash
# Process payments from June 1, 2024 onwards
npm run backfill-payments -- --from 2024-06-01 --dry-run

# If it looks good, run without dry-run
npm run backfill-payments -- --from 2024-06-01
```

### 3. Process All Historical Payments

To process all payments from January 1, 2024:

```bash
npm run backfill-payments
```

## What to Expect

The script will show progress like this:

```
🔄 Starting Stripe payment backfill...
✅ Database connected
✅ Connected to Stripe account: your@email.com

📅 Processing payments from Mon Jan 01 2024 to Today

💳 Processing charge ch_1234567890
   Amount: $299
   Email: customer@example.com
   Date: 7/15/2024, 10:30:00 AM
   ✅ Successfully processed
```

## Railway Deployment

To run this on Railway:

1. SSH into your Railway instance
2. Navigate to the backend directory
3. Run the backfill command with appropriate parameters

## Safety Features

- **Duplicate Prevention**: The script checks if a payment has already been processed
- **Error Handling**: Continues processing even if individual payments fail
- **Detailed Logging**: Shows exactly what's happening with each payment
- **Dry Run Mode**: Test before making any changes

## Summary Report

At the end, you'll see:

```
📊 Backfill Summary:
═══════════════════════════════════════
✅ Successfully processed: 150
👤 New patients created: 45
📝 Existing patients updated: 105
⏭️  Skipped: 30
❌ Errors: 2
📊 Total reviewed: 182
```

## Important Notes

1. **Run During Low Traffic**: This script makes API calls to Stripe and database updates
2. **Monitor Logs**: Watch for any errors that need manual intervention
3. **Verify Results**: Check a few patient records to ensure they were updated correctly
4. **One-Time Run**: Once run successfully, future payments will be handled by webhooks
