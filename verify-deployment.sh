#!/bin/bash
# Railway Deployment Verification Script

API_URL="https://eonmeds-backend-v2-production.up.railway.app"

echo "=== Railway Deployment Verification ==="
echo "Expected commit: 8637697"
echo ""

echo "1. Testing /version endpoint (should return JSON with buildId):"
response=$(curl -s "$API_URL/version")
echo "$response" | jq . 2>/dev/null || echo "$response"
if echo "$response" | grep -q "Not Found"; then
  echo "❌ FAIL: Old code deployed - version endpoint missing"
else
  echo "✅ PASS: Version endpoint exists"
fi
echo ""

echo "2. Testing /api/v1/tracking/test endpoint (should return {ok: true}):"
response=$(curl -s "$API_URL/api/v1/tracking/test")
echo "$response" | jq . 2>/dev/null || echo "$response"
if echo "$response" | grep -q "Not Found"; then
  echo "❌ FAIL: Old code deployed - tracking endpoint missing"
else
  echo "✅ PASS: Tracking endpoint exists"
fi
echo ""

echo "3. Testing Stripe webhook (should return 400 'No signature found'):"
response=$(curl -s -w "\nHTTP Status: %{http_code}" -X POST "$API_URL/api/v1/webhooks/stripe" \
  -H "Content-Type: application/json" -d '{}')
echo "$response" | tail -2
if echo "$response" | grep -q "400"; then
  echo "✅ PASS: Webhook returns 400 (correct)"
else
  echo "❌ FAIL: Webhook not working correctly"
fi
echo ""

echo "4. Testing webhook alias (should also return 400):"
response=$(curl -s -w "\nHTTP Status: %{http_code}" -X POST "$API_URL/api/v1/payments/webhook/stripe" \
  -H "Content-Type: application/json" -d '{}')
echo "$response" | tail -2
if echo "$response" | grep -q "401"; then
  echo "❌ FAIL: Webhook alias blocked by JWT auth"
elif echo "$response" | grep -q "400"; then
  echo "✅ PASS: Webhook alias returns 400 (correct)"
else
  echo "❌ FAIL: Unexpected response"
fi
echo ""

echo "=== DEPLOYMENT STATUS ==="
echo "If any tests show ❌ FAIL, Railway is not deploying the latest code."
echo ""
echo "TO FIX:"
echo "1. Go to Railway Dashboard → Deployments tab"
echo "2. Click 'Deploy' → 'Deploy from a GitHub branch'"
echo "3. Select branch: main"
echo "4. Select commit: 8637697 'chore(ci): force Docker rebuild for probe routes'"
echo "5. Enable 'Clear build cache'"
echo "6. Deploy and wait for completion"
echo "7. Run this script again to verify"
