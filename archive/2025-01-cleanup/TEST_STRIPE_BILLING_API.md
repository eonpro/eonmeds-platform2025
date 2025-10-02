# Testing Stripe Billing API

## Prerequisites

1. Get a valid JWT token (from login)
2. Set your backend URL: `https://eonmeds-backend-v2-production.up.railway.app`

## Quick Test Examples

### 1. Create a Customer
```bash
curl -X POST https://eonmeds-backend-v2-production.up.railway.app/api/v1/billing/stripe/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "email": "gabriel.calderon@example.com",
    "name": "Gabriel Calderon",
    "patientId": "P1030"
  }'
```

### 2. Create Setup Intent (Save Card)
```bash
curl -X POST https://eonmeds-backend-v2-production.up.railway.app/api/v1/billing/stripe/setup-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "customerId": "cus_XXXXX"
  }'
```
Returns `clientSecret` for frontend Stripe Elements

### 3. List Saved Cards
```bash
curl https://eonmeds-backend-v2-production.up.railway.app/api/v1/billing/stripe/payment-methods/cus_XXXXX \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Charge a Customer
```bash
curl -X POST https://eonmeds-backend-v2-production.up.railway.app/api/v1/billing/stripe/charge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "customerId": "cus_XXXXX",
    "amount": 99.99,
    "currency": "usd",
    "description": "Semaglutide 2.5mg/mL - 1mL",
    "paymentMethodId": "pm_XXXXX"
  }'
```

### 5. Create an Invoice
First add items:
```bash
curl -X POST https://eonmeds-backend-v2-production.up.railway.app/api/v1/billing/stripe/invoices/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "customerId": "cus_XXXXX",
    "amount": 229,
    "currency": "usd",
    "description": "Semaglutide Monthly - January 2025"
  }'
```

Then finalize:
```bash
curl -X POST https://eonmeds-backend-v2-production.up.railway.app/api/v1/billing/stripe/invoices/finalize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "customerId": "cus_XXXXX",
    "collectionMethod": "charge_automatically"
  }'
```

### 6. Create a Subscription
```bash
curl -X POST https://eonmeds-backend-v2-production.up.railway.app/api/v1/billing/stripe/subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "customerId": "cus_XXXXX",
    "priceId": "price_XXXXX"
  }'
```

## Frontend Integration Example

```javascript
// Save a card
const response = await fetch('/api/v1/billing/stripe/setup-intent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ customerId })
});

const { clientSecret } = await response.json();

// Use with Stripe Elements
const result = await stripe.confirmCardSetup(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name, email }
  }
});
```

## Testing Tips

1. **Test Mode First**: Use Stripe test keys and cards before going live
2. **Test Card**: `4242 4242 4242 4242` (any future expiry, any CVC)
3. **Check Stripe Dashboard**: Verify all transactions appear correctly
4. **Monitor Webhooks**: Ensure webhook events are processed

## Common Errors

- **401 Unauthorized**: Check JWT token
- **400 Bad Request**: Validate request body
- **402 Payment Required**: Card declined or insufficient funds
- **404 Not Found**: Customer/payment method doesn't exist
