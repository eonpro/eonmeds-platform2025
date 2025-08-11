# Stripe Environment Variables Documentation

## Required Variables

### Core Stripe Configuration
- **`STRIPE_SECRET_KEY`** (Required)
  - Your Stripe API secret key
  - Format: `sk_test_xxx` (test mode) or `sk_live_xxx` (production)
  - Get from: Stripe Dashboard > Developers > API keys

- **`STRIPE_WEBHOOK_SECRET`** (Required for webhooks)
  - Endpoint secret for webhook signature verification
  - Format: `whsec_xxx`
  - Get from: Stripe Dashboard > Developers > Webhooks > Your endpoint > Signing secret

### Default Pricing
- **`STRIPE_PRICE_ID_DEFAULT`** (Recommended)
  - Default subscription price ID
  - Format: `price_xxx`
  - Used when no specific price is specified

### Application Configuration
- **`APP_BASE_URL`** (Recommended)
  - Your frontend application URL
  - Format: `https://your-domain.com`
  - Used for: Stripe redirect URLs, success/cancel pages

## Optional Variables

### Product IDs (if using specific products)
- `STRIPE_PRODUCT_WEIGHT_LOSS_MONTHLY`
- `STRIPE_PRODUCT_WEIGHT_LOSS_QUARTERLY`
- `STRIPE_PRODUCT_TESTOSTERONE_MONTHLY`
- `STRIPE_PRODUCT_TESTOSTERONE_QUARTERLY`

### Price IDs (if using specific pricing)
- `STRIPE_PRICE_WEIGHT_LOSS_MONTHLY`
- `STRIPE_PRICE_WEIGHT_LOSS_QUARTERLY`
- `STRIPE_PRICE_TESTOSTERONE_MONTHLY`
- `STRIPE_PRICE_TESTOSTERONE_QUARTERLY`

### Additional Configuration
- `STRIPE_TRIAL_DAYS` - Trial period length (default: 0)
- `INVOICE_DUE_DAYS` - Days until invoice due (default: 30)
- `TAX_ENABLED` - Enable automatic tax calculation (default: false)

## Setup Instructions

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Fill in your Stripe values:
   - Log into your Stripe Dashboard
   - Navigate to Developers > API keys
   - Copy your secret key to `STRIPE_SECRET_KEY`

3. Set up webhook endpoint:
   - Go to Developers > Webhooks
   - Add endpoint: `https://your-backend-url/api/v1/payments/webhook/stripe`
   - Select events to listen to (at minimum: customer.*, subscription.*, invoice.*, payment_intent.*)
   - Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

4. Create products and prices in Stripe:
   - Go to Products in Stripe Dashboard
   - Create your subscription products
   - Copy the price IDs to the corresponding environment variables

## Security Notes

- **NEVER commit real API keys to version control**
- Always use test keys (`sk_test_`) for development
- Keep production keys (`sk_live_`) secure and only in production environment
- The `.env` file should be in `.gitignore`
- Use `env.example` as a template without real values

## Stripe Tax Configuration

### Enabling Stripe Tax

If you want to automatically calculate and collect taxes:

1. **Enable Stripe Tax in your Stripe Dashboard**:
   - Go to Settings > Tax
   - Enable Tax for your account
   - Configure your tax registrations

2. **Set the environment variable**:
   ```
   TAX_ENABLED=true
   ```

3. **Ensure customer addresses are collected**:
   - When creating customers, include address information:
     ```javascript
     {
       address: {
         country: 'US',         // Required for tax
         state: 'CA',           // Required for US tax
         postal_code: '90210',  // Required for accurate tax
         city: 'Los Angeles',   // Optional but recommended
         line1: '123 Main St',  // Optional
         line2: 'Apt 4B'        // Optional
       }
     }
     ```

4. **Required address fields for tax calculation**:
   - **country**: ISO 3166-1 alpha-2 country code (e.g., 'US', 'CA', 'GB')
   - **state**: Required for US and Canada (use 2-letter state/province code)
   - **postal_code**: Required for accurate tax rates

### Important Notes on Tax:
- Tax calculation requires accurate customer addresses
- Without proper address, tax calculation will fail
- Test in Stripe's test mode first
- Monitor tax calculation in Stripe Dashboard > Tax > Calculations

## Idempotency Support

All write operations (POST requests) support idempotency to prevent duplicate charges and operations.

### How to Use Idempotency Keys

1. **Client-provided**: Include an `Idempotency-Key` header in your request:
   ```bash
   curl -X POST http://localhost:5002/api/v1/billing/invoice/create-and-pay \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Idempotency-Key: unique-key-123" \
     -H "Content-Type: application/json" \
     -d '{"customerId": "cus_xxx", "items": [...]}'
   ```

2. **Auto-generated**: If no header is provided, the server automatically generates a UUID

### Supported Endpoints

The following endpoints support idempotency:
- `POST /api/v1/billing/invoice/create-and-pay`
- `POST /api/v1/billing/subscription/create`
- `POST /api/v1/billing/refund`
- `POST /api/v1/billing/refund-by-invoice`
- `POST /api/v1/billing/credit-note`

### Best Practices

- Use the same idempotency key for retries of the same operation
- Generate a new key for each distinct operation
- Keys are valid for 24 hours in Stripe
- Store the key client-side in case of network failures

## Verification

The Stripe configuration is validated on startup. Check console logs for:
- ✅ Stripe configuration loaded successfully
- ⚠️ Warning messages if keys are missing

To test your configuration:
```bash
cd packages/backend
npm run dev
# Check console for Stripe configuration status
```
