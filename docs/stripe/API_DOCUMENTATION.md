# Stripe Integration API Documentation
**Version**: 1.0.0  
**Last Updated**: 2025-09-07

## Overview
This document provides comprehensive API documentation for the EONMEDS Stripe payment integration. All endpoints follow RESTful conventions and return JSON responses.

## Base URL
```
Production: https://api.eonmeds.com
Development: http://localhost:3000
```

## Authentication
All payment endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Error Responses
All endpoints return consistent error responses:
```json
{
  "error": "Error message",
  "details": "Additional context (optional)"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

---

## Customer Management

### Create or Get Customer
Creates a new Stripe customer or retrieves existing one.

**Endpoint**: `POST /api/v1/payments/customer`

**Request Body**:
```json
{
  "patientId": "PAT_001",
  "email": "patient@example.com",
  "name": "John Doe",
  "tenantId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
}
```

**Response**:
```json
{
  "customerId": "cus_1234567890",
  "email": "patient@example.com"
}
```

**HIPAA Note**: No PHI is sent to Stripe. Only email and opaque IDs are used.

---

## Payment Methods

### Create Setup Intent
Creates a SetupIntent for saving a payment method without charging.

**Endpoint**: `POST /api/v1/payments/setup-intent`

**Request Body**:
```json
{
  "customerId": "cus_1234567890"
}
```

**Response**:
```json
{
  "clientSecret": "seti_1234_secret_5678",
  "setupIntentId": "seti_1234567890"
}
```

**Frontend Usage**:
Use the `clientSecret` with Stripe Elements to complete card setup.

### List Payment Methods
Retrieves all saved payment methods for a customer.

**Endpoint**: `GET /api/v1/payments/methods/:customerId`

**Response**:
```json
{
  "paymentMethods": [
    {
      "id": "pm_1234567890",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "expMonth": 12,
        "expYear": 2025
      },
      "isDefault": true
    }
  ]
}
```

### Set Default Payment Method
Sets a payment method as the default for a customer.

**Endpoint**: `POST /api/v1/payments/methods/default`

**Request Body**:
```json
{
  "customerId": "cus_1234567890",
  "paymentMethodId": "pm_1234567890"
}
```

**Response**:
```json
{
  "success": true
}
```

### Delete Payment Method
Removes a saved payment method.

**Endpoint**: `DELETE /api/v1/payments/methods/:paymentMethodId`

**Response**:
```json
{
  "success": true
}
```

---

## Payments

### Create One-off Charge
Creates a PaymentIntent for an immediate charge.

**Endpoint**: `POST /api/v1/payments/charge`

**Request Body**:
```json
{
  "customerId": "cus_1234567890",
  "amountCents": 2999,
  "currency": "usd",
  "paymentMethodId": "pm_1234567890",
  "description": "Telehealth Visit",
  "orderId": "ORD_001",
  "tenantId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
}
```

**Response**:
```json
{
  "paymentIntentId": "pi_1234567890",
  "clientSecret": "pi_1234_secret_5678",
  "status": "succeeded",
  "requiresAction": false
}
```

**Status Values**:
- `requires_payment_method` - Awaiting payment method
- `requires_confirmation` - Awaiting confirmation
- `requires_action` - Customer action required (3DS)
- `processing` - Processing payment
- `succeeded` - Payment successful
- `canceled` - Payment canceled

### Create Refund
Refunds a payment partially or fully.

**Endpoint**: `POST /api/v1/payments/refund`

**Request Body**:
```json
{
  "paymentIntentId": "pi_1234567890",
  "amountCents": 1500,
  "reason": "requested_by_customer"
}
```

**Response**:
```json
{
  "refundId": "re_1234567890",
  "amount": 1500,
  "status": "succeeded"
}
```

**Refund Reasons**:
- `duplicate` - Duplicate charge
- `fraudulent` - Fraudulent charge
- `requested_by_customer` - Customer requested

---

## Subscriptions

### Create Subscription
Creates a recurring subscription for a customer.

**Endpoint**: `POST /api/v1/payments/subscription`

**Request Body**:
```json
{
  "customerId": "cus_1234567890",
  "priceId": "price_1234567890",
  "tenantId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
}
```

**Response**:
```json
{
  "subscriptionId": "sub_1234567890",
  "clientSecret": "pi_1234_secret_5678",
  "status": "incomplete"
}
```

### Cancel Subscription
Cancels an active subscription.

**Endpoint**: `POST /api/v1/payments/subscription/cancel`

**Request Body**:
```json
{
  "subscriptionId": "sub_1234567890",
  "immediate": false
}
```

**Response**:
```json
{
  "subscriptionId": "sub_1234567890",
  "status": "active",
  "cancelAt": "2025-10-01T00:00:00Z"
}
```

---

## Billing Portal

### Create Billing Portal Session
Creates a session for the Stripe Customer Portal where customers can manage their billing.

**Endpoint**: `POST /api/v1/payments/billing-portal`

**Request Body**:
```json
{
  "customerId": "cus_1234567890",
  "returnUrl": "https://app.eonmeds.com/billing"
}
```

**Response**:
```json
{
  "url": "https://billing.stripe.com/session/xxx"
}
```

---

## Payment History & Reporting

### Get Payment History
Retrieves payment history for a customer.

**Endpoint**: `GET /api/v1/payments/history/:customerId`

**Query Parameters**:
- `limit` - Number of records (default: 20)
- `offset` - Pagination offset (default: 0)

**Response**:
```json
{
  "payments": [
    {
      "id": "pi_1234567890",
      "amount": 2999,
      "currency": "usd",
      "status": "succeeded",
      "type": "one_time",
      "description": "Telehealth Visit",
      "date": "2025-09-07T10:00:00Z",
      "refund": null
    }
  ]
}
```

### Get Tenant Ledger
Retrieves ledger entries for financial reconciliation.

**Endpoint**: `GET /api/v1/payments/ledger/:tenantId`

**Query Parameters**:
- `startDate` - ISO date string
- `endDate` - ISO date string

**Response**:
```json
{
  "entries": [
    {
      "source": "payment",
      "source_id": "pi_1234567890",
      "amount_cents": 2699,
      "currency": "usd",
      "direction": "credit",
      "balance_cents": 2699,
      "description": "Payment received (less platform fee)",
      "occurred_at": "2025-09-07T10:00:00Z"
    }
  ],
  "currentBalance": 2699
}
```

---

## Webhooks

### Webhook Endpoint
Receives and processes Stripe webhook events.

**Endpoint**: `POST /api/webhook/stripe`

**Headers Required**:
```
stripe-signature: t=timestamp,v1=signature
Content-Type: application/json
```

**Security**: 
- Signature verification using `STRIPE_WEBHOOK_SECRET`
- Raw body required (no JSON parsing before verification)
- Idempotent processing via event ID deduplication

### Test Webhook
Verifies webhook endpoint configuration.

**Endpoint**: `GET /api/webhook/stripe/test`

**Response**:
```json
{
  "status": "ready",
  "endpoint": "/api/webhook/stripe",
  "signature_configured": true,
  "mode": "test"
}
```

### List Webhook Events
Retrieves recent webhook events (admin only).

**Endpoint**: `GET /api/webhook/stripe/events`

**Response**:
```json
{
  "count": 10,
  "events": [
    {
      "stripe_event_id": "evt_1234567890",
      "type": "payment_intent.succeeded",
      "processed": true,
      "processed_at": "2025-09-07T10:00:00Z",
      "error_message": null,
      "created_at": "2025-09-07T09:59:59Z"
    }
  ]
}
```

### Retry Failed Event
Retries processing of a failed webhook event.

**Endpoint**: `POST /api/webhook/stripe/retry/:eventId`

**Response**:
```json
{
  "success": true,
  "message": "Event evt_1234567890 reprocessed"
}
```

---

## Testing

### Test Cards (Stripe Test Mode)

**Successful Payment**:
- Number: `4242 4242 4242 4242`
- CVC: Any 3 digits
- Date: Any future date

**3D Secure Required**:
- Number: `4000 0025 0000 3155`

**Declined**:
- Number: `4000 0000 0000 9995`

### Stripe CLI Commands

**Start webhook forwarding**:
```bash
stripe listen --forward-to http://localhost:3000/api/webhook/stripe
```

**Trigger test events**:
```bash
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
stripe trigger invoice.paid
```

**View logs**:
```bash
stripe logs tail
```

---

## Frontend Integration

### Installation
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Basic Setup
```javascript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_test_...');

