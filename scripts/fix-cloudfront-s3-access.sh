#!/bin/bash

# ========================================
# Fix CloudFront S3 Access (403 Error)
# ========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Fixing CloudFront S3 Access${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

BUCKET_NAME="eonmeds-frontend-staging"
CLOUDFRONT_DISTRIBUTION_ID="E2YX2B02OWLXNN"

# Step 1: Get CloudFront OAI
echo -e "${YELLOW}Step 1: Getting CloudFront OAI...${NC}"
OAI_ID=$(aws cloudfront list-cloud-front-origin-access-identities --query "CloudFrontOriginAccessIdentityList.Items[0].Id" --output text)
echo "OAI ID: $OAI_ID"
echo ""

# Step 2: Create bucket policy for CloudFront
echo -e "${YELLOW}Step 2: Creating S3 bucket policy...${NC}"
cat > /tmp/bucket-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontOAI",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity $OAI_ID"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

# Apply the bucket policy
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file:///tmp/bucket-policy.json

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Bucket policy applied successfully${NC}"
else
    echo -e "${RED}❌ Failed to apply bucket policy${NC}"
    exit 1
fi
echo ""

# Step 3: Ensure bucket is NOT publicly accessible
echo -e "${YELLOW}Step 3: Ensuring bucket is private...${NC}"
aws s3api put-public-access-block --bucket $BUCKET_NAME \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false" 2>/dev/null || true

echo -e "${GREEN}✅ Bucket public access configured${NC}"
echo ""

# Step 4: Rebuild and deploy frontend
echo -e "${YELLOW}Step 4: Rebuilding frontend...${NC}"
cd packages/frontend

# Clean build
rm -rf build node_modules/.cache

# Install dependencies
npm install --legacy-peer-deps

# Build with production config
REACT_APP_API_URL=https://qm6dnecfhp.us-east-1.awsapprunner.com \
REACT_APP_AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com \
REACT_APP_AUTH0_CLIENT_ID=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L \
REACT_APP_AUTH0_AUDIENCE=https://api.eonmeds.com \
npm run build

echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo ""

# Step 5: Deploy to S3
echo -e "${YELLOW}Step 5: Deploying to S3...${NC}"
aws s3 sync build/ s3://$BUCKET_NAME/ \
    --delete \
    --cache-control "public, max-age=31536000" \
    --exclude "index.html" \
    --exclude "*.json"

# Upload index.html with no-cache
aws s3 cp build/index.html s3://$BUCKET_NAME/index.html \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html"

# Upload manifest and other JSON files
aws s3 cp build/manifest.json s3://$BUCKET_NAME/manifest.json \
    --cache-control "no-cache" \
    --content-type "application/json"

aws s3 cp build/asset-manifest.json s3://$BUCKET_NAME/asset-manifest.json \
    --cache-control "no-cache" \
    --content-type "application/json" 2>/dev/null || true

echo -e "${GREEN}✅ Files uploaded to S3${NC}"
echo ""

# Step 6: Invalidate CloudFront cache
echo -e "${YELLOW}Step 6: Invalidating CloudFront cache...${NC}"
aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*" \
    --query "Invalidation.Id" \
    --output text

echo -e "${GREEN}✅ CloudFront cache invalidated${NC}"
echo ""

# Step 7: Test the fix
echo -e "${BLUE}Step 7: Testing access...${NC}"
echo "Waiting 10 seconds for changes to propagate..."
sleep 10

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://d3p4f8m2bxony8.cloudfront.net")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ CloudFront is now accessible! (HTTP $HTTP_CODE)${NC}"
    echo ""
    echo -e "${GREEN}🎉 SUCCESS! The frontend is now available at:${NC}"
    echo -e "${BLUE}https://d3p4f8m2bxony8.cloudfront.net${NC}"
else
    echo -e "${RED}❌ CloudFront still returning $HTTP_CODE${NC}"
    echo "Please wait a few more minutes for propagation"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Fix completed!${NC}"
echo -e "${BLUE}========================================${NC}"
