#!/bin/bash

# Test script for external payment mirroring functionality
# This script creates a Stripe payment without an invoice to test the mirroring system

set -e  # Exit on error

echo "🧪 Testing External Payment Mirroring"
echo "===================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo -e "${RED}❌ Stripe CLI not found. Please install it first.${NC}"
    echo "   brew install stripe/stripe-cli/stripe"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not set. Please export it first.${NC}"
    exit 1
fi

# Test email
TEST_EMAIL="test+mirror@example.com"
TEST_PATIENT_ID="P9001"

echo -e "${YELLOW}📋 Step 1: Creating test patient in database${NC}"
psql $DATABASE_URL << EOF
INSERT INTO patients (patient_id, first_name, last_name, email, created_at) 
VALUES ('$TEST_PATIENT_ID', 'Mirror', 'Test', '$TEST_EMAIL', NOW())
ON CONFLICT (patient_id) DO UPDATE 
SET email = '$TEST_EMAIL', 
    first_name = 'Mirror',
    last_name = 'Test';
EOF
echo -e "${GREEN}✓ Patient created/updated${NC}"

echo -e "\n${YELLOW}📋 Step 2: Creating Stripe customer${NC}"
CUSTOMER_JSON=$(stripe customers create \
  --email "$TEST_EMAIL" \
  --name "Mirror Test" \
  --description "Test customer for external payment mirroring" \
  --metadata[test]="external_payment_mirror")

CUSTOMER_ID=$(echo $CUSTOMER_JSON | jq -r '.id')
echo -e "${GREEN}✓ Customer created: $CUSTOMER_ID${NC}"

echo -e "\n${YELLOW}📋 Step 3: Creating PaymentIntent (no invoice)${NC}"
PAYMENT_JSON=$(stripe payment_intents create \
  --amount 1200 \
  --currency usd \
  --customer "$CUSTOMER_ID" \
  --description "External test payment - no invoice" \
  --confirm \
  --payment-method "pm_card_visa")

PAYMENT_ID=$(echo $PAYMENT_JSON | jq -r '.id')
CHARGE_ID=$(echo $PAYMENT_JSON | jq -r '.latest_charge')
echo -e "${GREEN}✓ PaymentIntent created and confirmed: $PAYMENT_ID${NC}"
echo -e "${GREEN}✓ Charge ID: $CHARGE_ID${NC}"

echo -e "\n${YELLOW}📋 Step 4: Waiting for webhook processing...${NC}"
sleep 5

echo -e "\n${YELLOW}📋 Step 5: Checking database for mirrored invoice${NC}"
MIRROR_RESULT=$(psql -t $DATABASE_URL << EOF
SELECT 
  charge_id,
  mode,
  matched_patient_id,
  created_invoice_id,
  amount::decimal/100 as amount_dollars,
  currency,
  email
FROM external_payment_mirrors 
WHERE charge_id = '$CHARGE_ID'
LIMIT 1;
EOF
)

if [ -z "$MIRROR_RESULT" ]; then
    echo -e "${RED}❌ No mirror record found${NC}"
    echo "   This could mean:"
    echo "   - Webhook hasn't processed yet (try waiting longer)"
    echo "   - Webhook endpoint isn't running"
    echo "   - There was an error in processing"
else
    echo -e "${GREEN}✓ Mirror record found:${NC}"
    echo "$MIRROR_RESULT"
    
    # Extract invoice ID if created
    INVOICE_ID=$(echo "$MIRROR_RESULT" | awk -F'|' '{print $4}' | xargs)
    
    if [ ! -z "$INVOICE_ID" ] && [ "$INVOICE_ID" != "" ]; then
        echo -e "\n${YELLOW}📋 Step 6: Verifying Stripe invoice metadata${NC}"
        INVOICE_META=$(stripe invoices retrieve "$INVOICE_ID" | jq '.metadata')
        echo -e "${GREEN}✓ Invoice metadata:${NC}"
        echo "$INVOICE_META"
        
        # Check for expected metadata
        if echo "$INVOICE_META" | grep -q "EONPRO"; then
            echo -e "${GREEN}✓ Platform metadata verified${NC}"
        else
            echo -e "${RED}❌ Platform metadata missing${NC}"
        fi
        
        if echo "$INVOICE_META" | grep -q "$CHARGE_ID"; then
            echo -e "${GREEN}✓ Charge reference verified${NC}"
        else
            echo -e "${RED}❌ Charge reference missing${NC}"
        fi
    fi
fi

echo -e "\n${YELLOW}📋 Step 7: Checking billing notification logs${NC}"
# Note: This assumes your app logs to stdout/stderr
# Adjust the command based on your logging setup
echo "Look for 'BILLING NOTIFICATION' in your application logs"

echo -e "\n${YELLOW}📋 Summary of created test data:${NC}"
echo "- Patient ID: $TEST_PATIENT_ID"
echo "- Email: $TEST_EMAIL"
echo "- Customer ID: $CUSTOMER_ID"
echo "- Payment Intent: $PAYMENT_ID"
echo "- Charge ID: $CHARGE_ID"

echo -e "\n${GREEN}✅ Test complete!${NC}"
echo ""
echo "To clean up test data:"
echo "  stripe customers delete $CUSTOMER_ID"
echo "  psql \$DATABASE_URL -c \"DELETE FROM external_payment_mirrors WHERE charge_id = '$CHARGE_ID';\""
echo "  psql \$DATABASE_URL -c \"DELETE FROM patients WHERE patient_id = '$TEST_PATIENT_ID';\""
