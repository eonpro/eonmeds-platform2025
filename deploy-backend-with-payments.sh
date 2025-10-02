#!/bin/bash

# Deploy Backend with Payment Routes to App Runner

echo "════════════════════════════════════════════════════════════════"
echo "       DEPLOYING BACKEND WITH PAYMENT ROUTES"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Configuration
ECR_REGISTRY="147997129811.dkr.ecr.us-east-1.amazonaws.com"
ECR_REPOSITORY="eonmeds-backend"
IMAGE_TAG="payment-system-$(date +%Y%m%d-%H%M%S)"
AWS_REGION="us-east-1"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Step 1: Building Docker image with payment routes...${NC}"
cd packages/backend

# Build the image
docker build -t $ECR_REPOSITORY:$IMAGE_TAG . \
  --build-arg NODE_ENV=production \
  --platform linux/amd64

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully${NC}"
else
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Logging into AWS ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Logged into ECR${NC}"
else
    echo -e "${RED}❌ ECR login failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 3: Tagging image...${NC}"
docker tag $ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
docker tag $ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest

echo -e "${GREEN}✅ Image tagged${NC}"

echo ""
echo -e "${BLUE}Step 4: Pushing to ECR...${NC}"
docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Image pushed to ECR${NC}"
else
    echo -e "${RED}❌ Push failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 5: Triggering App Runner deployment...${NC}"
echo -e "${YELLOW}Note: App Runner auto-deploys when new image is pushed${NC}"

# Get service ARN
SERVICE_ARN=$(aws apprunner list-services --region $AWS_REGION --query "ServiceSummaryList[?ServiceName=='eonmeds-backend-staging'].ServiceArn" --output text)

if [ ! -z "$SERVICE_ARN" ]; then
    echo -e "${GREEN}✅ Found App Runner service${NC}"
    echo "   Service: $SERVICE_ARN"
    
    # Check deployment status
    echo ""
    echo -e "${BLUE}Checking deployment status...${NC}"
    aws apprunner describe-service --service-arn $SERVICE_ARN --region $AWS_REGION \
        --query "Service.Status" --output text
else
    echo -e "${YELLOW}⚠️  Could not find service - check AWS Console${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo -e "${GREEN}DEPLOYMENT INITIATED!${NC}"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Wait 5-10 minutes for deployment to complete"
echo "2. Check AWS App Runner console for status"
echo "3. Run: curl https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/public/invoice/TEST"
echo "4. When you see invoice data (not 404), the payment system is LIVE!"
echo ""
echo -e "${BLUE}Your payment routes are being deployed!${NC}"

cd ../..
