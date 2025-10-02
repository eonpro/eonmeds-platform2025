# 🚨 URGENT: Fix Stripe API Key Error

## Problem
Your Stripe API key is being rejected: `Invalid API Key provided: sk_live_*...NRgM`

## Solution

### Step 1: Get Your Valid Stripe Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your **Live Secret Key** (starts with `sk_live_`)
   - Or use **Test Secret Key** (starts with `sk_test_`) for testing

### Step 2: Update in AWS App Runner

1. Go to [AWS App Runner Console](https://console.aws.amazon.com/apprunner)
2. Select your service: `eonmeds-backend-staging`
3. Click **Configuration** tab
4. Click **Edit service**
5. Scroll to **Environment variables**
6. Update these variables:
   ```
   STRIPE_SECRET_KEY = sk_live_YOUR_ACTUAL_KEY_HERE
   STRIPE_PUBLISHABLE_KEY = pk_live_YOUR_ACTUAL_KEY_HERE
   ```
7. Click **Save and deploy**

### Step 3: Wait for Deployment
- Takes 3-5 minutes
- Service will show "Running" when ready

### Step 4: Test
Try to add a card again - it should work now!

## Alternative: Use Test Mode (Recommended for Now)

If you want to test first:
```
STRIPE_SECRET_KEY = sk_test_51RPS5NGzKhM7cZeG...
STRIPE_PUBLISHABLE_KEY = pk_test_51RPS5NGzKhM7cZeG...
```

Test card: `4242 4242 4242 4242`

---

**Once this is fixed, the invoice system will work!**
