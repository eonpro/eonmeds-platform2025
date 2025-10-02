#!/bin/bash
set -euo pipefail

BACKEND_URL="https://eonmeds-backend-v2-production.up.railway.app"

echo "=== STRIPE SMOKE TESTS ==="
echo ""

# 1. Check diagnostics first
echo "=== 1. Checking Diagnostics ==="
DIAG=$(curl -s "$BACKEND_URL/api/v1/billing/stripe/diagnostics")
echo "$DIAG" | jq .

# Check if diagnostics is working
if echo "$DIAG" | grep -q "stripeMode"; then
    echo "✅ Diagnostics endpoint is working"
else
    echo "❌ Diagnostics endpoint not deployed yet. Please redeploy in Railway."
    exit 1
fi

echo ""
echo "=== 2. Creating Customer ==="
CUSTOMER=$(curl -s -X POST "$BACKEND_URL/api/v1/billing/stripe/customers" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo+prod@eonmeds.com","name":"Demo Prod","patientId":"P900"}')
echo "$CUSTOMER" | jq .

# Extract customer ID
CUSTOMER_ID=$(echo "$CUSTOMER" | jq -r '.id // empty')
if [ -z "$CUSTOMER_ID" ]; then
    echo "❌ Failed to create customer"
    exit 1
fi
echo "✅ Customer created: $CUSTOMER_ID"

echo ""
echo "=== 3. Creating Setup Intent ==="
SETUP_INTENT=$(curl -s -X POST "$BACKEND_URL/api/v1/billing/stripe/setup-intent" \
  -H "Content-Type: application/json" \
  -d "{\"customerId\":\"$CUSTOMER_ID\"}")
echo "$SETUP_INTENT" | jq .

CLIENT_SECRET=$(echo "$SETUP_INTENT" | jq -r '.clientSecret // .client_secret // empty')
if [ -n "$CLIENT_SECRET" ]; then
    echo "✅ Setup Intent created. Use this client_secret in frontend with Stripe.js"
fi

echo ""
echo "=== 4. Creating Invoice Item ==="
INVOICE_ITEM=$(curl -s -X POST "$BACKEND_URL/api/v1/billing/stripe/invoices/items" \
  -H "Content-Type: application/json" \
  -d "{\"customerId\":\"$CUSTOMER_ID\",\"amount\":149.00,\"description\":\"GLP-1 Month 1\"}")
echo "$INVOICE_ITEM" | jq .

echo ""
echo "=== 5. Finalizing Invoice ==="
INVOICE=$(curl -s -X POST "$BACKEND_URL/api/v1/billing/stripe/invoices/finalize" \
  -H "Content-Type: application/json" \
  -d "{\"customerId\":\"$CUSTOMER_ID\",\"collectionMethod\":\"charge_automatically\"}")
echo "$INVOICE" | jq .

echo ""
echo "=== SUMMARY ==="
echo "Customer ID: $CUSTOMER_ID"
echo ""
echo "Next steps:"
echo "1. Save a card using the Setup Intent client_secret in your frontend"
echo "2. Test one-off charge: curl -s -X POST $BACKEND_URL/api/v1/billing/stripe/charge -H \"Content-Type: application/json\" -d '{\"customerId\":\"$CUSTOMER_ID\",\"amount\":49.99,\"currency\":\"usd\",\"description\":\"Test charge\"}' | jq ."
echo "3. Create subscription with a price_id from your Stripe Dashboard"
echo ""
echo "To set security environment variables in Railway:"
echo "railway variables set FORCE_SSL=true"
echo "railway variables set PHI_ENCRYPTION_KEY=\$(openssl rand -hex 32)"
echo "railway variables set NODE_ENV=production"
