# Running Invoice Migration on Railway

## Quick Method (via Railway CLI)

If you have Railway CLI installed:

```bash
railway run npm run migrate:invoices
```

## Alternative Method (via Railway Dashboard)

1. Go to your Railway project dashboard
2. Click on your backend service
3. Go to the "Settings" tab
4. Find the "Deploy" section
5. Click on "Run Command"
6. Enter: `cd packages/backend && npm run migrate:invoices`
7. Click "Run"

## Manual Method (using Railway's Database Dashboard)

1. Go to Railway Dashboard
2. Click on your PostgreSQL database
3. Click "Query" tab
4. Copy and paste the contents of `packages/backend/src/config/invoice-schema.sql`
5. Click "Run Query"

## Verify Migration Success

After running the migration, you should see:

- ✅ Tables created: invoices, invoice_items, invoice_payments
- ✅ Invoice number generation test showing a number like "INV-2024-01000"
- 🎉 Migration completed successfully!

## What This Creates

1. **invoices** table - Main invoice records
2. **invoice_items** table - Line items for each invoice
3. **invoice_payments** table - Payment history tracking
4. **generate_invoice_number()** function - Auto-generates invoice numbers
5. Various indexes for performance

Once complete, your invoice creation and fetching should work properly!
