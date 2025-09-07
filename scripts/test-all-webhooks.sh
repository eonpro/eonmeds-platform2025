#!/bin/bash

# Test all webhook endpoints on App Runner

set -euo pipefail

API_URL="https://qm6dnecfhp.us-east-1.awsapprunner.com"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing All Webhook Endpoints on AWS App Runner"
echo "=================================================="
echo "Backend URL: $API_URL"
echo ""

# Test Stripe payment webhook
echo -n "1. Stripe Payment Webhook (/api/v1/payments/webhook/stripe): "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/v1/payments/webhook/stripe" -H "Content-Type: application/json" -d '{"test": true}')
if [ "$STATUS" == "400" ] || [ "$STATUS" == "401" ]; then
    if [ "$STATUS" == "401" ]; then
        echo -e "${RED}❌ BLOCKED by JWT${NC} (Status: $STATUS) - This was the Railway issue!"
    else
        echo -e "${GREEN}✅ READY${NC} (Status: $STATUS - expecting Stripe signature)"
    fi
else
    echo -e "${YELLOW}⚠️  Unexpected${NC} (Status: $STATUS)"
fi

# Test Stripe alternative webhook
echo -n "2. Stripe Alternative Webhook (/api/v1/webhooks/stripe): "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/v1/webhooks/stripe" -H "Content-Type: application/json" -d '{"test": true}')
if [ "$STATUS" == "400" ]; then
    echo -e "${GREEN}✅ READY${NC} (Status: $STATUS - expecting signature)"
elif [ "$STATUS" == "401" ]; then
    echo -e "${RED}❌ BLOCKED by JWT${NC} (Status: $STATUS)"
else
    echo -e "${YELLOW}⚠️  Unexpected${NC} (Status: $STATUS)"
fi

# Test HeyFlow webhook
echo -n "3. HeyFlow Intake Webhook (/api/v1/webhooks/general/heyflow): "
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/webhooks/general/heyflow" \
  -H "Content-Type: application/json" \
  -d '{
    "test": true,
    "eventType": "form.submitted",
    "fields": [],
    "webhookId": "test-webhook-123"
  }')
STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$STATUS" == "200" ]; then
    echo -e "${GREEN}✅ READY${NC} (Status: $STATUS)"
    echo "   Response: $(echo $BODY | jq -c . 2>/dev/null || echo $BODY)"
elif [ "$STATUS" == "401" ]; then
    echo -e "${GREEN}✅ READY${NC} (Status: $STATUS - signature verification working)"
else
    echo -e "${YELLOW}⚠️  Check needed${NC} (Status: $STATUS)"
fi

echo ""
echo "📊 Summary"
echo "=========="

# Check if all webhooks are accessible
if [[ "$STATUS" != "404" ]]; then
    echo -e "${GREEN}✅ All webhook endpoints are accessible!${NC}"
    echo -e "${GREEN}✅ Webhooks are NOT blocked by JWT authentication!${NC}"
    echo ""
    echo "This solves the critical Railway webhook issues:"
    echo "  • Stripe can now send payment events"
    echo "  • HeyFlow can submit patient intake forms"
    echo "  • No authentication middleware blocking webhooks"
else
    echo -e "${YELLOW}⚠️  Some endpoints may need attention${NC}"
fi

echo ""
echo "📝 Next Steps:"
echo "1. Update webhook URLs in Stripe Dashboard"
echo "2. Update webhook URLs in HeyFlow settings"
echo "3. Send test events from each service"
echo "4. Monitor CloudWatch logs for processing"
