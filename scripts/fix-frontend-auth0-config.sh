#!/bin/bash
set -euo pipefail

echo "🔧 Fixing Frontend Auth0 Configuration..."
echo ""

cd packages/frontend

# Create correct environment files
echo "📝 Creating correct .env files..."

cat > .env << EOF
REACT_APP_AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L
REACT_APP_AUTH0_AUDIENCE=https://api.eonmeds.com
REACT_APP_AUTH0_REDIRECT_URI=https://d3p4f8m2bxony8.cloudfront.net/callback
REACT_APP_API_BASE_URL=https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1
REACT_APP_API_URL=https://qm6dnecfhp.us-east-1.awsapprunner.com
PORT=3001
EOF

cat > .env.production << EOF
REACT_APP_AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L
REACT_APP_AUTH0_AUDIENCE=https://api.eonmeds.com
REACT_APP_AUTH0_REDIRECT_URI=https://d3p4f8m2bxony8.cloudfront.net/callback
REACT_APP_API_BASE_URL=https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1
REACT_APP_API_URL=https://qm6dnecfhp.us-east-1.awsapprunner.com
EOF

echo "✅ Environment files created"
echo ""

# Clean and rebuild
echo "🧹 Cleaning previous build..."
rm -rf build

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building with correct Auth0 configuration..."
NODE_ENV=production npm run build

echo ""
echo "✅ Build complete!"
echo ""

# Deploy to S3
echo "☁️ Deploying to S3..."
aws s3 sync build/ s3://eonmeds-frontend-staging/ \
  --delete \
  --cache-control "public, max-age=31536000" \
  --exclude "index.html" \
  --exclude "*.json" \
  --region us-east-1

# Upload index.html with no-cache
aws s3 cp build/index.html s3://eonmeds-frontend-staging/index.html \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html" \
  --region us-east-1

echo "✅ Deployed to S3"
echo ""

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id EZBKJZ75WFBQ9 \
  --paths "/*" \
  --region us-east-1

echo ""
echo "✅ CloudFront cache invalidated"
echo ""
echo "⏳ Wait 2-3 minutes for CloudFront to update"
echo "Then refresh: https://d3p4f8m2bxony8.cloudfront.net"

cd ../..
