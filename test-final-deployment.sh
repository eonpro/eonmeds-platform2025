#!/bin/bash

# Test script for final Railway deployment
API_URL="https://eonmeds-backend-v2-production.up.railway.app"

echo "🧪 Testing Railway Backend Deployment"
echo "======================================"

# Test health endpoint
echo -e "\n1️⃣ Testing /health endpoint:"
curl -s $API_URL/health | jq .

# Test version endpoint (should work with trust proxy fix)
echo -e "\n2️⃣ Testing /version endpoint:"
curl -s $API_URL/version | jq .

# Test API info
echo -e "\n3️⃣ Testing /api/v1 endpoint:"
curl -s $API_URL/api/v1 | jq .

# Test tracking endpoint (should work with trust proxy fix)
echo -e "\n4️⃣ Testing /api/v1/tracking/test endpoint:"
curl -s $API_URL/api/v1/tracking/test | jq .

# Test invoice endpoint (should require auth)
echo -e "\n5️⃣ Testing /api/v1/payments/invoices (should return 401):"
curl -s $API_URL/api/v1/payments/invoices/test | jq .

# Test Stripe webhook (should return 400 - missing signature)
echo -e "\n6️⃣ Testing Stripe webhook (should return 400):"
curl -s -X POST $API_URL/api/v1/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo -e "\n✅ If /version and /tracking/test work, deployment is successful!"
