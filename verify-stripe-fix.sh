#!/bin/bash
set -euo pipefail

echo "=== STRIPE FIX VERIFICATION SCRIPT ==="
echo ""
echo "Waiting for Railway deployment to complete..."
echo "Please redeploy in Railway Dashboard (⋯ → Redeploy)"
echo ""
echo "Once deployed, press Enter to continue..."
read -p ""

BACKEND_URL="https://eonmeds-backend-v2-production.up.railway.app"

echo ""
echo "=== 1) Testing Stripe Diagnostics Endpoint ==="
echo "This shows the runtime configuration..."
curl -s "$BACKEND_URL/api/v1/billing/stripe/diagnostics" | jq . || echo "Failed to get diagnostics"

echo ""
echo "=== 2) Testing Version Endpoint ==="
curl -s "$BACKEND_URL/version" | jq . || echo "Failed to get version"

echo ""
echo "=== 3) Testing Stripe Customer Creation ==="
echo "If this works, Stripe is properly configured..."
curl -s -X POST "$BACKEND_URL/api/v1/billing/stripe/customers" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@eonmeds.com","name":"Test User","patientId":"P999"}' | jq . || echo "Failed to create customer"

echo ""
echo "=== 4) Testing Setup Intent Creation ==="
echo "This requires a valid customer ID from step 3..."
echo "Replace <cus_xxx> with actual customer ID:"
echo "curl -s -X POST $BACKEND_URL/api/v1/billing/stripe/setup-intent \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"customerId\":\"<cus_xxx>\"}' | jq ."

echo ""
echo "=== INTERPRETATION ==="
echo "1. If diagnostics shows 'stripeMode: live' with masked key → Environment is correct"
echo "2. If customer creation works → Stripe API key is valid and working"
echo "3. If you see 'Invalid API Key' → The fix didn't work, check Railway logs"
echo ""
echo "Check deployment logs for 'STRIPE_BOOT' message with masked key."