#!/bin/bash
set -euo pipefail

echo "🔍 VERIFYING AUTH0 DEPLOYMENT"
echo "=============================="
echo ""

# Configuration
CLOUDFRONT_URL="https://d3p4f8m2bxony8.cloudfront.net"
S3_URL="http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com"
BACKEND_URL="https://qm6dnecfhp.us-east-1.awsapprunner.com"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
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

echo "📡 Step 1: Testing CloudFront accessibility"
echo "-------------------------------------------"

# Test CloudFront
if curl -s -o /dev/null -w "%{http_code}" "$CLOUDFRONT_URL" | grep -q "200"; then
    print_status "CloudFront is accessible (HTTP 200)"
else
    print_error "CloudFront is not accessible"
fi

# Check if index.html loads
if curl -s "$CLOUDFRONT_URL" | grep -q "EONMeds"; then
    print_status "Application HTML loaded successfully"
else
    print_error "Application HTML not loading correctly"
fi

echo ""
echo "🔐 Step 2: Verifying Auth0 configuration"
echo "----------------------------------------"

# Download main JS file to check Auth0 config
TEMP_JS=$(mktemp)
curl -s "$CLOUDFRONT_URL" > "$TEMP_JS"

# Extract main.js URL
MAIN_JS_URL=$(grep -o '/static/js/main\.[a-z0-9]*\.js' "$TEMP_JS" | head -1)
if [ -n "$MAIN_JS_URL" ]; then
    # Download and check for Auth0 config
    curl -s "${CLOUDFRONT_URL}${MAIN_JS_URL}" > "$TEMP_JS"
    
    if grep -q "dev-dvouayl22wlz8zwq" "$TEMP_JS"; then
        print_status "Auth0 domain configured correctly"
    else
        print_error "Auth0 domain not found in build"
    fi
    
    if grep -q "VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L" "$TEMP_JS"; then
        print_status "Auth0 Client ID configured correctly"
    else
        print_error "Auth0 Client ID not found in build"
    fi
    
    if grep -q "https://api.eonmeds.com" "$TEMP_JS"; then
        print_status "Auth0 audience configured correctly"
    else
        print_error "Auth0 audience not found in build"
    fi
else
    print_warning "Could not extract main.js URL"
fi

rm -f "$TEMP_JS"

echo ""
echo "🔗 Step 3: Testing backend connectivity"
echo "---------------------------------------"

# Test backend health
if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" | grep -q "200"; then
    print_status "Backend API is healthy"
else
    print_error "Backend API is not responding"
fi

# Test backend version
VERSION=$(curl -s "$BACKEND_URL/version" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
if [ -n "$VERSION" ]; then
    print_status "Backend version: $VERSION"
else
    print_warning "Could not determine backend version"
fi

echo ""
echo "🌐 Step 4: Testing Auth0 endpoints"
echo "----------------------------------"

AUTH0_DOMAIN="dev-dvouayl22wlz8zwq.us.auth0.com"

# Test Auth0 well-known endpoint
if curl -s -o /dev/null -w "%{http_code}" "https://$AUTH0_DOMAIN/.well-known/openid-configuration" | grep -q "200"; then
    print_status "Auth0 tenant is accessible"
else
    print_error "Auth0 tenant is not accessible"
fi

# Test JWKS endpoint
if curl -s -o /dev/null -w "%{http_code}" "https://$AUTH0_DOMAIN/.well-known/jwks.json" | grep -q "200"; then
    print_status "Auth0 JWKS endpoint is accessible"
else
    print_error "Auth0 JWKS endpoint is not accessible"
fi

echo ""
echo "📋 DEPLOYMENT VERIFICATION SUMMARY"
echo "=================================="
echo ""
echo "Frontend URLs:"
echo "  CloudFront (HTTPS): $CLOUDFRONT_URL ✅"
echo "  S3 (HTTP only): $S3_URL"
echo ""
echo "Backend API:"
echo "  URL: $BACKEND_URL"
echo "  Version: $VERSION"
echo ""
echo "Auth0 Configuration:"
echo "  Domain: $AUTH0_DOMAIN"
echo "  Client ID: VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L"
echo "  Audience: https://api.eonmeds.com"
echo ""
echo "🧪 MANUAL TESTING REQUIRED:"
echo "1. Open $CLOUDFRONT_URL in a browser"
echo "2. Open Developer Console (F12)"
echo "3. Click the 'Log In' button"
echo "4. Verify you're redirected to Auth0 login page"
echo "5. Complete login with test credentials"
echo "6. Verify you're redirected back to the app"
echo ""

# Open in browser if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Opening CloudFront URL in browser..."
    open "$CLOUDFRONT_URL"
fi

print_status "Verification complete!"
