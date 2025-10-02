#!/bin/bash
set -euo pipefail

echo "🔐 Fixing Auth0 Configuration and Redeploying Frontend..."
echo ""

AWS_REGION="us-east-1"
S3_BUCKET="eonmeds-frontend-staging"
BACKEND_URL="https://qm6dnecfhp.us-east-1.awsapprunner.com"
CLOUDFRONT_URL="https://d3p4f8m2bxony8.cloudfront.net"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  IMPORTANT: Auth0 Configuration Mismatch Detected!${NC}"
echo ""
echo "Your frontend is using a different Auth0 tenant than your backend."
echo ""
echo -e "${GREEN}Correct Auth0 Settings (Backend is using these):${NC}"
echo "  Domain: dev-dvouayl22wlz8zwq.us.auth0.com"
echo "  Client ID: VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L"
echo "  Audience: https://api.eonmeds.com"
echo ""
echo -e "${RED}Wrong Auth0 Settings (Frontend defaults):${NC}"
echo "  Domain: eonmeds.us.auth0.com"
echo "  Client ID: PUFG93lFKClBBSaeNNyOF10esoSdPPXl"
echo ""
echo "This script will fix the frontend configuration and redeploy."
echo ""
echo "🚀 Starting automatic fix..."

# 1. Navigate to frontend
cd packages/frontend

# 2. Create correct production environment file
echo ""
echo "📝 Creating correct production environment configuration..."
cat > .env.production << EOF
# Auth0 Configuration - MUST match backend!
REACT_APP_AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L
REACT_APP_AUTH0_AUDIENCE=https://api.eonmeds.com
REACT_APP_AUTH0_REDIRECT_URI=${CLOUDFRONT_URL}/callback

# API Configuration - AWS App Runner
REACT_APP_API_BASE_URL=${BACKEND_URL}/api/v1
REACT_APP_API_URL=${BACKEND_URL}

# Build metadata
REACT_APP_BUILD_TIME=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
REACT_APP_BUILD_VERSION=aws-auth0-fix
EOF

echo "✅ Created .env.production with correct Auth0 settings"

# 3. Also create .env.local for consistency
echo ""
echo "📝 Creating .env.local for development..."
cat > .env.local << EOF
# Auth0 Configuration - MUST match backend!
REACT_APP_AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L
REACT_APP_AUTH0_AUDIENCE=https://api.eonmeds.com
REACT_APP_AUTH0_REDIRECT_URI=http://localhost:3000/callback

# API Configuration - AWS App Runner
REACT_APP_API_BASE_URL=${BACKEND_URL}/api/v1
REACT_APP_API_URL=${BACKEND_URL}
EOF

echo "✅ Created .env.local for development"

# 4. Clean previous build
echo ""
echo "🧹 Cleaning previous build..."
rm -rf build

# 5. Install dependencies (if needed)
echo ""
echo "📦 Installing dependencies..."
npm install

# 6. Build with production config
echo ""
echo "🔨 Building frontend with correct Auth0 configuration..."
NODE_ENV=production npm run build

# 7. Verify the build has correct config
echo ""
echo "🔍 Verifying build configuration..."
if grep -q "dev-dvouayl22wlz8zwq.us.auth0.com" build/static/js/*.js 2>/dev/null; then
  echo -e "${GREEN}✅ Build contains correct Auth0 domain${NC}"
else
  echo -e "${RED}❌ Warning: Build might not have correct Auth0 domain${NC}"
fi

# 8. Deploy to S3
echo ""
echo "☁️  Deploying to S3..."
aws s3 sync build/ "s3://${S3_BUCKET}/" \
  --delete \
  --cache-control "public, max-age=31536000" \
  --exclude "index.html" \
  --exclude "*.json" \
  --region "$AWS_REGION"

# Upload index.html with no-cache
aws s3 cp build/index.html "s3://${S3_BUCKET}/index.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html" \
  --region "$AWS_REGION"

# Upload service-worker.js with no-cache (if exists)
if [ -f "build/service-worker.js" ]; then
  aws s3 cp build/service-worker.js "s3://${S3_BUCKET}/service-worker.js" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --region "$AWS_REGION"
fi

echo "✅ Deployed to S3"

# 9. Invalidate CloudFront cache
echo ""
echo "🔄 Invalidating CloudFront cache..."
# Get CloudFront distribution ID
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Origins.Items[0].DomainName, '${S3_BUCKET}')].Id | [0]" \
  --output text)

if [ "$DISTRIBUTION_ID" != "None" ] && [ -n "$DISTRIBUTION_ID" ]; then
  aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" \
    --region "$AWS_REGION"
  echo "✅ CloudFront cache invalidated (Distribution: $DISTRIBUTION_ID)"
else
  echo "⚠️  Could not find CloudFront distribution (this is OK if using S3 directly)"
fi

cd ../..

echo ""
echo -e "${GREEN}🎉 Frontend redeployed with correct Auth0 configuration!${NC}"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Update Auth0 Dashboard (https://manage.auth0.com/)"
echo "   - Select tenant: dev-dvouayl22wlz8zwq.us.auth0.com"
echo "   - Go to Applications → Your App"
echo "   - Add these URLs to Allowed Callbacks:"
echo "     • ${CLOUDFRONT_URL}/callback"
echo "     • http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com/callback"
echo "     • http://localhost:3000/callback"
echo ""
echo "   - Add these URLs to Allowed Logout URLs:"
echo "     • ${CLOUDFRONT_URL}"
echo "     • http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com"
echo "     • http://localhost:3000"
echo ""
echo "   - Add these URLs to Allowed Web Origins:"
echo "     • ${CLOUDFRONT_URL}"
echo "     • http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com"
echo "     • http://localhost:3000"
echo ""
echo "2. Test login at: ${CLOUDFRONT_URL}"
echo ""
echo "📚 Full guide available in: AUTH0_CONFIGURATION_GUIDE.md"
