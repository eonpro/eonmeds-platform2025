#!/bin/bash

echo "🔧 Stripe Configuration Setup"
echo "=========================="
echo ""
echo "This script will help you configure Stripe for payment processing."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file first."
    exit 1
fi

# Check current status
if grep -q "STRIPE_SECRET_KEY=sk_" .env; then
    echo "✅ Stripe keys appear to be configured!"
    echo ""
    echo "Current configuration:"
    grep "STRIPE_SECRET_KEY" .env | sed 's/\(sk_test_\).*/\1.../'
    grep "STRIPE_WEBHOOK_SECRET" .env | sed 's/\(whsec_\).*/\1.../'
else
    echo "⚠️  Stripe keys are not configured in .env"
    echo ""
    echo "To add your Stripe keys:"
    echo ""
    echo "1. Open .env file"
    echo "2. Add your keys:"
    echo "   STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE"
    echo "   STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET"
    echo ""
    echo "Or provide them now:"
    echo ""
    
    read -p "Enter your Stripe Secret Key (or press Enter to skip): " secret_key
    
    if [ ! -z "$secret_key" ]; then
        # Update the .env file
        sed -i.bak "s/STRIPE_SECRET_KEY=.*/STRIPE_SECRET_KEY=$secret_key/" .env
        echo "✅ Secret key added!"
        
        read -p "Enter your Stripe Webhook Secret (optional): " webhook_secret
        if [ ! -z "$webhook_secret" ]; then
            sed -i.bak "s/STRIPE_WEBHOOK_SECRET=.*/STRIPE_WEBHOOK_SECRET=$webhook_secret/" .env
            echo "✅ Webhook secret added!"
        fi
        
        echo ""
        echo "✅ Stripe configuration updated!"
        echo ""
        echo "Please restart your backend server to apply changes:"
        echo "npm run dev"
    fi
fi

echo ""
echo "📝 Next steps:"
echo "1. Make sure your frontend also has REACT_APP_STRIPE_PUBLISHABLE_KEY"
echo "2. Add the same keys to Railway for production"
echo "3. Test with card number: 4242 4242 4242 4242" 