#!/bin/bash

# Test Stripe Integration
# This script tests the Stripe payment endpoints and webhook processing

set -e

echo "🚀 Testing Stripe Integration"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
STRIPE_CLI_INSTALLED=$(which stripe || echo "")

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if Stripe CLI is installed
check_stripe_cli() {
    echo "1️⃣  CHECKING STRIPE CLI"
    echo "------------------------"
    
    if [ -z "$STRIPE_CLI_INSTALLED" ]; then
        print_error "Stripe CLI not installed"
        echo ""
        echo "Install with: brew install stripe/stripe-cli/stripe"
        echo "Or download from: https://stripe.com/docs/stripe-cli"
        return 1
    else
        print_success "Stripe CLI found at: $STRIPE_CLI_INSTALLED"
        
        # Check if logged in
        if stripe config --list 2>&1 | grep -q "No config"; then
            print_warning "Not logged into Stripe CLI"
            echo "Run: stripe login"
            return 1
        else
            print_success "Stripe CLI configured"
        fi
    fi
    echo ""
}

# Test webhook endpoint
test_webhook_endpoint() {
    echo "2️⃣  TESTING WEBHOOK ENDPOINT"
    echo "-----------------------------"
    
    # Test webhook test endpoint
    print_info "Testing webhook test endpoint..."
    RESPONSE=$(curl -s "${API_URL}/api/webhook/stripe/test")
    
    if echo "$RESPONSE" | grep -q "ready"; then
        print_success "Webhook endpoint is ready"
        echo "Response: $RESPONSE"
    else
        print_error "Webhook endpoint not responding"
        echo "Response: $RESPONSE"
    fi
    echo ""
}

# Start webhook forwarding
start_webhook_forwarding() {
    echo "3️⃣  STARTING WEBHOOK FORWARDING"
    echo "--------------------------------"
    
    if [ -z "$STRIPE_CLI_INSTALLED" ]; then
        print_warning "Skipping - Stripe CLI not installed"
        return
    fi
    
    print_info "Starting webhook forwarding to ${API_URL}/api/webhook/stripe"
    echo ""
    echo "Run this in a separate terminal:"
    echo ""
    echo "  stripe listen --forward-to ${API_URL}/api/webhook/stripe"
    echo ""
    echo "Then copy the webhook signing secret and set it as:"
    echo "  export STRIPE_WEBHOOK_SECRET=whsec_..."
    echo ""
    read -p "Press Enter when webhook forwarding is running..."
    echo ""
}

# Test customer creation
test_customer_creation() {
    echo "4️⃣  TESTING CUSTOMER CREATION"
    echo "------------------------------"
    
    print_info "Creating test customer..."
    
    CUSTOMER_DATA='{
        "patientId": "TEST_001",
        "email": "test@example.com",
        "name": "Test Patient",
        "tenantId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
    }'
    
    RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/payments/customer" \
        -H "Content-Type: application/json" \
        -d "$CUSTOMER_DATA")
    
    if echo "$RESPONSE" | grep -q "customerId"; then
        CUSTOMER_ID=$(echo "$RESPONSE" | grep -oE '"customerId":"[^"]*"' | cut -d'"' -f4)
        print_success "Customer created: $CUSTOMER_ID"
        echo "$CUSTOMER_ID" > /tmp/stripe_test_customer_id
    else
        print_error "Failed to create customer"
        echo "Response: $RESPONSE"
    fi
    echo ""
}

# Test setup intent
test_setup_intent() {
    echo "5️⃣  TESTING SETUP INTENT"
    echo "------------------------"
    
    if [ ! -f /tmp/stripe_test_customer_id ]; then
        print_warning "No customer ID found, skipping"
        return
    fi
    
    CUSTOMER_ID=$(cat /tmp/stripe_test_customer_id)
    print_info "Creating setup intent for customer: $CUSTOMER_ID"
    
    RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/payments/setup-intent" \
        -H "Content-Type: application/json" \
        -d "{\"customerId\": \"$CUSTOMER_ID\"}")
    
    if echo "$RESPONSE" | grep -q "clientSecret"; then
        print_success "Setup intent created"
        CLIENT_SECRET=$(echo "$RESPONSE" | grep -oE '"clientSecret":"[^"]*"' | cut -d'"' -f4)
        echo "Client secret: ${CLIENT_SECRET:0:30}..."
    else
        print_error "Failed to create setup intent"
        echo "Response: $RESPONSE"
    fi
    echo ""
}

