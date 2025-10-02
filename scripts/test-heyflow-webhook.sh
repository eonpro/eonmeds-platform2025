#!/bin/bash
set -euo pipefail

echo "🔍 TESTING HEYFLOW WEBHOOK STATUS"
echo "=================================="
echo ""

# Configuration
BACKEND_URL="https://qm6dnecfhp.us-east-1.awsapprunner.com"
HEYFLOW_WEBHOOK_URL="${BACKEND_URL}/api/v1/webhooks/general/heyflow"
OLD_WEBHOOK_URL="${BACKEND_URL}/api/v1/webhooks/heyflow"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo "📡 Step 1: Testing HeyFlow webhook endpoints"
echo "--------------------------------------------"

# Test the general webhook endpoint (new URL structure)
echo -n "Testing ${HEYFLOW_WEBHOOK_URL}... "
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$HEYFLOW_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "test": true,
    "eventType": "form.submitted",
    "submissionId": "test-'$(date +%s)'",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "data": {
      "email": "test@example.com",
      "firstName": "Test",
      "lastName": "User"
    }
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    print_status "Webhook endpoint is WORKING (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
else
    print_error "Webhook endpoint returned HTTP $HTTP_CODE"
    echo "Response: $BODY"
fi

echo ""

# Test the direct webhook endpoint (old URL structure)
echo -n "Testing ${OLD_WEBHOOK_URL}... "
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$OLD_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "test": true,
    "eventType": "form.submitted",
    "submissionId": "test-direct-'$(date +%s)'"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    print_status "Direct webhook endpoint is WORKING (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
elif [ "$HTTP_CODE" == "404" ]; then
    print_warning "Direct endpoint not found (may not be configured)"
else
    print_error "Direct webhook endpoint returned HTTP $HTTP_CODE"
    echo "Response: $BODY"
fi

echo ""
echo "📊 Step 2: Checking webhook configuration"
echo "-----------------------------------------"

# Check if HeyFlow webhook secret is configured
echo -n "Checking webhook secret configuration... "
TEST_WITH_SECRET=$(curl -s -w "\n%{http_code}" -X POST "$HEYFLOW_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "x-heyflow-signature: test-signature" \
  -d '{"test": true}')

if echo "$TEST_WITH_SECRET" | grep -q "401"; then
    print_warning "Webhook signature verification is ENABLED (needs correct secret)"
else
    print_info "Webhook signature verification is DISABLED or SKIPPED"
fi

echo ""
echo "🔗 Step 3: Testing backend database connectivity"
echo "------------------------------------------------"

# Test if backend can connect to database
echo -n "Checking backend health... "
HEALTH_RESPONSE=$(curl -s "${BACKEND_URL}/health")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    print_status "Backend is healthy"
else
    print_error "Backend health check failed"
    echo "Response: $HEALTH_RESPONSE"
fi

echo ""
echo "📝 Step 4: HeyFlow Configuration Instructions"
echo "---------------------------------------------"
echo ""
print_info "To configure HeyFlow to send webhooks:"
echo ""
echo "1. Log in to HeyFlow: https://app.heyflow.app"
echo "2. Go to your form/flow"
echo "3. Navigate to: Settings → Integrations → Webhooks"
echo "4. Add or update webhook with:"
echo "   URL: ${HEYFLOW_WEBHOOK_URL}"
echo "   Method: POST"
echo "   Events: Form Submission"
echo ""

echo "📋 SUMMARY"
echo "=========="
echo ""
echo "Webhook URL to use in HeyFlow:"
echo -e "${GREEN}${HEYFLOW_WEBHOOK_URL}${NC}"
echo ""

# Check environment variable configuration
print_info "Current configuration:"
echo "  - Backend URL: $BACKEND_URL"
echo "  - Webhook Path: /api/v1/webhooks/general/heyflow"
echo "  - Signature Verification: SKIPPED (HEYFLOW_WEBHOOK_SECRET=SKIP)"
echo ""

print_warning "IMPORTANT NOTES:"
echo "1. Make sure HeyFlow is configured with the exact URL above"
echo "2. The webhook is currently set to SKIP signature verification"
echo "3. Submissions should create patients in the database"
echo "4. Check CloudWatch logs if submissions aren't appearing"
echo ""

echo "🧪 TEST SUBMISSION"
echo "=================="
echo ""
echo "To test with a realistic submission, run:"
echo ""
cat << 'EOF'
curl -X POST https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/webhooks/general/heyflow \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "form.submitted",
    "submissionId": "test-'$(date +%s)'",
    "flowId": "weight-loss-intake",
    "data": {
      "email": "patient@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "dateOfBirth": "1990-01-01",
      "gender": "male",
      "height": "72",
      "weight": "200",
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001"
    }
  }'
EOF

echo ""
print_status "Testing complete!"
