#!/bin/bash

# Script to verify which code version is deployed
API_URL="https://eonmeds-backend-v2-production.up.railway.app"

echo "🔍 Verifying Deployed Code Version"
echo "=================================="

# Test if version endpoint exists (NEW code)
echo -e "\n📌 Testing /version endpoint (should exist in NEW code):"
VERSION_CODE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/version)

if [ "$VERSION_CODE" = "200" ]; then
    echo "✅ VERSION ENDPOINT EXISTS - NEW CODE IS DEPLOYED!"
    curl -s $API_URL/version | jq .
else
    echo "❌ VERSION ENDPOINT NOT FOUND - OLD CODE IS DEPLOYED"
    echo "HTTP Status: $VERSION_CODE"
fi

# Test if tracking endpoint exists (NEW code)
echo -e "\n📌 Testing /api/v1/tracking/test endpoint (should exist in NEW code):"
TRACKING_CODE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/api/v1/tracking/test)

if [ "$TRACKING_CODE" = "200" ]; then
    echo "✅ TRACKING ENDPOINT EXISTS - NEW CODE IS DEPLOYED!"
else
    echo "❌ TRACKING ENDPOINT NOT FOUND - OLD CODE IS DEPLOYED"
    echo "HTTP Status: $TRACKING_CODE"
fi

# Show deployment verdict
echo -e "\n🎯 DEPLOYMENT STATUS:"
if [ "$VERSION_CODE" = "200" ] && [ "$TRACKING_CODE" = "200" ]; then
    echo "✅ CORRECT CODE IS DEPLOYED!"
    echo "You can now update Stripe webhooks and frontend."
else
    echo "❌ OLD CODE IS STILL DEPLOYED!"
    echo "Please follow RAILWAY_MANUAL_FIX_GUIDE.md to fix this."
fi
