#!/bin/bash

# Update this with your new Railway URL after deployment
# Example: https://eonmeds-backend-v2-production.up.railway.app
NEW_API_URL="https://eonmeds-backend-v2-production.up.railway.app"

echo "🔍 Verifying New Railway Deployment"
echo "===================================="

echo -e "\n1. Health Check:"
curl -s $NEW_API_URL/health | jq .

echo -e "\n2. Version (should be 2.0.0-clean-reset):"
curl -s $NEW_API_URL/version | jq .

echo -e "\n3. API Root:"
curl -s $NEW_API_URL/api/v1 | jq .

echo -e "\n4. Invoice Routes (should NOT return 404):"
curl -s $NEW_API_URL/api/v1/invoices | jq .

echo -e "\n5. Tracking Test:"
curl -s $NEW_API_URL/api/v1/tracking/test | jq .

echo -e "\n===================================="
echo "✅ If all endpoints return data (not 404), deployment successful!"
echo "❌ If any return 'Not Found', check Railway logs"
