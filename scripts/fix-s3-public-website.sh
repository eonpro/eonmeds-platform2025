#!/bin/bash

# ========================================
# Fix S3 Public Website Access for CloudFront
# ========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Fixing S3 Public Website Access${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

BUCKET_NAME="eonmeds-frontend-staging"
CLOUDFRONT_DISTRIBUTION_ID="EZBKJZ75WFBQ9"

# Step 1: Enable S3 static website hosting
echo -e "${YELLOW}Step 1: Enabling S3 static website hosting...${NC}"
aws s3 website s3://$BUCKET_NAME \
    --index-document index.html \
    --error-document error.html

echo -e "${GREEN}✅ Static website hosting enabled${NC}"
echo ""

# Step 2: Create public read bucket policy
echo -e "${YELLOW}Step 2: Creating public read bucket policy...${NC}"
cat > /tmp/public-bucket-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

# Apply the bucket policy
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file:///tmp/public-bucket-policy.json

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Public bucket policy applied${NC}"
else
    echo -e "${RED}❌ Failed to apply bucket policy${NC}"
    exit 1
fi
echo ""

# Step 3: Remove public access block (to allow public policy)
echo -e "${YELLOW}Step 3: Configuring public access settings...${NC}"
aws s3api delete-public-access-block --bucket $BUCKET_NAME 2>/dev/null || true

echo -e "${GREEN}✅ Public access block removed${NC}"
echo ""

# Step 4: Rebuild and deploy frontend
echo -e "${YELLOW}Step 4: Building frontend...${NC}"
cd packages/frontend

# Check if build exists and is recent (within last hour)
if [ -d "build" ] && [ $(find build -maxdepth 0 -mmin -60 | wc -l) -gt 0 ]; then
    echo "Using existing recent build..."
else
    echo "Creating fresh build..."
    rm -rf build node_modules/.cache
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        npm install --legacy-peer-deps
    fi
    
    # Build with production config
    REACT_APP_API_URL=https://qm6dnecfhp.us-east-1.awsapprunner.com \
    REACT_APP_AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com \
    REACT_APP_AUTH0_CLIENT_ID=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L \
    REACT_APP_AUTH0_AUDIENCE=https://api.eonmeds.com \
    npm run build
fi

echo -e "${GREEN}✅ Frontend ready${NC}"
echo ""

# Step 5: Deploy to S3
echo -e "${YELLOW}Step 5: Deploying to S3...${NC}"

# Set proper content types
aws s3 sync build/ s3://$BUCKET_NAME/ \
    --delete \
    --exclude "*.html" \
    --exclude "*.json" \
    --cache-control "public, max-age=31536000"

# Upload HTML files with no-cache
find build -name "*.html" -exec aws s3 cp {} s3://$BUCKET_NAME/{} \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html" \;

# Upload JSON files
find build -name "*.json" -exec aws s3 cp {} s3://$BUCKET_NAME/{} \
    --cache-control "no-cache" \
    --content-type "application/json" \;

# Fix the root index.html specifically
aws s3 cp build/index.html s3://$BUCKET_NAME/index.html \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html"

echo -e "${GREEN}✅ Files deployed to S3${NC}"
echo ""

# Step 6: Invalidate CloudFront cache
echo -e "${YELLOW}Step 6: Invalidating CloudFront cache...${NC}"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*" \
    --query "Invalidation.Id" \
    --output text)

echo "Invalidation ID: $INVALIDATION_ID"
echo -e "${GREEN}✅ CloudFront cache invalidated${NC}"
echo ""

# Step 7: Test access
echo -e "${BLUE}Step 7: Testing access...${NC}"
echo "Waiting 15 seconds for changes to propagate..."
sleep 15

# Test S3 website endpoint
echo -n "Testing S3 website endpoint... "
S3_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com")
if [ "$S3_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Accessible (HTTP $S3_CODE)${NC}"
else
    echo -e "${RED}❌ Not accessible (HTTP $S3_CODE)${NC}"
fi

# Test CloudFront
echo -n "Testing CloudFront endpoint... "
CF_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://d3p4f8m2bxony8.cloudfront.net")
if [ "$CF_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Accessible (HTTP $CF_CODE)${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP $CF_CODE (may need more time)${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Configuration Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Frontend URLs:"
echo -e "${BLUE}CloudFront: https://d3p4f8m2bxony8.cloudfront.net${NC}"
echo -e "${BLUE}S3 Website: http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com${NC}"
echo ""
echo "If CloudFront still shows 403, wait 5-10 minutes for full propagation."
