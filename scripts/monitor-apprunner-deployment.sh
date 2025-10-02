#!/bin/bash

# Monitor App Runner deployment status

set -euo pipefail

SERVICE_ARN="arn:aws:apprunner:us-east-1:147997129811:service/eonmeds-backend-staging/278c25b791094a7a9b11f064746d632f"
SERVICE_URL="https://qm6dnecfhp.us-east-1.awsapprunner.com"

echo "🚀 Monitoring App Runner deployment..."
echo "Service: eonmeds-backend-staging"
echo "URL: $SERVICE_URL"
echo ""

# Monitor deployment status
while true; do
    STATUS=$(aws apprunner describe-service \
        --service-arn "$SERVICE_ARN" \
        --region us-east-1 \
        --query 'Service.Status' \
        --output text)
    
    echo "$(date '+%H:%M:%S') - Status: $STATUS"
    
    if [ "$STATUS" == "RUNNING" ]; then
        echo ""
        echo "✅ Deployment complete! Service is running."
        break
    elif [ "$STATUS" == "CREATE_FAILED" ] || [ "$STATUS" == "DELETE_FAILED" ]; then
        echo ""
        echo "❌ Deployment failed!"
        aws apprunner describe-service \
            --service-arn "$SERVICE_ARN" \
            --region us-east-1 \
            --query 'Service.Status' \
            --output json
        exit 1
    fi
    
    sleep 10
done

echo ""
echo "🧪 Testing service endpoints..."

# Test health endpoint
echo -n "Testing /health endpoint... "
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health" || echo "000")
if [ "$HEALTH_STATUS" == "200" ]; then
    echo "✅ OK ($HEALTH_STATUS)"
else
    echo "❌ Failed ($HEALTH_STATUS)"
fi

# Test version endpoint
echo -n "Testing /version endpoint... "
VERSION_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/version" || echo "000")
if [ "$VERSION_STATUS" == "200" ]; then
    echo "✅ OK ($VERSION_STATUS)"
    curl -s "$SERVICE_URL/version" | jq . || curl -s "$SERVICE_URL/version"
else
    echo "❌ Failed ($VERSION_STATUS)"
fi

# Test Stripe webhook endpoint
echo -n "Testing /api/v1/payments/webhook/stripe... "
WEBHOOK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$SERVICE_URL/api/v1/payments/webhook/stripe" || echo "000")
if [ "$WEBHOOK_STATUS" == "400" ]; then
    echo "✅ OK (400 - webhook expects Stripe signature)"
elif [ "$WEBHOOK_STATUS" == "401" ]; then
    echo "❌ Failed (401 - JWT middleware blocking webhook)"
else
    echo "⚠️  Status: $WEBHOOK_STATUS"
fi

echo ""
echo "📊 Service Details:"
aws apprunner describe-service \
    --service-arn "$SERVICE_ARN" \
    --region us-east-1 \
    --query 'Service.[ServiceUrl,Status,HealthCheckConfiguration]' \
    --output table

echo ""
echo "🌐 Your staging backend is available at:"
echo "   $SERVICE_URL"
echo ""
echo "📝 Update your frontend to use this URL for API calls."
