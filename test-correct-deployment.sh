#!/bin/bash

API_URL="https://eonmeds-backend-v2-production.up.railway.app"

echo "🔍 Testing if correct code is deployed"
echo "===================================="

echo -e "\n1. Version endpoint (should exist):"
curl -s $API_URL/version 2>/dev/null | jq . || echo "❌ Not found"

echo -e "\n2. Invoice routes (should NOT require auth for list):"
curl -s $API_URL/api/v1/invoices 2>/dev/null | jq . || echo "❌ Error"

echo -e "\n3. Tracking test:"
curl -s $API_URL/api/v1/tracking/test 2>/dev/null | jq . || echo "❌ Not found"

echo -e "\n4. Webhook (should NOT require auth):"
curl -s -X POST $API_URL/api/v1/payments/webhook/stripe \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}' 2>/dev/null | jq . || echo "❌ Error"

echo -e "\n===================================="
echo "If all return errors, Railway is using OLD code!"
