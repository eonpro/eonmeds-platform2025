#!/bin/bash

# Test charge.succeeded event
echo "Testing charge.succeeded webhook..."

curl -X POST http://localhost:3002/api/v1/payments/webhook/stripe \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test_charge",
    "type": "charge.succeeded",
    "data": {
      "object": {
        "id": "ch_test_external",
        "amount": 9900,
        "currency": "usd",
        "paid": true,
        "billing_details": {
          "email": "external.test@example.com",
          "name": "External Test User"
        },
        "customer": null,
        "payment_intent": null,
        "metadata": {
          "external": "true"
        }
      }
    }
  }' | jq

echo -e "\n\nTesting checkout.session.completed webhook..."

curl -X POST http://localhost:3002/api/v1/payments/webhook/stripe \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test_checkout",
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_external",
        "amount_total": 19900,
        "currency": "usd",
        "customer_email": "checkout.external@example.com",
        "customer_details": {
          "email": "checkout.external@example.com",
          "name": "Checkout External User"
        },
        "mode": "payment",
        "payment_status": "paid"
      }
    }
  }' | jq 