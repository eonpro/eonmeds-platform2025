# Billing API Testing Guide

This guide provides curl commands to test the billing API endpoints.

## Prerequisites

1. Set your backend URL:
```bash
BACKEND=https://your-backend-domain.railway.app  # Replace with your Railway backend URL
```

2. Get an Auth0 JWT token with admin/billing role and set it:
```bash
TOKEN="your-jwt-token-here"
```

## API Testing Commands

### 1. Check Stripe Configuration

Test that Stripe is properly configured:

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BACKEND/api/v1/billing/diagnostics/stripe" | jq
```

Expected response:
```json
{
  "status": "ok",
  "stripe": {
    "connected": true,
    "mode": "test",  // or "live"
    "version": "13.x.x",
    "webhookConfigured": true
  },
  "database": {
    "tablesExist": true
  },
  "environment": {
    "nodeEnv": "production",
    "hasStripeKey": true,
    "hasWebhookSecret": true
  }
}
```

### 2. List Payment Methods for a Patient

```bash
PATIENT_ID="your-patient-uuid"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BACKEND/api/v1/billing/payment-methods/list?patientId=$PATIENT_ID" | jq
```

### 3. Create an Invoice

Create an invoice with automatic email:

```bash
curl -s -X POST "$BACKEND/api/v1/billing/invoices/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "name": "Test Patient",
    "items": [
      {
        "description": "Semaglutide 2.5mg/mL – 1mL (2.5mg) – Monthly",
        "amount": 229
      }
    ],
    "behavior": "finalize_and_email"
  }' | jq
```

Response will include:
```json
{
  "invoice_id": "in_xxx",
  "number": "xxx",
  "status": "open",
  "amount_due": 229,
  "hosted_url": "https://invoice.stripe.com/i/xxx",
  "behavior_executed": "finalize_and_email"
}
```

### 4. Add a Payment Method (Full Flow)

#### Step 1: Create Setup Intent
```bash
PATIENT_EMAIL="patient@example.com"
SI_RESPONSE=$(curl -s -X POST "$BACKEND/api/v1/billing/payment-methods/setup-intent" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$PATIENT_EMAIL\"}")

echo "$SI_RESPONSE" | jq
CLIENT_SECRET=$(echo "$SI_RESPONSE" | jq -r '.client_secret')
```

#### Step 2: Confirm Setup Intent (Frontend Operation)
In production, this happens in the frontend with Stripe.js. For testing with test cards:

```bash
# Use Stripe test payment method ID
PM_ID="pm_card_visa"  # Test Visa card
```

#### Step 3: Attach Payment Method
```bash
curl -s -X POST "$BACKEND/api/v1/billing/payment-methods/attach" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$PATIENT_EMAIL\",
    \"payment_method_id\": \"$PM_ID\",
    \"make_default\": true
  }" | jq
```

### 5. Pay an Invoice

```bash
INVOICE_ID="in_xxx"  # From create invoice response
curl -s -X POST "$BACKEND/api/v1/billing/invoices/pay" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"invoice_id\": \"$INVOICE_ID\",
    \"payment_method_id\": \"$PM_ID\"
  }" | jq
```

### 6. Delete a Draft Invoice

```bash
curl -s -X DELETE "$BACKEND/api/v1/billing/invoices/$INVOICE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

## Complete Test Flow Example

```bash
# 1. Set variables
BACKEND="https://your-backend.railway.app"
TOKEN="your-auth0-jwt-token"
EMAIL="test@example.com"

# 2. Check system health
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BACKEND/api/v1/billing/diagnostics/stripe" | jq

# 3. Create an invoice
INVOICE=$(curl -s -X POST "$BACKEND/api/v1/billing/invoices/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"items\": [{\"description\": \"Test Item\", \"amount\": 100}],
    \"behavior\": \"draft\"
  }")

INVOICE_ID=$(echo "$INVOICE" | jq -r '.invoice_id')
echo "Created invoice: $INVOICE_ID"

# 4. Create setup intent for payment method
SI=$(curl -s -X POST "$BACKEND/api/v1/billing/payment-methods/setup-intent" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\"}")

echo "$SI" | jq

# 5. Attach test payment method
curl -s -X POST "$BACKEND/api/v1/billing/payment-methods/attach" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"payment_method_id\": \"pm_card_visa\",
    \"make_default\": true
  }" | jq

# 6. Pay the invoice
curl -s -X POST "$BACKEND/api/v1/billing/invoices/pay" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"invoice_id\": \"$INVOICE_ID\",
    \"use_saved_pm\": true
  }" | jq
```

## Test Payment Methods (Stripe Test Mode)

When in test mode, use these payment method IDs:

- `pm_card_visa` - Always succeeds
- `pm_card_visa_chargeDeclined` - Always declines
- `pm_card_authenticationRequired` - Requires authentication

## Notes

1. All amounts are in dollars (not cents) in the API
2. The API automatically converts to cents for Stripe
3. Rate limiting is applied to payment endpoints
4. All endpoints require Auth0 JWT authentication
5. Admin/billing role is required for these endpoints
