#!/bin/bash
# Test Stripe Webhook After Secret Update

echo "=== Stripe Webhook Test Script ==="
echo "This will test if your webhook is properly configured after updating the secret"
echo ""

# Wait for user to update Railway
echo "Have you updated STRIPE_WEBHOOK_SECRET in Railway? (y/n)"
read -r response
if [[ "$response" != "y" ]]; then
  echo "Please update Railway first with: whsec_iygeI9jc3SK6NMdUXMVX03n46ycgtBrN"
  exit 1
fi

echo ""
echo "Waiting 30 seconds for Railway to redeploy..."
sleep 30

echo ""
echo "=== Testing Webhook Endpoint ==="

# Test 1: Basic connectivity (should return 400 with "No signature found")
echo "1. Testing basic connectivity..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  https://eonmeds-backend-v2-production.up.railway.app/api/v1/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}' 2>/dev/null)

status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | grep -v "HTTP_STATUS:")

if [[ "$status" == "400" ]] && echo "$body" | grep -q "signature"; then
  echo "✅ Webhook endpoint is reachable and checking signatures"
else
  echo "❌ Unexpected response. Status: $status"
  echo "Body: $body"
fi

echo ""
echo "=== Testing with Stripe CLI ==="
echo "To fully test webhook delivery, run these commands:"
echo ""
echo "1. Install Stripe CLI (if not already installed):"
echo "   brew install stripe/stripe-cli/stripe"
echo ""
echo "2. Login to Stripe:"
echo "   stripe login"
echo ""
echo "3. Forward webhooks to your Railway app:"
echo "   stripe listen --forward-to https://eonmeds-backend-v2-production.up.railway.app/api/v1/webhooks/stripe"
echo ""
echo "4. In another terminal, trigger a test event:"
echo "   stripe trigger payment_intent.succeeded"
echo ""
echo "You should see:"
echo "- '200 OK' in the Stripe CLI"
echo "- Event processed in your Railway logs"
echo ""
echo "=== Alternative: Send Test from Stripe Dashboard ==="
echo "1. Go to your webhook endpoint in Stripe Dashboard"
echo "2. Click 'Send test webhook'"
echo "3. Select any event type"
echo "4. Click 'Send test webhook'"
echo "5. Check 'Event deliveries' tab - should show success ✅"
