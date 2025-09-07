#!/bin/bash
set -euo pipefail

echo "🚀 DEPLOYING BACKEND WITH CORS FIX"
echo "==================================="
echo ""

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="148534177795"
ECR_REPO="eonmeds-backend"
IMAGE_TAG="cors-fix-$(date +%Y%m%d-%H%M%S)"
SERVICE_ARN="arn:aws:apprunner:us-east-1:148534177795:service/eonmeds-api-staging/b79bb7e959e84c7c8e7b3bd3c5e67a6f"

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

echo "📋 CORS Fix Summary:"
echo "-------------------"
print_info "Added CloudFront URL: https://d3p4f8m2bxony8.cloudfront.net"
print_info "Added S3 URL: http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com"
echo ""

# Navigate to backend directory
cd packages/backend

echo "🔨 Step 1: Building Docker image"
echo "--------------------------------"

# Build Docker image
docker build -t ${ECR_REPO}:${IMAGE_TAG} . || {
    print_error "Docker build failed"
    print_warning "Make sure Docker Desktop is running"
    exit 1
}

print_status "Docker image built successfully"
echo ""

echo "🔐 Step 2: Logging into AWS ECR"
echo "-------------------------------"

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | \
    docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com || {
    print_error "ECR login failed"
    print_warning "Check your AWS credentials"
    exit 1
}

print_status "Logged into ECR"
echo ""

echo "📤 Step 3: Pushing image to ECR"
echo "-------------------------------"

# Tag image for ECR
docker tag ${ECR_REPO}:${IMAGE_TAG} \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${IMAGE_TAG}

docker tag ${ECR_REPO}:${IMAGE_TAG} \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:staging

# Push to ECR
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${IMAGE_TAG} || {
    print_error "Failed to push image to ECR"
    exit 1
}

docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:staging || {
    print_error "Failed to push staging tag to ECR"
    exit 1
}

print_status "Image pushed to ECR"
echo "  - Tag: ${IMAGE_TAG}"
echo "  - Repository: ${ECR_REPO}"
echo ""

echo "🚀 Step 4: Deploying to App Runner"
echo "----------------------------------"

# Deploy to App Runner
echo "Attempting to deploy new image to App Runner..."

# Try to start deployment (this might fail due to permissions)
aws apprunner start-deployment \
    --service-arn "${SERVICE_ARN}" \
    --region ${AWS_REGION} 2>/dev/null && {
    print_status "Deployment started!"
    echo ""
    echo "⏳ Deployment will take 3-5 minutes to complete"
    echo ""
} || {
    print_warning "Could not start deployment automatically (permission denied)"
    echo ""
    print_info "MANUAL STEP REQUIRED:"
    echo "1. Go to AWS App Runner Console: https://console.aws.amazon.com/apprunner"
    echo "2. Select service: eonmeds-api-staging"
    echo "3. Click 'Deploy' to deploy the new image"
    echo ""
    print_info "The new image with CORS fix is ready in ECR:"
    echo "   ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:staging"
}

# Return to project root
cd ../..

echo ""
echo "✅ BACKEND CORS FIX READY!"
echo "=========================="
echo ""
print_status "What was fixed:"
echo "  • Added CloudFront URL to CORS allowed origins"
echo "  • Added S3 URL to CORS allowed origins"
echo "  • Backend code updated in packages/backend/src/index.ts"
echo ""

if command -v aws >/dev/null 2>&1; then
    # Try to get service URL
    SERVICE_URL=$(aws apprunner describe-service \
        --service-arn "${SERVICE_ARN}" \
        --region ${AWS_REGION} \
        --query 'Service.ServiceUrl' \
        --output text 2>/dev/null) || SERVICE_URL="qm6dnecfhp.us-east-1.awsapprunner.com"
else
    SERVICE_URL="qm6dnecfhp.us-east-1.awsapprunner.com"
fi

echo "🧪 Testing CORS (after deployment completes):"
echo "---------------------------------------------"
echo ""
echo "Test command:"
cat << EOF
curl -H "Origin: https://d3p4f8m2bxony8.cloudfront.net" \\
     -H "Accept: application/json" \\
     -I https://${SERVICE_URL}/api/v1/patients
EOF
echo ""

print_info "Next Steps:"
echo "1. Wait for deployment to complete (3-5 minutes)"
echo "2. Refresh your browser at: https://d3p4f8m2bxony8.cloudfront.net/clients"
echo "3. Clients should now appear!"
echo ""

print_status "CORS fix deployed! 🎉"
