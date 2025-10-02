#!/bin/bash

# HIPAA Security Implementation Test Script
# Run this after completing all Auth0 and security changes

echo "🔒 HIPAA Security Implementation Test Suite"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="https://qm6dnecfhp.us-east-1.awsapprunner.com"
FRONTEND_URL="https://d3p4f8m2bxony8.cloudfront.net"
S3_BUCKET="eonmeds-frontend-staging"
AWS_REGION="us-east-1"

# Test results
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local expected_code=$2
    local description=$3
    
    echo -n "Testing: $description... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
    
    if [ "$response" == "$expected_code" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $response)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} (Expected $expected_code, got $response)"
        ((FAILED++))
    fi
}

echo "1️⃣  Testing API Protection"
echo "----------------------------"
test_endpoint "$API_URL/health" "200" "Health check (should be public)"
test_endpoint "$API_URL/api/v1/patients" "401" "Patient API (should require auth)"
test_endpoint "$API_URL/api/v1/practitioners" "401" "Practitioner API (should require auth)"
test_endpoint "$API_URL/api/v1/appointments" "401" "Appointments API (should require auth)"
test_endpoint "$API_URL/api/v1/invoices" "401" "Invoices API (should require auth)"
echo ""

echo "2️⃣  Testing S3 Security"
echo "------------------------"

echo -n "Testing: S3 public access block... "
block_status=$(aws s3api get-public-access-block \
    --bucket "$S3_BUCKET" \
    --region "$AWS_REGION" 2>/dev/null | \
    grep -c "true" || echo "0")

if [ "$block_status" -eq "4" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (All public access blocked)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} (Public access not fully blocked)"
    ((FAILED++))
fi

echo -n "Testing: S3 encryption... "
encryption=$(aws s3api get-bucket-encryption \
    --bucket "$S3_BUCKET" \
    --region "$AWS_REGION" 2>/dev/null | \
    grep -c "AES256" || echo "0")

if [ "$encryption" -gt "0" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (AES256 encryption enabled)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} (Encryption not enabled)"
    ((FAILED++))
fi

echo -n "Testing: S3 direct access... "
s3_response=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://$S3_BUCKET.s3.amazonaws.com/index.html")

if [ "$s3_response" == "403" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (Access denied as expected)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} (Expected 403, got $s3_response)"
    ((FAILED++))
fi
echo ""

echo "3️⃣  Testing Frontend Access"
echo "----------------------------"
test_endpoint "$FRONTEND_URL" "200" "CloudFront distribution"
test_endpoint "$FRONTEND_URL/index.html" "200" "Frontend index.html"
echo ""

echo "4️⃣  Auth0 Configuration Checklist"
echo "----------------------------------"
echo "Please verify in Auth0 Dashboard:"
echo "  ☐ Client Secret rotated"
echo "  ☐ S3 URLs removed from Allowed Callbacks"
echo "  ☐ S3 URLs removed from Allowed Logout URLs"
echo "  ☐ S3 URLs removed from Allowed Web Origins"
echo "  ☐ Token Endpoint Authentication = None"
echo "  ☐ Only Auth Code + Refresh Token grants enabled"
echo ""

echo "5️⃣  Checking Backend Security Files"
echo "------------------------------------"
files_to_check=(
    "packages/backend/src/middleware/emergency-auth.ts"
    "packages/backend/src/utils/log-sanitizer.ts"
    "packages/backend/src/utils/hipaa-audit.ts"
)

for file in "${files_to_check[@]}"; do
    echo -n "Checking: $file... "
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ EXISTS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ MISSING${NC}"
        ((FAILED++))
    fi
done
echo ""

echo "📊 Test Results Summary"
echo "----------------------"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All automated tests passed!${NC}"
    echo "Please complete the Auth0 Dashboard checklist manually."
else
    echo -e "${YELLOW}⚠️  Some tests failed. Please review and fix issues.${NC}"
fi
echo ""

echo "📝 Next Steps:"
echo "1. Complete Auth0 Dashboard configuration"
echo "2. Test login flow manually"
echo "3. Deploy backend if not already done"
echo "4. Monitor logs for 24 hours"
echo "5. Document completion for compliance"