# Test payment intent
test_payment_intent() {
    echo "6️⃣  TESTING PAYMENT INTENT"
    echo "--------------------------"
    
    if [ ! -f /tmp/stripe_test_customer_id ]; then
        print_warning "No customer ID found, skipping"
        return
    fi
    
    CUSTOMER_ID=$(cat /tmp/stripe_test_customer_id)
    print_info "Creating payment intent for $29.99"
    
    PAYMENT_DATA="{
        \"customerId\": \"$CUSTOMER_ID\",
        \"amountCents\": 2999,
        \"currency\": \"usd\",
        \"description\": \"Test Payment\",
        \"orderId\": \"ORD_TEST_001\",
        \"tenantId\": \"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11\"
    }"
    
    RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/payments/charge" \
        -H "Content-Type: application/json" \
        -d "$PAYMENT_DATA")
    
    if echo "$RESPONSE" | grep -q "paymentIntentId"; then
        PAYMENT_INTENT_ID=$(echo "$RESPONSE" | grep -oE '"paymentIntentId":"[^"]*"' | cut -d'"' -f4)
        print_success "Payment intent created: $PAYMENT_INTENT_ID"
    else
        print_error "Failed to create payment intent"
        echo "Response: $RESPONSE"
    fi
    echo ""
}

# Test webhook events
test_webhook_events() {
    echo "7️⃣  TESTING WEBHOOK EVENTS"
    echo "--------------------------"
    
    if [ -z "$STRIPE_CLI_INSTALLED" ]; then
        print_warning "Skipping - Stripe CLI not installed"
        return
    fi
    
    print_info "Triggering test webhook events..."
    echo ""
    
    # Trigger various test events
    EVENTS=(
        "payment_intent.succeeded"
        "customer.created"
        "charge.succeeded"
        "invoice.paid"
    )
    
    for EVENT in "${EVENTS[@]}"; do
        print_info "Triggering: $EVENT"
        stripe trigger "$EVENT" 2>&1 | head -3
        sleep 1
    done
    
    echo ""
    
    # Check webhook events in database
    print_info "Checking webhook events in database..."
    RESPONSE=$(curl -s "${API_URL}/api/webhook/stripe/events")
    
    if echo "$RESPONSE" | grep -q "count"; then
        EVENT_COUNT=$(echo "$RESPONSE" | grep -oE '"count":[0-9]+' | cut -d':' -f2)
        print_success "Found $EVENT_COUNT webhook events in database"
    else
        print_warning "Could not fetch webhook events"
    fi
    echo ""
}

# Test ledger entries
test_ledger_entries() {
    echo "8️⃣  TESTING LEDGER ENTRIES"
    echo "--------------------------"
    
    TENANT_ID="a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
    print_info "Fetching ledger entries for default tenant..."
    
    RESPONSE=$(curl -s "${API_URL}/api/v1/payments/ledger/${TENANT_ID}")
    
    if echo "$RESPONSE" | grep -q "entries"; then
        print_success "Ledger entries retrieved"
        echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -20 || echo "$RESPONSE"
    else
        print_warning "No ledger entries found (this is normal if no payments processed)"
    fi
    echo ""
}

# Main execution
main() {
    echo "🔧 Configuration:"
    echo "  API URL: $API_URL"
    echo "  Stripe Mode: ${STRIPE_MODE:-test}"
    echo ""
    
    # Run tests
    check_stripe_cli
    test_webhook_endpoint
    
    if [ -n "$STRIPE_CLI_INSTALLED" ]; then
        start_webhook_forwarding
    fi
    
    test_customer_creation
    test_setup_intent
    test_payment_intent
    
    if [ -n "$STRIPE_CLI_INSTALLED" ]; then
        test_webhook_events
    fi
    
    test_ledger_entries
    
    echo ""
    echo "=================================="
    echo "✅ STRIPE INTEGRATION TEST COMPLETE"
    echo "=================================="
    echo ""
    echo "Next steps:"
    echo "1. Configure STRIPE_WEBHOOK_SECRET in your environment"
    echo "2. Test with real card in Stripe test mode: 4242 4242 4242 4242"
    echo "3. Monitor webhook processing in real-time"
    echo "4. Check ledger entries after successful payments"
    echo ""
    
    # Cleanup
    rm -f /tmp/stripe_test_customer_id
}

# Run main function
main "$@"
