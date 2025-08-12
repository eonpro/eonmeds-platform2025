# Railway Database Setup Instructions

## Quick Fix for Invoice Tables

The invoice creation is failing because the invoice tables don't exist in your Railway production database.

### Steps to Fix:

1. **Go to Railway Dashboard**
   - Open your Railway project
   - Click on your PostgreSQL service

2. **Open the Query Tab**
   - In the PostgreSQL service, click on the "Query" tab
   - This opens a SQL query interface

3. **Run the SQL**
   - Copy ALL the contents from `railway-invoice-setup.sql`
   - Paste it into the query editor
   - Click "Run Query"

4. **Verify Success**
   - You should see:
     - "Tables created:" message
     - List of tables: invoices, invoice_items, invoice_payments
     - Test invoice number like: "INV-2025-01000"

5. **Test the App**
   - Go back to your app
   - Try creating an invoice again
   - It should work now!

### Alternative Method (Using psql):

If you prefer command line:

```bash
# Get your DATABASE_URL from Railway
psql "YOUR_RAILWAY_DATABASE_URL" < railway-invoice-setup.sql
```

### What This Creates:

- `invoices` table - Stores main invoice data
- `invoice_items` table - Stores line items for each invoice
- `invoice_payments` table - Tracks payment history
- `generate_invoice_number()` function - Creates invoice numbers like INV-2025-01000
- All necessary indexes and triggers

### Troubleshooting:

If you get any errors:

1. Check if the tables already exist
2. Make sure the `patients` table exists (required for foreign key)
3. Make sure the `service_packages` table exists (for package references)

The app should work immediately after running this SQL!
