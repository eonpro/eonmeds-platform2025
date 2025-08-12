#!/bin/bash

# Simple test commands for external payment mirroring
# Run these commands one by one to test the functionality

echo "External Payment Mirroring Test Commands"
echo "======================================="
echo ""
echo "# 1) Create a customer with email"
echo "stripe customers create --email test+mirror@example.com"
echo ""
echo "# Copy the customer ID (cus_xxx) from the output above"
echo ""
echo "# 2) Create and confirm a PaymentIntent (no invoice)"
echo "stripe payment_intents create \\"
echo "  --amount 1200 \\"
echo "  --currency usd \\"
echo "  --customer <cus_xxx> \\"
echo "  --confirm \\"
echo "  --payment-method pm_card_visa"
echo ""
echo "# Alternative: Use Dashboard → Payments → Create payment"
echo ""
echo "# 3) Check the database for mirrored invoice"
echo "psql \$DATABASE_URL -c \"SELECT * FROM external_payment_mirrors ORDER BY created_at DESC LIMIT 1;\""
echo ""
echo "# 4) Verify the created invoice in Stripe"
echo "# Get the invoice ID from step 3, then:"
echo "stripe invoices retrieve <in_xxx> | jq '.metadata'"
