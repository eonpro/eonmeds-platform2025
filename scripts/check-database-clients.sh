#!/bin/bash
set -euo pipefail

echo "🔍 CHECKING DATABASE FOR CLIENTS AND WEBHOOK EVENTS"
echo "===================================================="
echo ""

# Database configuration from your project
DB_HOST="eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="eonmeds"
DB_USER="eonmeds_admin"
DB_PASS="398Xakf\$57"

# Export for psql
export PGPASSWORD="$DB_PASS"

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

echo "📊 Step 1: Checking patients table"
echo "----------------------------------"

# Count patients
PATIENT_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM patients;" 2>/dev/null || echo "0")
PATIENT_COUNT=$(echo $PATIENT_COUNT | tr -d ' ')

if [ "$PATIENT_COUNT" -gt 0 ]; then
    print_status "Found $PATIENT_COUNT patients in database"
    
    # Show recent patients
    echo ""
    echo "Recent patients (last 5):"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
    "SELECT patient_id, email, first_name, last_name, created_at 
     FROM patients 
     ORDER BY created_at DESC 
     LIMIT 5;" 2>/dev/null || echo "Could not fetch patient details"
else
    print_warning "No patients found in database"
fi

echo ""
echo "📨 Step 2: Checking webhook_events table"
echo "----------------------------------------"

# Check if webhook_events table exists
TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'webhook_events'
    );" 2>/dev/null || echo "f")

if [[ "$TABLE_EXISTS" == *"t"* ]]; then
    # Count webhook events
    WEBHOOK_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM webhook_events;" 2>/dev/null || echo "0")
    WEBHOOK_COUNT=$(echo $WEBHOOK_COUNT | tr -d ' ')
    
    if [ "$WEBHOOK_COUNT" -gt 0 ]; then
        print_status "Found $WEBHOOK_COUNT webhook events"
        
        # Show recent webhooks
        echo ""
        echo "Recent webhook events (last 5):"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
        "SELECT id, source, event_type, processed, created_at 
         FROM webhook_events 
         ORDER BY created_at DESC 
         LIMIT 5;" 2>/dev/null || echo "Could not fetch webhook details"
         
        # Count HeyFlow specific events
        HEYFLOW_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
            "SELECT COUNT(*) FROM webhook_events WHERE source = 'heyflow';" 2>/dev/null || echo "0")
        HEYFLOW_COUNT=$(echo $HEYFLOW_COUNT | tr -d ' ')
        
        if [ "$HEYFLOW_COUNT" -gt 0 ]; then
            print_info "Found $HEYFLOW_COUNT HeyFlow webhook events"
        else
            print_warning "No HeyFlow webhook events found"
        fi
    else
        print_warning "No webhook events found"
    fi
else
    print_warning "webhook_events table does not exist"
    echo ""
    echo "Creating webhook_events table..."
    
    # Create the table
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL,
    event_type VARCHAR(100),
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_source ON webhook_events(source);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at);
EOF

    if [ $? -eq 0 ]; then
        print_status "webhook_events table created successfully"
    else
        print_error "Failed to create webhook_events table"
    fi
fi

echo ""
echo "🔍 Step 3: Checking for test submissions"
echo "----------------------------------------"

# Check for test patient emails
TEST_PATIENTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM patients WHERE email LIKE '%test%' OR email LIKE '%example%';" 2>/dev/null || echo "0")
TEST_PATIENTS=$(echo $TEST_PATIENTS | tr -d ' ')

if [ "$TEST_PATIENTS" -gt 0 ]; then
    print_info "Found $TEST_PATIENTS test patients"
else
    print_info "No test patients found"
fi

echo ""
echo "📋 SUMMARY"
echo "=========="
echo ""
echo "Database Status:"
echo "  - Total Patients: $PATIENT_COUNT"
echo "  - Total Webhook Events: ${WEBHOOK_COUNT:-0}"
echo "  - HeyFlow Events: ${HEYFLOW_COUNT:-0}"
echo "  - Test Patients: $TEST_PATIENTS"
echo ""

if [ "$PATIENT_COUNT" -eq 0 ]; then
    print_warning "No clients in database - Possible reasons:"
    echo "  1. HeyFlow webhook URL not updated to new AWS endpoint"
    echo "  2. No form submissions have been made yet"
    echo "  3. Webhook processing errors"
    echo ""
    print_info "Action Required:"
    echo "  1. Log in to HeyFlow: https://app.heyflow.app"
    echo "  2. Update webhook URL to:"
    echo "     https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/webhooks/general/heyflow"
    echo "  3. Submit a test form to verify"
fi

# Clean up
unset PGPASSWORD

print_status "Database check complete!"
