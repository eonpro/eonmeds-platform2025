#!/bin/bash
# Test if Railway is running the new code

echo "Testing Railway deployment..."
API_URL="https://eonmeds-backend-v2-production.up.railway.app"

echo -e "\n1. Testing /version endpoint (should exist):"
curl -s "$API_URL/version" | jq . || echo "Not found - OLD CODE!"

echo -e "\n2. Testing /api/v1/tracking/test endpoint (should exist):"
curl -s "$API_URL/api/v1/tracking/test" | jq . || echo "Not found - OLD CODE!"

echo -e "\n3. Testing Stripe webhook (should return 400, not 401):"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST "$API_URL/api/v1/webhooks/stripe" \
  -H "Content-Type: application/json" \
  -d '{}' | tail -2

echo -e "\n4. Checking deployment info:"
curl -s "$API_URL/health" | jq .
