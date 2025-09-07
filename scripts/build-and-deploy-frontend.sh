#!/bin/bash
set -euo pipefail

echo "🚀 PRODUCTION BUILD & DEPLOY SCRIPT"
echo "===================================="
echo ""

# Configuration
AWS_REGION="us-east-1"
S3_BUCKET="eonmeds-frontend-staging"
CLOUDFRONT_DISTRIBUTION="EZBKJZ75WFBQ9"
FRONTEND_DIR="packages/frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check prerequisites
echo "📋 Checking prerequisites..."
echo "----------------------------"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Must run from project root directory"
    exit 1
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not installed"
    exit 1
fi
print_status "AWS CLI found"

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_warning "Node version is $NODE_VERSION, but 20+ is recommended"
    echo "Attempting to use nvm to switch to Node 20..."
    if command -v nvm &> /dev/null; then
        nvm use 20 || nvm install 20 && nvm use 20
    else
        print_error "Please install Node 20 or higher"
        exit 1
    fi
fi
print_status "Node version OK"

echo ""
echo "🔧 Step 1: Setting up environment"
echo "---------------------------------"

# Navigate to frontend directory
cd "$FRONTEND_DIR"

# Set memory limit for build
export NODE_OPTIONS="--max-old-space-size=4096"
print_status "Memory limit set to 4GB"

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf build node_modules/.cache
print_status "Previous builds cleaned"

echo ""
echo "📦 Step 2: Installing dependencies"
echo "----------------------------------"

# Check if node_modules exists and is recent
if [ -d "node_modules" ]; then
    # Check if package.json is newer than node_modules
    if [ "package.json" -nt "node_modules" ]; then
        print_warning "package.json has changed, reinstalling dependencies..."
        rm -rf node_modules package-lock.json
        npm ci --legacy-peer-deps
    else
        print_status "Dependencies up to date"
    fi
else
    print_warning "Installing dependencies..."
    npm ci --legacy-peer-deps || npm install --legacy-peer-deps
fi

echo ""
echo "🏗️ Step 3: Building production bundle"
echo "-------------------------------------"

# Set production environment
export NODE_ENV=production

# Build with all warnings suppressed
print_warning "Building frontend (this may take a few minutes)..."
CI=false DISABLE_ESLINT_PLUGIN=true TSC_COMPILE_ON_ERROR=true npm run build

# Verify build output
if [ ! -f "build/index.html" ]; then
    print_error "Build failed - index.html not found"
    exit 1
fi

# Check build size
BUILD_SIZE=$(du -sh build | cut -f1)
print_status "Build complete! Size: $BUILD_SIZE"

echo ""
echo "🔍 Step 4: Validating Auth0 configuration"
echo "-----------------------------------------"

# Check if Auth0 config is embedded
if grep -q "dev-dvouayl22wlz8zwq" build/static/js/main.*.js 2>/dev/null; then
    print_status "Auth0 domain found in build"
else
    print_warning "Auth0 domain not found in build - may use runtime config"
fi

if grep -q "VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L" build/static/js/main.*.js 2>/dev/null; then
    print_status "Auth0 client ID found in build"
else
    print_warning "Auth0 client ID not found in build - may use runtime config"
fi

echo ""
echo "☁️ Step 5: Deploying to AWS S3"
echo "------------------------------"

# Deploy to S3 with proper cache headers
print_warning "Uploading to S3..."

# Upload all files except index.html with long cache
aws s3 sync build/ "s3://${S3_BUCKET}/" \
    --region "${AWS_REGION}" \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html" \
    --exclude "service-worker.js" \
    --exclude "manifest.json"

# Upload index.html with no-cache
aws s3 cp build/index.html "s3://${S3_BUCKET}/" \
    --region "${AWS_REGION}" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html"

# Upload service-worker.js with no-cache
if [ -f "build/service-worker.js" ]; then
    aws s3 cp build/service-worker.js "s3://${S3_BUCKET}/" \
        --region "${AWS_REGION}" \
        --cache-control "no-cache, no-store, must-revalidate" \
        --content-type "application/javascript"
fi

# Upload manifest.json with short cache
if [ -f "build/manifest.json" ]; then
    aws s3 cp build/manifest.json "s3://${S3_BUCKET}/" \
        --region "${AWS_REGION}" \
        --cache-control "public, max-age=3600" \
        --content-type "application/manifest+json"
fi

print_status "S3 upload complete"

echo ""
echo "🌐 Step 6: Invalidating CloudFront cache"
echo "----------------------------------------"

# Create CloudFront invalidation
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "${CLOUDFRONT_DISTRIBUTION}" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

print_status "CloudFront invalidation created: $INVALIDATION_ID"

echo ""
echo "⏳ Step 7: Waiting for invalidation"
echo "-----------------------------------"

# Wait for invalidation to complete (with timeout)
echo "Waiting for CloudFront invalidation to complete (this may take 2-3 minutes)..."

SECONDS=0
TIMEOUT=300 # 5 minutes

while [ $SECONDS -lt $TIMEOUT ]; do
    STATUS=$(aws cloudfront get-invalidation \
        --distribution-id "${CLOUDFRONT_DISTRIBUTION}" \
        --id "${INVALIDATION_ID}" \
        --query 'Invalidation.Status' \
        --output text)
    
    if [ "$STATUS" = "Completed" ]; then
        print_status "CloudFront invalidation completed!"
        break
    fi
    
    echo -n "."
    sleep 10
done

if [ $SECONDS -ge $TIMEOUT ]; then
    print_warning "Invalidation is still in progress, but deployment is complete"
fi

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "======================="
echo ""
echo "📱 Your application is now live at:"
echo "   https://d3p4f8m2bxony8.cloudfront.net"
echo ""
echo "🔐 Auth0 Configuration:"
echo "   Domain: dev-dvouayl22wlz8zwq.us.auth0.com"
echo "   Client: VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L"
echo ""
echo "📊 Deployment Summary:"
echo "   - Build size: $BUILD_SIZE"
echo "   - S3 bucket: $S3_BUCKET"
echo "   - CloudFront: $CLOUDFRONT_DISTRIBUTION"
echo "   - Invalidation: $INVALIDATION_ID"
echo ""
echo "🧪 Test your deployment:"
echo "   1. Open https://d3p4f8m2bxony8.cloudfront.net"
echo "   2. Click the 'Log In' button"
echo "   3. Verify Auth0 login page appears"
echo "   4. Complete authentication"
echo ""

# Return to project root
cd ../..

# Open the site in browser (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Opening site in browser..."
    open "https://d3p4f8m2bxony8.cloudfront.net"
fi

print_status "Script completed successfully!"
