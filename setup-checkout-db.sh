#!/bin/bash

echo "🛒 Setting up Checkout Database Tables"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}DATABASE_URL not set in environment${NC}"
    echo "Loading from .env file..."
    
    if [ -f ".env" ]; then
        export $(cat .env | grep DATABASE_URL | xargs)
    elif [ -f "packages/backend/.env" ]; then
        export $(cat packages/backend/.env | grep DATABASE_URL | xargs)
    else
        echo -e "${RED}No .env file found and DATABASE_URL not set${NC}"
        echo "Please set DATABASE_URL environment variable"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Database URL configured${NC}"

# Run the schema file
echo -e "\n${YELLOW}Creating orders tables...${NC}"

psql "$DATABASE_URL" < packages/backend/src/config/checkout-schema.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Checkout tables created successfully${NC}"
else
    echo -e "${RED}✗ Error creating tables${NC}"
    exit 1
fi

# Verify tables were created
echo -e "\n${YELLOW}Verifying tables...${NC}"

TABLES_CHECK=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('orders', 'order_items', 'payment_transactions');")

if [ "$TABLES_CHECK" -ge 3 ]; then
    echo -e "${GREEN}✓ All tables verified${NC}"
    
    # Show table structure
    echo -e "\n${YELLOW}Table structure:${NC}"
    psql "$DATABASE_URL" -c "\d orders" | head -20
else
    echo -e "${RED}✗ Some tables may not have been created${NC}"
fi

echo -e "\n${GREEN}======================================"
echo "✅ Checkout database setup complete!"
echo "======================================${NC}"
echo ""
echo "Next steps:"
echo "1. Test the checkout at http://localhost:3001/checkout"
echo "2. Configure Stripe keys in .env"
echo "3. Deploy to production"
