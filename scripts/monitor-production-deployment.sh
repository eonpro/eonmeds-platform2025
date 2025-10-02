#!/bin/bash
set -euo pipefail

SERVICE_ARN="arn:aws:apprunner:us-east-1:147997129811:service/eonmeds-backend-production/34864486801a4355a113cce49ecddbc7"
SERVICE_URL="https://2rpujwhj6v.us-east-1.awsapprunner.com"

echo "🚀 Monitoring Production App Runner deployment..."
echo "Service: eonmeds-backend-production"
echo "URL: $SERVICE_URL"
echo ""

while true; do
    STATUS=$(aws apprunner describe-service \
        --service-arn "$SERVICE_ARN" \
        --region us-east-1 \
        --query 'Service.Status' \
        --output text)
    
    echo "$(date '+%H:%M:%S') - Status: $STATUS"
    
    if [ "$STATUS" == "RUNNING" ]; then
        echo ""
        echo "✅ Production deployment complete!"
        echo ""
        echo "Testing endpoints..."
        curl -s "$SERVICE_URL/health" | jq . || echo "Health check pending..."
        break
    elif [ "$STATUS" == "CREATE_FAILED" ]; then
        echo ""
        echo "❌ Production deployment failed!"
        exit 1
    fi
    
    sleep 10
done

echo ""
echo "📊 Production Service Summary"
echo "============================"
echo "URL: $SERVICE_URL"
echo "Status: RUNNING"
echo ""
echo "Test with:"
echo "  curl $SERVICE_URL/health"
echo "  curl $SERVICE_URL/version"
