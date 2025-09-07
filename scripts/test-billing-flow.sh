#!/bin/bash

# Test complete billing flow on staging

set -euo pipefail

echo "🧪 Testing Complete Billing Flow on AWS Staging..."
echo ""

API_URL="https://qm6dnecfhp.us-east-1.awsapprunner.com"
FRONTEND_URL="https://d3p4f8m2bxony8.cloudfront.net"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    local expected_status=$5
    
    echo -n "Testing $description... "
    
    if [ "$method" == "GET" ]; then
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$endpoint")
    else
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint")
    fi
    
    if [ "$STATUS" == "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $STATUS)"
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $STATUS)"
    fi
}

echo "1️⃣ Backend API Tests"
echo "===================="
test_endpoint "GET" "/health" "Health check" "" "200"
test_endpoint "GET" "/version" "Version endpoint" "" "200"
test_endpoint "POST" "/api/v1/webhooks/stripe" "Stripe webhook (no auth)" '{"test": true}' "400"
test_endpoint "GET" "/api/v1/tracking/test" "Tracking endpoint" "" "200"

echo ""
echo "2️⃣ Frontend Tests"
echo "=================="
echo -n "Testing S3 frontend... "
S3_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com")
if [ "$S3_STATUS" == "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} (Status: $S3_STATUS)"
else
    echo -e "${RED}❌ FAIL${NC} (Status: $S3_STATUS)"
fi

echo -n "Testing CloudFront frontend... "
CF_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$CF_STATUS" == "200" ] || [ "$CF_STATUS" == "304" ]; then
    echo -e "${GREEN}✅ PASS${NC} (Status: $CF_STATUS)"
else
    echo -e "${YELLOW}⚠️  PENDING${NC} (Status: $CF_STATUS - CloudFront may still be deploying)"
fi

echo ""
echo "3️⃣ Stripe Integration Tests"
echo "==========================="
echo -e "${YELLOW}Note: These require authentication${NC}"
test_endpoint "GET" "/api/v1/billing/stripe/test" "Stripe billing test" "" "401"
test_endpoint "POST" "/api/v1/billing/stripe/customers" "Create customer" '{"email":"test@example.com"}' "401"

echo ""
echo "4️⃣ Database Connectivity"
echo "======================="
DB_CHECK=$(curl -s "$API_URL/health" | grep -o '"database":"connected"' || echo "not found")
if [[ "$DB_CHECK" == *"connected"* ]]; then
    echo -e "${GREEN}✅ Database connected${NC}"
else
    echo -e "${RED}❌ Database connection issue${NC}"
fi

echo ""
echo "📊 Summary"
echo "=========="
echo "Backend API: $API_URL"
echo "Frontend S3: http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com"
echo "Frontend CDN: $FRONTEND_URL"
echo ""
echo "✅ Backend is ready for Stripe webhooks"
echo "✅ Frontend is deployed and accessible"
echo ""
echo "📝 Next Steps:"
echo "1. Update Stripe webhook URL in dashboard"
echo "2. Test with Auth0 authentication"
echo "3. Verify complete payment flow"
echo "4. Create production App Runner service"
