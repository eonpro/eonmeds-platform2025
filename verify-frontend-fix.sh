#!/bin/bash
set -euo pipefail

echo "=== Frontend Fix Verification Script ==="
echo ""
echo "⏳ Waiting for Railway to redeploy (if you just changed the env var)..."
echo "   This usually takes 2-3 minutes..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FRONTEND_URL="https://eonmeds-frontend-production.up.railway.app"
BACKEND_URL="https://eonmeds-backend-v2-production.up.railway.app"

echo "=== 1. Testing Backend Health ==="
if curl -s "$BACKEND_URL/health" | jq . > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
    curl -s "$BACKEND_URL/health" | jq .
else
    echo -e "${RED}❌ Backend health check failed${NC}"
fi

echo ""
echo "=== 2. Testing Frontend Static Files ==="
if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200"; then
    echo -e "${GREEN}✅ Frontend is serving files${NC}"
else
    echo -e "${RED}❌ Frontend is not accessible${NC}"
fi

echo ""
echo "=== 3. Checking for Malformed Requests ==="
echo "Please check Railway Frontend HTTP logs for requests like:"
echo -e "${RED}/REACT_APP_API_URL=https://...${NC} (BAD)"
echo "vs"
echo -e "${GREEN}/api/v1/...${NC} (GOOD)"

echo ""
echo "=== 4. Manual Test Steps ==="
echo "1. Open $FRONTEND_URL in your browser"
echo "2. Open Browser DevTools (F12) → Network tab"
echo "3. Try to log in"
echo "4. Look for API calls to:"
echo -e "   ${GREEN}$BACKEND_URL/api/v1/...${NC}"
echo "5. If you see network errors or 404s, the env var is still wrong"

echo ""
echo "=== 5. Quick API Test ==="
echo "Testing a public endpoint on the backend..."
if curl -s "$BACKEND_URL/api/v1" | jq . > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Backend API endpoint returned unexpected response${NC}"
fi

echo ""
echo "=== Summary ==="
echo "If all tests pass and you can log in to the frontend,"
echo "the environment variable has been fixed correctly!"
echo ""
echo "Still seeing issues? Double-check:"
echo "1. Railway Frontend Service → Variables → REACT_APP_API_URL"
echo "2. The value should be ONLY: $BACKEND_URL"
echo "3. NO 'REACT_APP_API_URL=' prefix in the value"