function PaymentForm({ clientSecret }) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentElement />
    </Elements>
  );
}
```

### Save Card Example
```javascript
// 1. Create SetupIntent
const response = await fetch('/api/v1/payments/setup-intent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ customerId })
});
const { clientSecret } = await response.json();

// 2. Confirm with Stripe
const result = await stripe.confirmSetup({
  elements,
  confirmParams: {
    return_url: 'https://app.eonmeds.com/billing/success'
  }
});
```

---

## Security & Compliance

### HIPAA Compliance
- **No PHI in Stripe**: Only use opaque IDs and billing email
- **Metadata Structure**: 
  ```json
  {
    "tenant_id": "uuid",
    "patient_uuid": "internal_id",
    "order_id": "ORD_123"
  }
  ```
- **Descriptions**: Use generic terms like "Telehealth Services"

### PCI Compliance
- **No Card Storage**: All card data handled by Stripe
- **Token-based**: Use PaymentMethod IDs for charges
- **SSL/TLS Required**: All API calls must use HTTPS

### Security Best Practices
1. **Webhook Verification**: Always verify webhook signatures
2. **Idempotency**: Use idempotency keys for write operations
3. **Rate Limiting**: Implement rate limiting on API endpoints
4. **Audit Logging**: Log all payment operations
5. **Error Handling**: Never expose internal errors to clients

---

## Rate Limits
- **API Calls**: 100 requests per second per IP
- **Webhook Processing**: Must respond within 20 seconds
- **Bulk Operations**: Batch size limit of 100

---

## Support

For technical support:
- Email: tech-support@eonmeds.com
- Documentation: https://docs.eonmeds.com
- Stripe Dashboard: https://dashboard.stripe.com

For payment issues:
- Email: billing@eonmeds.com
- Phone: 1-800-EONMEDS

---

## Changelog

### Version 1.0.0 (2025-09-07)
- Initial release
- Single Stripe account architecture
- Support for cards, Apple Pay, Google Pay
- Subscription management
- Webhook processing with idempotency
- External payment matching
- Ledger reconciliation
