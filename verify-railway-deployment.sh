#!/bin/bash

# Final Railway deployment verification script
API_URL="https://eonmeds-backend-v2-production.up.railway.app"

echo "🧪 Railway Deployment Verification"
echo "=================================="
echo ""

# 1. Test version endpoint
echo "1️⃣ Testing /version endpoint:"
VERSION_RESPONSE=$(curl -s $API_URL/version)
echo $VERSION_RESPONSE | jq .

# Extract values
COMMIT=$(echo $VERSION_RESPONSE | jq -r '.commit // "null"')
BUILD_ID=$(echo $VERSION_RESPONSE | jq -r '.buildId // "null"')

if [ "$COMMIT" != "null" ] || [ "$BUILD_ID" != "null" ]; then
    echo "✅ Version endpoint working! Commit: $COMMIT, Build: $BUILD_ID"
else
    echo "❌ Version endpoint not returning expected data"
fi

echo ""

# 2. Test tracking endpoint
echo "2️⃣ Testing /api/v1/tracking/test endpoint:"
TRACKING_RESPONSE=$(curl -s $API_URL/api/v1/tracking/test)
echo $TRACKING_RESPONSE | jq .

OK_STATUS=$(echo $TRACKING_RESPONSE | jq -r '.ok // false')
if [ "$OK_STATUS" = "true" ]; then
    echo "✅ Tracking test endpoint working!"
else
    echo "❌ Tracking test endpoint not working"
fi

echo ""

# 3. Test Stripe webhook (should return 400, not 401)
echo "3️⃣ Testing Stripe webhook endpoint:"
WEBHOOK_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
    $API_URL/api/v1/webhooks/stripe \
    -H "Content-Type: application/json" \
    -d '{}')
    
WEBHOOK_BODY=$(echo "$WEBHOOK_RESPONSE" | sed '$d')
WEBHOOK_CODE=$(echo "$WEBHOOK_RESPONSE" | tail -1 | cut -d: -f2)

echo "Response: $WEBHOOK_BODY"
echo "HTTP Status: $WEBHOOK_CODE"

if [ "$WEBHOOK_CODE" = "400" ]; then
    echo "✅ Stripe webhook bypasses auth correctly (400 = missing signature)"
elif [ "$WEBHOOK_CODE" = "401" ]; then
    echo "❌ Stripe webhook blocked by auth (should return 400, not 401)"
else
    echo "⚠️  Unexpected status code: $WEBHOOK_CODE"
fi

echo ""

# 4. Summary
echo "📊 DEPLOYMENT SUMMARY:"
echo "====================="

if [ "$COMMIT" != "null" ] || [ "$BUILD_ID" != "null" ]; then
    echo "✅ Deployment version: $COMMIT (build: $BUILD_ID)"
else
    echo "❌ Cannot verify deployment version"
fi

if [ "$OK_STATUS" = "true" ]; then
    echo "✅ API endpoints working"
else
    echo "❌ API endpoints not responding correctly"
fi

if [ "$WEBHOOK_CODE" = "400" ]; then
    echo "✅ Webhook auth configured correctly"
else
    echo "❌ Webhook auth needs fixing"
fi

echo ""
echo "🔍 Check deploy logs for: DEPLOY_VERSION: <commit-sha>"
