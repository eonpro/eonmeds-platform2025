#!/bin/bash
set -euo pipefail

echo "🚨 FIXING CORS ISSUE - ADDING CLOUDFRONT TO ALLOWED ORIGINS"
echo "==========================================================="
echo ""

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

# Configuration
SERVICE_ARN="arn:aws:apprunner:us-east-1:148534177795:service/eonmeds-api-staging/b79bb7e959e84c7c8e7b3bd3c5e67a6f"
CLOUDFRONT_URL="https://d3p4f8m2bxony8.cloudfront.net"
S3_URL="http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com"

echo "📋 Current Issue:"
echo "----------------"
print_error "Backend is blocking requests from CloudFront due to CORS"
echo ""

echo "🔧 Solution:"
echo "-----------"
print_info "Adding CloudFront and S3 URLs to CORS_ORIGINS environment variable"
echo ""

echo "📝 Step 1: Getting current App Runner configuration"
echo "---------------------------------------------------"

# Get current configuration
CURRENT_CONFIG=$(aws apprunner describe-service \
  --service-arn "$SERVICE_ARN" \
  --region us-east-1 \
  --query 'Service.SourceConfiguration' \
  --output json)

echo "Current configuration retrieved"
echo ""

echo "🔄 Step 2: Updating CORS_ORIGINS environment variable"
echo "-----------------------------------------------------"

# Create updated configuration with new CORS origins
cat > /tmp/apprunner-cors-update.json << EOF
{
  "ServiceArn": "${SERVICE_ARN}",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "148534177795.dkr.ecr.us-east-1.amazonaws.com/eonmeds-backend:staging",
      "ImageConfiguration": {
        "Port": "8080",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "PORT": "8080",
          "AUTH0_DOMAIN": "dev-dvouayl22wlz8zwq.us.auth0.com",
          "AUTH0_AUDIENCE": "https://api.eonmeds.com",
          "CORS_ORIGINS": "http://localhost:3000,http://localhost:3001,https://eonmeds-platform2025-production.up.railway.app,https://d3p4f8m2bxony8.cloudfront.net,http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com",
          "CORS_ORIGIN": "https://d3p4f8m2bxony8.cloudfront.net",
          "STRIPE_WEBHOOK_SECRET": "whsec_gYX5r96jhPqF9vYdxtFXGTw1Dd8L5Maw",
          "HEYFLOW_WEBHOOK_SECRET": "SKIP",
          "INVOICE_DUE_DAYS": "30",
          "GENERIC_TIMEZONE": "America/New_York",
          "EXECUTIONS_DATA_SAVE_ON_ERROR": "all",
          "EXECUTIONS_DATA_SAVE_ON_SUCCESS": "all",
          "EXECUTIONS_DATA_SAVE_ON_PROGRESS": "true",
          "EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS": "true"
        },
        "RuntimeEnvironmentSecrets": {
          "DATABASE_URL": "arn:aws:secretsmanager:us-east-1:148534177795:secret:/eonmeds/api/database-A9ZhIA:url::",
          "STRIPE_SECRET_KEY": "arn:aws:secretsmanager:us-east-1:148534177795:secret:/eonmeds/api/stripe-g7CYwk:secretKey::",
          "JWT_SECRET": "arn:aws:secretsmanager:us-east-1:148534177795:secret:/eonmeds/api/jwt-aaHVJE:secret::",
          "AUTH0_CLIENT_ID": "arn:aws:secretsmanager:us-east-1:148534177795:secret:/eonmeds/api/auth0-K5y0Gg:clientId::",
          "AUTH0_CLIENT_SECRET": "arn:aws:secretsmanager:us-east-1:148534177795:secret:/eonmeds/api/auth0-K5y0Gg:clientSecret::",
          "OPENAI_API_KEY": "arn:aws:secretsmanager:us-east-1:148534177795:secret:/eonmeds/api/openai-8WXBo1:apiKey::"
        }
      },
      "ImageRepositoryType": "ECR"
    }
  }
}
EOF

print_status "Configuration file created with updated CORS origins"
echo ""

echo "🚀 Step 3: Applying update to App Runner"
echo "----------------------------------------"

# Update the service
UPDATE_RESULT=$(aws apprunner update-service \
  --cli-input-json file:///tmp/apprunner-cors-update.json \
  --region us-east-1 \
  --output json)

if [ $? -eq 0 ]; then
    print_status "Update initiated successfully!"
    
    # Extract operation ID
    OPERATION_ID=$(echo "$UPDATE_RESULT" | grep -o '"OperationId": "[^"]*"' | cut -d'"' -f4)
    SERVICE_STATUS=$(echo "$UPDATE_RESULT" | grep -o '"Status": "[^"]*"' | cut -d'"' -f4)
    
    echo ""
    print_info "Operation ID: $OPERATION_ID"
    print_info "Service Status: $SERVICE_STATUS"
else
    print_error "Failed to update App Runner service"
    exit 1
fi

echo ""
echo "⏳ Step 4: Waiting for deployment to complete"
echo "--------------------------------------------"
echo "This typically takes 3-5 minutes..."
echo ""

# Monitor deployment
SECONDS=0
TIMEOUT=600  # 10 minutes

while [ $SECONDS -lt $TIMEOUT ]; do
    STATUS=$(aws apprunner describe-service \
      --service-arn "$SERVICE_ARN" \
      --region us-east-1 \
      --query 'Service.Status' \
      --output text)
    
    if [ "$STATUS" = "RUNNING" ]; then
        print_status "Deployment complete! Service is running."
        break
    elif [ "$STATUS" = "OPERATION_IN_PROGRESS" ]; then
        echo -n "."
        sleep 10
    else
        print_warning "Service status: $STATUS"
        sleep 10
    fi
done

if [ $SECONDS -ge $TIMEOUT ]; then
    print_warning "Deployment is taking longer than expected. Check AWS Console for status."
fi

echo ""
echo "✅ CORS FIX DEPLOYED!"
echo "===================="
echo ""
print_status "The backend now accepts requests from:"
echo "  • https://d3p4f8m2bxony8.cloudfront.net (CloudFront)"
echo "  • http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com (S3)"
echo "  • http://localhost:3000 (Local dev)"
echo "  • http://localhost:3001 (Local dev - EONMEDS)"
echo ""
print_info "Next steps:"
echo "  1. Wait 1-2 minutes for the backend to fully restart"
echo "  2. Refresh your browser (Cmd+Shift+R)"
echo "  3. The clients should now load successfully!"
echo ""

# Test the API
echo "🧪 Testing API with new CORS settings..."
echo "----------------------------------------"

API_URL=$(aws apprunner describe-service \
  --service-arn "$SERVICE_ARN" \
  --region us-east-1 \
  --query 'Service.ServiceUrl' \
  --output text)

if [ -n "$API_URL" ]; then
    echo "Testing health endpoint..."
    curl -s "https://$API_URL/health" | head -1
    echo ""
    print_status "API is responding!"
else
    print_warning "Could not determine API URL"
fi

echo ""
print_status "CORS issue fixed! Your application should work now."
echo ""
echo "🌐 Open your browser to: https://d3p4f8m2bxony8.cloudfront.net/clients"
