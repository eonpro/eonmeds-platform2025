# Real Payment Processing Setup - Quick Guide

## Step 1: Get Your Stripe API Keys

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com
2. **Sign up or Log in** to your Stripe account
3. **Navigate to API Keys**:
   - Click "Developers" → "API keys" in the left menu
4. **Copy your TEST keys first** (for safety):
   - Publishable key: `pk_test_...`
   - Secret key: `sk_test_...`

## Step 2: Add Stripe Keys to Your Backend

### Local Development:

Add to `packages/backend/.env`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY_HERE
```

### Railway Production:

1. Go to your Railway project
2. Click on your backend service
3. Go to "Variables" tab
4. Add these variables:
   ```
   STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
   STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
   ```

## Step 3: Add Stripe Key to Frontend

### Local Development:

Add to `packages/frontend/.env`:

```bash
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

### Railway Production:

1. Go to your frontend service in Railway
2. Add this variable:
   ```
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
   ```

## Step 4: Restart Your Services

### Local:

```bash
# Backend
cd packages/backend
npm run dev

# Frontend (new terminal)
cd packages/frontend
npm start
```

### Railway:

- Services will auto-restart after adding environment variables

## Step 5: Test Real Payments

1. Create an invoice
2. Click "Charge"
3. Use Stripe test card: `4242 4242 4242 4242`
4. Any future date, any CVC
5. Payment will process through Stripe!

## Going Live (Real Money)

When ready for real customer payments:

1. **Activate your Stripe account**:
   - Complete business verification
   - Add bank account details

2. **Switch to LIVE keys**:
   - Replace all `sk_test_` → `sk_live_`
   - Replace all `pk_test_` → `pk_live_`

3. **Test with a real card** (small amount first!)

## Need Your Keys Now?

I can help you add them immediately. Just provide:

1. Your Stripe Secret Key (starts with `sk_test_`)
2. Your Stripe Publishable Key (starts with `pk_test_`)

And I'll configure everything for you!
