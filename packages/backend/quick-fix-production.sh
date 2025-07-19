#!/bin/bash

# INSTRUCTIONS:
# 1. Get your DATABASE_URL from Railway dashboard > Backend service > Variables tab
# 2. Replace YOUR_DATABASE_URL_HERE with the actual value
# 3. Run: chmod +x quick-fix-production.sh
# 4. Run: ./quick-fix-production.sh

echo "This script will create the missing invoice_payments table in production"
echo ""
echo "STEP 1: Go to Railway dashboard > Backend service > Variables tab"
echo "STEP 2: Copy the DATABASE_URL value"
echo "STEP 3: Run the following command with your DATABASE_URL:"
echo ""
echo "cd packages/backend"
echo "DATABASE_URL='YOUR_DATABASE_URL_HERE' NODE_ENV=production node fix-invoice-payments-table.js"
echo ""
echo "Example:"
echo "DATABASE_URL='postgresql://postgres:password@host.railway.app:5432/railway' NODE_ENV=production node fix-invoice-payments-table.js" 