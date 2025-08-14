# Stripe Setup Guide for EONMeds

## Phase 1: Basic Setup

### 1. Get Your Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Sign in or create a Stripe account
3. Toggle to **Test mode** (switch in the top right)
4. Go to **Developers → API keys**
5. Copy your **Secret key** (starts with `sk_test_`)

### 2. Add to Railway Environment

```bash
# In your Railway dashboard:
STRIPE_SECRET_KEY=sk_test_your_test_secret_key_here
```

### 3. Test the Connection

Once deployed, test the Stripe connection:

```bash
# Check Stripe health
curl https://your-app.railway.app/api/v1/stripe-test/health

# Create a test customer
curl -X POST https://your-app.railway.app/api/v1/stripe-test/customer \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test Customer"
  }'
```

### 4. Local Development

For local testing, create a `.env` file in `packages/backend/`:

```env
STRIPE_SECRET_KEY=sk_test_your_test_secret_key_here
```

### Important Notes

- ✅ Always start with **test keys** (begin with `sk_test_`)
- ❌ Never commit API keys to git
- 🔒 Keep your live keys secure when ready for production
- 📝 Test mode allows unlimited testing without real charges

## Phase 1 Features

With this setup, you can:
- Create Stripe customers for patients
- Create payment intents for invoices
- Process one-time payments

## Next Steps (Phase 2+)

Future phases will add:
- Saved payment methods
- Recurring subscriptions
- Webhook handling
- Customer portal

---

For questions or issues, check the [Stripe Documentation](https://stripe.com/docs).
