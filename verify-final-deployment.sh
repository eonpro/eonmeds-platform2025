#!/bin/bash
set -e

echo "🔍 Verifying Railway Deployment with Stripe Routes..."
echo "=================================================="

BASE_URL="https://eonmeds-backend-v2-production.up.railway.app"

echo -e "\n1️⃣ Checking /version endpoint..."
VERSION=$(curl -s "$BASE_URL/version")
echo "$VERSION" | jq . || echo "❌ Version endpoint not found"

echo -e "\n2️⃣ Checking /api/v1/tracking/test endpoint..."
TRACKING=$(curl -s "$BASE_URL/api/v1/tracking/test")
echo "$TRACKING" | jq . || echo "❌ Tracking endpoint not found"

echo -e "\n3️⃣ Checking Stripe diagnostics..."
DIAG=$(curl -s "$BASE_URL/api/v1/billing/stripe/diagnostics")
echo "$DIAG" | jq . || echo "❌ Diagnostics endpoint not found"

echo -e "\n4️⃣ Checking Stripe billing routes..."
# Try to create a customer (will fail with auth, but should not be 404)
CUSTOMER=$(curl -s -X POST "$BASE_URL/api/v1/billing/stripe/customers" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}')
echo "$CUSTOMER" | jq .

echo -e "\n5️⃣ Checking webhook endpoints..."
# Primary webhook path
WEBHOOK1=$(curl -s -X POST "$BASE_URL/api/v1/webhooks/stripe" \
  -H "Content-Type: application/json" \
  -d '{}' -w "\nHTTP Status: %{http_code}")
echo "$WEBHOOK1"

# Compat webhook path  
WEBHOOK2=$(curl -s -X POST "$BASE_URL/api/v1/payments/webhook/stripe" \
  -H "Content-Type: application/json" \
  -d '{}' -w "\nHTTP Status: %{http_code}")
echo "$WEBHOOK2"

echo -e "\n✅ Deployment verification complete!"
echo "Look for:"
echo "- Version endpoint with commit/buildId"
echo "- Tracking endpoint returning {ok: true}"
echo "- Diagnostics showing stripeMode and masked key"
echo "- Billing routes (not 404 errors)"
echo "- Webhook endpoints returning 400 (not 401)"


