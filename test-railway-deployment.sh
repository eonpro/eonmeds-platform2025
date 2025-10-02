#!/bin/bash

echo "🔍 Testing Railway Deployment Status"
echo "===================================="

API_URL="https://eonmeds-platform2025-production.up.railway.app"

echo -e "\n1. Testing Health Endpoint:"
curl -s $API_URL/health | jq . || echo "❌ Health endpoint failed"

echo -e "\n2. Testing Version Endpoint (should exist):"
curl -s $API_URL/version | jq . || echo "❌ Version endpoint missing"

echo -e "\n3. Testing Tracking Test Endpoint:"
curl -s $API_URL/api/v1/tracking/test | jq . || echo "❌ Tracking test endpoint missing"

echo -e "\n4. Testing Tracking Import (with wrong API key):"
curl -s -X POST $API_URL/api/v1/tracking/import \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wrong-key" \
  -d '{"test": "data"}' | jq . || echo "❌ Tracking import endpoint missing"

echo -e "\n5. Checking for trust proxy error in logs:"
echo "If you see 'trust proxy' errors in Railway logs, the deployment is OLD"

echo -e "\n===================================="
echo "RESULTS:"
echo "If endpoints 2, 3, or 4 return 'Not Found', Railway is using OLD code"
echo "The tracking routes are NOT deployed!"
