#!/bin/bash
set -euo pipefail

# New port for EONMEDS (since 3000 is used by PHARMAX)
NEW_PORT="3001"
OLD_PORT="3000"

echo "🔄 Updating EONMEDS to use port $NEW_PORT (port $OLD_PORT is used by PHARMAX)"
echo ""

# Update frontend package.json
cd packages/frontend

# Update the start script in package.json to use new port
echo "📝 Updating package.json scripts..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s/\"start\": \"react-scripts start\"/\"start\": \"PORT=$NEW_PORT react-scripts start\"/" package.json
else
  # Linux
  sed -i "s/\"start\": \"react-scripts start\"/\"start\": \"PORT=$NEW_PORT react-scripts start\"/" package.json
fi

# Update .env.local with new port
echo "📝 Updating .env.local..."
cat > .env.local << EOF
# Auth0 Configuration - MUST match backend!
REACT_APP_AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L
REACT_APP_AUTH0_AUDIENCE=https://api.eonmeds.com
REACT_APP_AUTH0_REDIRECT_URI=http://localhost:${NEW_PORT}/callback

# API Configuration - AWS App Runner
REACT_APP_API_BASE_URL=https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1
REACT_APP_API_URL=https://qm6dnecfhp.us-east-1.awsapprunner.com

# Local development port
PORT=${NEW_PORT}
EOF

echo "✅ Updated .env.local"

# Update .env.development if it exists
if [ -f ".env.development" ]; then
  echo "📝 Updating .env.development..."
  cat > .env.development << EOF
# Auth0 Configuration
REACT_APP_AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L
REACT_APP_AUTH0_AUDIENCE=https://api.eonmeds.com
REACT_APP_AUTH0_REDIRECT_URI=http://localhost:${NEW_PORT}/callback

# API Configuration
REACT_APP_API_BASE_URL=https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1
REACT_APP_API_URL=https://qm6dnecfhp.us-east-1.awsapprunner.com

# Local development port
PORT=${NEW_PORT}
EOF
  echo "✅ Updated .env.development"
fi

cd ../..

echo ""
echo "✅ Configuration updated!"
echo ""
echo "📋 IMPORTANT: Update Auth0 Dashboard"
echo "=================================="
echo ""
echo "1. Go to: https://manage.auth0.com/"
echo "2. Select tenant: dev-dvouayl22wlz8zwq.us.auth0.com"
echo "3. Go to Applications → Your App (Client ID: VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L)"
echo ""
echo "4. UPDATE these URLs in Auth0:"
echo ""
echo "Allowed Callback URLs (replace localhost:3000 with localhost:${NEW_PORT}):"
echo "  • https://d3p4f8m2bxony8.cloudfront.net/callback"
echo "  • http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com/callback"
echo "  • http://localhost:${NEW_PORT}/callback  ← NEW PORT!"
echo ""
echo "Allowed Logout URLs:"
echo "  • https://d3p4f8m2bxony8.cloudfront.net"
echo "  • http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com"
echo "  • http://localhost:${NEW_PORT}  ← NEW PORT!"
echo ""
echo "Allowed Web Origins:"
echo "  • https://d3p4f8m2bxony8.cloudfront.net"
echo "  • http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com"
echo "  • http://localhost:${NEW_PORT}  ← NEW PORT!"
echo ""
echo "5. Save Changes in Auth0"
echo ""
echo "🚀 To start EONMEDS locally:"
echo "  cd packages/frontend"
echo "  npm start"
echo "  → Will run on http://localhost:${NEW_PORT}"
echo ""
echo "📝 Port Usage:"
echo "  • Port 3000: PHARMAX Platform"
echo "  • Port ${NEW_PORT}: EONMEDS Application"
