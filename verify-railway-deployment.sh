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
WEBHOOK_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    $API_URL/api/v1/webhooks/stripe \
    -H "Content-Type: application/json" \
    -d '{}')

echo "HTTP Status: $WEBHOOK_CODE"

if [ "$WEBHOOK_CODE" = "400" ]; then
    echo "✅ Stripe webhook bypasses auth correctly (400 = missing signature)"
elif [ "$WEBHOOK_CODE" = "401" ]; then
    echo "❌ Stripe webhook blocked by auth (should return 400, not 401)"
else
    echo "⚠️  Unexpected status code: $WEBHOOK_CODE"
fi

echo ""
echo "🔍 Check deploy logs for: DEPLOY_VERSION: <commit-sha>"
