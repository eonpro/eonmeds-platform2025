#!/bin/bash

# Complete the frontend deployment after fixing public access

set -euo pipefail

echo "📦 Completing frontend deployment..."

BUCKET_NAME="eonmeds-frontend-staging"
REGION="us-east-1"

# Apply bucket policy
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

# The build is already done, so just sync the files
cd packages/frontend

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
rm -f /tmp/bucket-policy.json

echo ""
echo "✅ Frontend deployed to S3!"
echo ""
echo "🌐 Website URL: http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
echo ""

# Create CloudFront distribution
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
  --region $REGION)

# Get the CloudFront domain name
CF_DOMAIN=$(aws cloudfront get-distribution \
  --id $DISTRIBUTION_ID \
  --query 'Distribution.DomainName' \
  --output text \
  --region $REGION)

echo "✅ CloudFront distribution created: $DISTRIBUTION_ID"

rm -f /tmp/cloudfront-config.json

echo ""
echo "🎉 Frontend deployment complete!"
echo ""
echo "📍 Access your staging frontend at:"
echo "   S3: http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
echo "   CloudFront (HTTPS): https://$CF_DOMAIN"
echo ""
echo "⏳ CloudFront distribution is deploying. It may take 10-15 minutes to be fully available."
echo ""
echo "📝 Next steps:"
echo "1. Update Auth0 allowed callback URLs with these domains"
echo "2. Test the application"
echo "3. Update Stripe webhook URLs"
