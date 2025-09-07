#!/bin/bash

# Deploy frontend to S3 + CloudFront

set -euo pipefail

echo "🚀 Deploying frontend to S3 + CloudFront..."

# Configuration
BUCKET_NAME="eonmeds-frontend-staging"
REGION="us-east-1"
API_URL="https://qm6dnecfhp.us-east-1.awsapprunner.com"

# Navigate to frontend directory
cd packages/frontend

# Create temporary .env file for build
echo "Creating staging environment configuration..."
cat > .env.production.local << EOF
REACT_APP_API_URL=$API_URL
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_51RPS5NGzKhM7cZeGlOITW4CImzbMEldvaRbrBQV894nLYUjnSM7rNKTpzeYVZJVOhCbNxmOvOjnR7RN60XdAHvJ100Ksh6ziwy
REACT_APP_AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L
REACT_APP_AUTH0_AUDIENCE=https://api.eonmeds.com
REACT_APP_AUTH0_REDIRECT_URI=https://$BUCKET_NAME.s3-website-$REGION.amazonaws.com
REACT_APP_ENV=staging
EOF

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the frontend
echo "Building frontend for production..."
npm run build

# Create S3 bucket
echo "Creating S3 bucket..."
aws s3 mb s3://$BUCKET_NAME --region $REGION 2>/dev/null || echo "Bucket already exists"

# Configure bucket for static website hosting
echo "Configuring static website hosting..."
aws s3 website s3://$BUCKET_NAME \
  --index-document index.html \
  --error-document error.html \
  --region $REGION

# Create bucket policy for public access
echo "Setting bucket policy..."
cat > /tmp/bucket-policy.json << EOF
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

aws s3api put-bucket-policy \
  --bucket $BUCKET_NAME \
  --policy file:///tmp/bucket-policy.json \
  --region $REGION

# Upload build files
echo "Uploading build files to S3..."
# Upload static assets with long cache
aws s3 sync build/ s3://$BUCKET_NAME \
  --region $REGION \
  --delete \
  --cache-control "public, max-age=31536000" \
  --exclude "index.html" \
  --exclude "*.json" \
  --exclude "robots.txt" \
  --exclude "manifest.json"

# Upload index.html and json files with no cache
aws s3 cp build/index.html s3://$BUCKET_NAME/index.html \
  --region $REGION \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

aws s3 cp build/manifest.json s3://$BUCKET_NAME/manifest.json \
  --region $REGION \
  --cache-control "no-cache" \
  --content-type "application/json" 2>/dev/null || true

aws s3 cp build/robots.txt s3://$BUCKET_NAME/robots.txt \
  --region $REGION \
  --cache-control "public, max-age=86400" \
  --content-type "text/plain" 2>/dev/null || true

# Clean up
rm -f .env.production.local
rm -f /tmp/bucket-policy.json

echo ""
echo "✅ Frontend deployed to S3!"
echo ""
echo "🌐 Website URL: http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
echo ""
echo "📝 Next: Creating CloudFront distribution for HTTPS and global CDN..."

# Create CloudFront distribution
echo ""
echo "Creating CloudFront distribution..."
DISTRIBUTION_CONFIG=$(cat << EOF
{
    "CallerReference": "eonmeds-staging-$(date +%s)",
    "Comment": "EONMEDS Staging Frontend",
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-$BUCKET_NAME",
                "DomainName": "$BUCKET_NAME.s3-website-$REGION.amazonaws.com",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only"
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-$BUCKET_NAME",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 2,
            "Items": ["HEAD", "GET"],
            "CachedMethods": {
                "Quantity": 2,
                "Items": ["HEAD", "GET"]
            }
        },
        "Compress": true,
        "MinTTL": 0,
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        }
    },
    "CustomErrorResponses": {
        "Quantity": 1,
        "Items": [
            {
                "ErrorCode": 404,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200",
                "ErrorCachingMinTTL": 0
            }
        ]
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100"
}
EOF
)

echo "$DISTRIBUTION_CONFIG" > /tmp/cloudfront-config.json

DISTRIBUTION_ID=$(aws cloudfront create-distribution \
  --distribution-config file:///tmp/cloudfront-config.json \
  --query 'Distribution.Id' \
  --output text \
  --region $REGION 2>/dev/null || echo "EXISTING")

if [ "$DISTRIBUTION_ID" != "EXISTING" ]; then
  echo "✅ CloudFront distribution created: $DISTRIBUTION_ID"
  
  # Get the CloudFront domain name
  CF_DOMAIN=$(aws cloudfront get-distribution \
    --id $DISTRIBUTION_ID \
    --query 'Distribution.DomainName' \
    --output text \
    --region $REGION)
  
  echo ""
  echo "🎉 Frontend deployment complete!"
  echo ""
  echo "📍 Access your staging frontend at:"
  echo "   S3: http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
  echo "   CloudFront (HTTPS): https://$CF_DOMAIN"
  echo ""
  echo "⏳ CloudFront distribution is deploying. It may take 10-15 minutes to be fully available."
else
  echo "⚠️  CloudFront distribution already exists. Listing distributions..."
  aws cloudfront list-distributions \
    --query "DistributionList.Items[?Comment=='EONMEDS Staging Frontend'].[Id,DomainName,Status]" \
    --output table \
    --region $REGION
fi

rm -f /tmp/cloudfront-config.json

echo ""
echo "📝 To update Auth0 allowed callback URLs, add:"
echo "   - http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
echo "   - https://{CloudFront-Domain}"
