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

echo -e "\n✅ If /version and /tracking/test work, deployment is successful!"
