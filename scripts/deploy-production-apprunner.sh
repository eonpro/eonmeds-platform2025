#!/bin/bash

# Deploy production App Runner service

set -euo pipefail

echo "🚀 Deploying Production App Runner Service..."
echo ""
echo "⚠️  This will create a PRODUCTION service with higher resources (1 vCPU, 2GB RAM)"
echo ""

# Prompt for confirmation
read -p "Are you sure you want to deploy to PRODUCTION? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

# Tag the current image as production
echo "Tagging Docker image for production..."
docker tag 147997129811.dkr.ecr.us-east-1.amazonaws.com/eonmeds-backend:latest \
  147997129811.dkr.ecr.us-east-1.amazonaws.com/eonmeds-backend:production

# Push production tag
echo "Pushing production tag to ECR..."
docker push 147997129811.dkr.ecr.us-east-1.amazonaws.com/eonmeds-backend:production

# Update the config to use production tag
sed -i.bak 's/:latest/:production/g' apprunner-production-config.json

# Create the production service
echo "Creating production App Runner service..."
RESULT=$(aws apprunner create-service \
  --cli-input-json file://apprunner-production-config.json \
  --region us-east-1 2>&1)

if [[ "$RESULT" == *"ServiceArn"* ]]; then
    SERVICE_ARN=$(echo "$RESULT" | jq -r '.Service.ServiceArn')
    SERVICE_URL=$(echo "$RESULT" | jq -r '.Service.ServiceUrl')
    
    echo "✅ Production service created!"
    echo "ARN: $SERVICE_ARN"
    echo "URL: https://$SERVICE_URL"
    
    # Create monitoring script for production
    cat > scripts/monitor-production-deployment.sh << EOF
#!/bin/bash
set -euo pipefail

SERVICE_ARN="$SERVICE_ARN"
SERVICE_URL="https://$SERVICE_URL"

echo "🚀 Monitoring Production App Runner deployment..."
echo "Service: eonmeds-backend-production"
echo "URL: \$SERVICE_URL"
echo ""

while true; do
    STATUS=\$(aws apprunner describe-service \\
        --service-arn "\$SERVICE_ARN" \\
        --region us-east-1 \\
        --query 'Service.Status' \\
        --output text)
    
    echo "\$(date '+%H:%M:%S') - Status: \$STATUS"
    
    if [ "\$STATUS" == "RUNNING" ]; then
        echo ""
        echo "✅ Production deployment complete!"
        echo ""
        echo "Testing endpoints..."
        curl -s "\$SERVICE_URL/health" | jq . || echo "Health check pending..."
        break
    elif [ "\$STATUS" == "CREATE_FAILED" ]; then
        echo ""
        echo "❌ Production deployment failed!"
        exit 1
    fi
    
    sleep 10
done
EOF
    
    chmod +x scripts/monitor-production-deployment.sh
    
    echo ""
    echo "📝 Next steps:"
    echo "1. Run: ./scripts/monitor-production-deployment.sh"
    echo "2. Update production frontend to use: https://$SERVICE_URL"
    echo "3. Update Stripe production webhook"
    echo "4. Gradually migrate traffic from Railway"
    
else
    echo "❌ Failed to create production service:"
    echo "$RESULT"
    exit 1
fi

# Restore original config
mv apprunner-production-config.json.bak apprunner-production-config.json
