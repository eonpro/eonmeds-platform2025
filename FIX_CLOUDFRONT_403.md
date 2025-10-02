# 🔧 Fix CloudFront 403 Error - Private S3 Bucket Access

## Problem
CloudFront is returning 403 because:
1. S3 bucket is private (good for security!)
2. No bucket policy exists
3. CloudFront has no Origin Access Identity (OAI) configured

## Solution: Configure CloudFront OAI

### Option 1: Quick Fix - Add Bucket Policy for CloudFront

```bash
# Create a bucket policy that allows CloudFront to read
cat > /tmp/cloudfront-bucket-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontAccess",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::eonmeds-frontend-staging/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/EZBKJZ75WFBQ9"
                }
            }
        }
    ]
}
EOF

# Get your AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Update the policy with your account ID
sed -i '' "s/YOUR_ACCOUNT_ID/$AWS_ACCOUNT_ID/g" /tmp/cloudfront-bucket-policy.json

# Apply the policy
aws s3api put-bucket-policy \
  --bucket eonmeds-frontend-staging \
  --policy file:///tmp/cloudfront-bucket-policy.json \
  --region us-east-1
```

### Option 2: Proper Solution - Create OAI (Recommended)

```bash
# Step 1: Create Origin Access Identity
OAI_ID=$(aws cloudfront create-cloud-front-origin-access-identity \
  --cloud-front-origin-access-identity-config \
  CallerReference="eonmeds-oai-$(date +%s)",Comment="OAI for EONMEDS Frontend" \
  --query 'CloudFrontOriginAccessIdentity.Id' \
  --output text \
  --region us-east-1)

echo "Created OAI: $OAI_ID"

# Step 2: Update CloudFront to use OAI
# This requires updating the distribution config (complex via CLI)
# Easier to do in AWS Console:
# 1. Go to CloudFront → Your Distribution → Origins
# 2. Edit the S3 origin
# 3. Under "S3 bucket access" select "Yes use OAI"
# 4. Select the OAI you just created
# 5. Select "Yes, update the bucket policy"
```

### Option 3: Temporary Public Read (NOT RECOMMENDED)

⚠️ **WARNING: This makes your bucket publicly readable!**
Only use for testing, then immediately revert.

```bash
# Make bucket publicly readable (TEMPORARY ONLY!)
aws s3api put-bucket-policy \
  --bucket eonmeds-frontend-staging \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::eonmeds-frontend-staging/*"
        }
    ]
}' \
  --region us-east-1
```

## Immediate Action

Run this command now to fix CloudFront access:

```bash
# Get your account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create and apply the CloudFront-only policy
aws s3api put-bucket-policy \
  --bucket eonmeds-frontend-staging \
  --policy "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
        {
            \"Sid\": \"AllowCloudFrontAccess\",
            \"Effect\": \"Allow\",
            \"Principal\": {
                \"Service\": \"cloudfront.amazonaws.com\"
            },
            \"Action\": \"s3:GetObject\",
            \"Resource\": \"arn:aws:s3:::eonmeds-frontend-staging/*\",
            \"Condition\": {
                \"StringEquals\": {
                    \"AWS:SourceArn\": \"arn:aws:cloudfront::${AWS_ACCOUNT_ID}:distribution/EZBKJZ75WFBQ9\"
                }
            }
        }
    ]
}" \
  --region us-east-1
```

## Verify Fix

After applying the policy:

```bash
# Test CloudFront access
curl -I https://d3p4f8m2bxony8.cloudfront.net

# Should return: HTTP/2 200
```

## Security Note

This policy:
- ✅ Keeps S3 bucket private (no direct public access)
- ✅ Only allows CloudFront to read files
- ✅ Uses AWS:SourceArn condition for extra security
- ✅ Maintains HIPAA compliance
