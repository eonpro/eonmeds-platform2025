# Fix Invoice Creation and Auth0 Issues

## Issues Identified

1. **Invoice Creation Error (500)**: Missing `generate_invoice_number()` function in database
2. **Auth0 Missing Refresh Token**: Users need to re-authenticate to get refresh tokens

## Solution Steps

### 1. Fix Database (Invoice Function)

Run the database fix script to add the missing function:

```bash
cd packages/backend
node fix-invoice-function.js
```

This will:
- Create the `invoice_number_seq` sequence
- Create the `generate_invoice_number()` function
- Test that it works correctly

### 2. Fix Auth0 Refresh Token Issue

The "Missing Refresh Token" error occurs when:
- User sessions were created before `offline_access` scope was added
- Refresh tokens have expired

**Solution for users:**
1. Log out completely
2. Clear browser cache/localStorage
3. Log in again

**For developers to force re-authentication:**
```javascript
// In the frontend, you can force logout and re-login:
const { logout } = useAuth0();
logout({ returnTo: window.location.origin });
```

### 3. Verify Stripe Configuration

Check that Stripe environment variables are set in Railway:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Run diagnostics:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-backend-url/api/v1/billing/diagnostics/stripe
```

### 4. Alternative: Direct Database Fix

If the script doesn't work, run this SQL directly in your database:

```sql
-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1000;

-- Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR AS $$
DECLARE
  new_number VARCHAR;
BEGIN
  new_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::text, 5, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Test it
SELECT generate_invoice_number();
```

## Deployment Steps

1. Deploy the updated backend with the fix:
   ```bash
   git push origin main
   ```

2. After deployment, run the database fix script on production:
   - SSH into your Railway instance or
   - Use Railway's database console to run the SQL commands

3. Have users log out and log back in to refresh their Auth0 tokens

## Prevention

To prevent this in the future:
1. Always run complete schema migrations when adding new database objects
2. Use the `complete-schema.sql` file as the source of truth
3. Ensure Auth0 application settings have refresh token rotation enabled

## Testing

After applying fixes:
1. Try creating an invoice - it should generate a number like "INV-2025-01000"
2. Check that API calls don't show "Missing Refresh Token" errors
3. Verify Stripe integration with the diagnostics endpoint
