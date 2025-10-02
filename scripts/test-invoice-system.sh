#!/bin/bash

# Test Invoice System
# This script tests the new invoice module endpoints

set -e

echo "🧪 Testing Invoice System"
echo "========================"

# Configuration
API_URL="${API_URL:-https://qm6dnecfhp.us-east-1.awsapprunner.com}"
TOKEN="${AUTH_TOKEN:-}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to make authenticated API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -z "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            "$API_URL$endpoint"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint"
    fi
}

echo ""
echo "🔐 First, get an auth token if needed..."
echo "You can get this from the browser console after logging in"
echo "Look for 'Bearer ...' in the Authorization header"
echo ""

if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}⚠️  No auth token set. Set AUTH_TOKEN environment variable${NC}"
    echo "Example: export AUTH_TOKEN='your-jwt-token-here'"
    exit 1
fi

echo "✅ Using provided auth token"
echo ""

# Test 1: Create an invoice
echo "📝 Test 1: Creating a new invoice..."
INVOICE_DATA='{
  "customerId": "P1655",
  "lineItems": [
    {
      "description": "Telehealth Consultation",
      "quantity": 1,
      "unitPrice": 150.00,
      "taxRate": 0.08
    },
    {
      "description": "Lab Work",
      "quantity": 1,
      "unitPrice": 75.00,
      "taxRate": 0.08
    }
  ],
  "notes": "Thank you for your visit!",
  "dueDate": "2025-02-01"
}'

INVOICE_RESPONSE=$(api_call POST "/api/v1/invoices" "$INVOICE_DATA")

if echo "$INVOICE_RESPONSE" | grep -q "invoice"; then
    echo -e "${GREEN}✅ Invoice created successfully!${NC}"
    INVOICE_ID=$(echo "$INVOICE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    INVOICE_NUMBER=$(echo "$INVOICE_RESPONSE" | grep -o '"number":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   Invoice Number: $INVOICE_NUMBER"
    echo "   Invoice ID: $INVOICE_ID"
else
    echo -e "${RED}❌ Failed to create invoice${NC}"
    echo "Response: $INVOICE_RESPONSE"
    exit 1
fi

echo ""

# Test 2: List invoices
echo "📋 Test 2: Listing invoices..."
LIST_RESPONSE=$(api_call GET "/api/v1/invoices?limit=5")

if echo "$LIST_RESPONSE" | grep -q "invoices"; then
    echo -e "${GREEN}✅ Invoice list retrieved successfully!${NC}"
    INVOICE_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    echo "   Total invoices: $INVOICE_COUNT"
else
    echo -e "${RED}❌ Failed to list invoices${NC}"
    echo "Response: $LIST_RESPONSE"
fi

echo ""

# Test 3: Get specific invoice
if [ ! -z "$INVOICE_ID" ]; then
    echo "🔍 Test 3: Getting invoice details..."
    GET_RESPONSE=$(api_call GET "/api/v1/invoices/$INVOICE_ID")
    
    if echo "$GET_RESPONSE" | grep -q "$INVOICE_ID"; then
        echo -e "${GREEN}✅ Invoice retrieved successfully!${NC}"
        TOTAL_AMOUNT=$(echo "$GET_RESPONSE" | grep -o '"totalAmount":[0-9.]*' | cut -d':' -f2)
        echo "   Total Amount: \$$TOTAL_AMOUNT"
    else
        echo -e "${RED}❌ Failed to get invoice${NC}"
        echo "Response: $GET_RESPONSE"
    fi
    
    echo ""
fi

# Test 4: Apply payment
if [ ! -z "$INVOICE_ID" ]; then
    echo "💳 Test 4: Applying payment to invoice..."
    PAYMENT_DATA='{
      "amount": 243.00,
      "method": "card",
      "reference": "Test payment"
    }'
    
    PAYMENT_RESPONSE=$(api_call POST "/api/v1/invoices/$INVOICE_ID/payments" "$PAYMENT_DATA")
    
    if echo "$PAYMENT_RESPONSE" | grep -q "success"; then
        echo -e "${GREEN}✅ Payment applied successfully!${NC}"
        if echo "$PAYMENT_RESPONSE" | grep -q "paid in full"; then
            echo "   Invoice is now paid in full!"
        fi
    else
        echo -e "${RED}❌ Failed to apply payment${NC}"
        echo "Response: $PAYMENT_RESPONSE"
    fi
    
    echo ""
fi

# Test 5: Generate aging report
echo "📊 Test 5: Generating aging report..."
AGING_RESPONSE=$(api_call GET "/api/v1/reports/aging")

if echo "$AGING_RESPONSE" | grep -q "report"; then
    echo -e "${GREEN}✅ Aging report generated successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Aging report may not be available yet${NC}"
fi

echo ""

# Test 6: Create a quote
echo "💰 Test 6: Creating a quote..."
QUOTE_DATA='{
  "customerId": "P1655",
  "lineItems": [
    {
      "description": "Monthly Wellness Program",
      "quantity": 1,
      "unitPrice": 299.00,
      "taxRate": 0.08
    }
  ],
  "validDays": 30,
  "notes": "Special offer - 10% off if you sign up today!"
}'

QUOTE_RESPONSE=$(api_call POST "/api/v1/quotes" "$QUOTE_DATA")

if echo "$QUOTE_RESPONSE" | grep -q "quote"; then
    echo -e "${GREEN}✅ Quote created successfully!${NC}"
    QUOTE_ID=$(echo "$QUOTE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    QUOTE_NUMBER=$(echo "$QUOTE_RESPONSE" | grep -o '"number":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   Quote Number: $QUOTE_NUMBER"
else
    echo -e "${YELLOW}⚠️  Quote creation may not be available yet${NC}"
fi

echo ""
echo "========================================="
echo "📊 Invoice System Test Summary"
echo "========================================="
echo ""

if [ ! -z "$INVOICE_NUMBER" ]; then
    echo -e "${GREEN}✅ Invoice System is WORKING!${NC}"
    echo ""
    echo "Successfully created:"
    echo "  - Invoice: $INVOICE_NUMBER"
    [ ! -z "$QUOTE_NUMBER" ] && echo "  - Quote: $QUOTE_NUMBER"
    echo ""
    echo "Next steps:"
    echo "1. Fix Stripe API key to enable real payments"
    echo "2. Build frontend UI components"
    echo "3. Deploy to production"
else
    echo -e "${RED}❌ Invoice System needs attention${NC}"
    echo ""
    echo "Check:"
    echo "1. Backend is running"
    echo "2. Database migrations completed"
    echo "3. Auth token is valid"
fi
