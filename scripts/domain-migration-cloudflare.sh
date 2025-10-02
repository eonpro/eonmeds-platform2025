#!/bin/bash

# ========================================
# EONPro Domain Migration to Cloudflare
# ========================================
# This script helps automate the DNS record creation
# after you've added the domain to Cloudflare
#
# Prerequisites:
# 1. Cloudflare account created
# 2. Domain added to Cloudflare
# 3. Cloudflare API token generated
# ========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   EONPro Domain Migration Helper${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if environment variables are set
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  CLOUDFLARE_API_TOKEN not set${NC}"
    echo "Please set your Cloudflare API token:"
    echo "export CLOUDFLARE_API_TOKEN=your_token_here"
    echo ""
    echo "Get your API token from:"
    echo "https://dash.cloudflare.com/profile/api-tokens"
    exit 1
fi

if [ -z "$CLOUDFLARE_ZONE_ID" ]; then
    echo -e "${YELLOW}⚠️  CLOUDFLARE_ZONE_ID not set${NC}"
    echo "Please set your Cloudflare Zone ID:"
    echo "export CLOUDFLARE_ZONE_ID=your_zone_id_here"
    echo ""
    echo "Find your Zone ID in Cloudflare Dashboard:"
    echo "Dashboard → eonpro.app → Overview → API section"
    exit 1
fi

# Configuration
DOMAIN="eonpro.app"
API_TOKEN="$CLOUDFLARE_API_TOKEN"
ZONE_ID="$CLOUDFLARE_ZONE_ID"

# Function to create DNS record
create_dns_record() {
    local TYPE=$1
    local NAME=$2
    local CONTENT=$3
    local PROXIED=$4
    local PRIORITY=$5
    
    echo -e "${YELLOW}Creating $TYPE record: $NAME → $CONTENT${NC}"
    
    # Build JSON payload
    if [ -z "$PRIORITY" ]; then
        PAYLOAD=$(cat <<EOF
{
    "type": "$TYPE",
    "name": "$NAME",
    "content": "$CONTENT",
    "ttl": 1,
    "proxied": $PROXIED
}
EOF
)
    else
        PAYLOAD=$(cat <<EOF
{
    "type": "$TYPE",
    "name": "$NAME",
    "content": "$CONTENT",
    "ttl": 1,
    "priority": $PRIORITY,
    "proxied": false
}
EOF
)
    fi
    
    # Make API call
    RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        --data "$PAYLOAD")
    
    # Check if successful
    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Created successfully${NC}"
    else
        echo -e "${RED}❌ Failed to create record${NC}"
        echo "$RESPONSE" | jq '.errors'
    fi
    echo ""
}

# Main execution
echo -e "${BLUE}Step 1: Creating DNS Records${NC}"
echo "========================================="
echo ""

# Frontend records
echo -e "${GREEN}→ Frontend (CloudFront)${NC}"
create_dns_record "CNAME" "@" "d3p4f8m2bxony8.cloudfront.net" true
create_dns_record "CNAME" "www" "d3p4f8m2bxony8.cloudfront.net" true

# API Backend
echo -e "${GREEN}→ API Backend (App Runner)${NC}"
create_dns_record "CNAME" "api" "qm6dnecfhp.us-east-1.awsapprunner.com" true

# Auth0 Custom Domain
echo -e "${GREEN}→ Auth0 Custom Domain${NC}"
create_dns_record "CNAME" "auth" "dev-dvouayl22wlz8zwq.us.auth0.com" false

# Email records (Google Workspace example)
echo -e "${GREEN}→ Email Configuration (Google Workspace)${NC}"
create_dns_record "MX" "@" "aspmx.l.google.com" false 1
create_dns_record "MX" "@" "alt1.aspmx.l.google.com" false 5
create_dns_record "MX" "@" "alt2.aspmx.l.google.com" false 5
create_dns_record "MX" "@" "alt3.aspmx.l.google.com" false 10
create_dns_record "MX" "@" "alt4.aspmx.l.google.com" false 10

# SPF Record
echo -e "${GREEN}→ Email Authentication (SPF)${NC}"
create_dns_record "TXT" "@" "v=spf1 include:_spf.google.com ~all" false

# DMARC Record
echo -e "${GREEN}→ Email Security (DMARC)${NC}"
create_dns_record "TXT" "_dmarc" "v=DMARC1; p=quarantine; rua=mailto:admin@eonpro.app" false

echo ""
echo -e "${BLUE}Step 2: Configuring Cloudflare Settings${NC}"
echo "========================================="
echo ""

# Configure SSL settings
echo -e "${YELLOW}Configuring SSL/TLS settings...${NC}"
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/ssl" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"value":"strict"}' > /dev/null

curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/always_use_https" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"value":"on"}' > /dev/null

curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/min_tls_version" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"value":"1.2"}' > /dev/null

echo -e "${GREEN}✅ SSL/TLS configured${NC}"
echo ""

# Configure security settings
echo -e "${YELLOW}Configuring security settings...${NC}"
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/security_level" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"value":"high"}' > /dev/null

curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/browser_check" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"value":"on"}' > /dev/null

echo -e "${GREEN}✅ Security settings configured${NC}"
echo ""

# Configure performance settings
echo -e "${YELLOW}Configuring performance settings...${NC}"
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/minify" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"value":{"css":true,"html":true,"js":true}}' > /dev/null

curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/brotli" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"value":"on"}' > /dev/null

echo -e "${GREEN}✅ Performance settings configured${NC}"
echo ""

# Create Page Rules
echo -e "${BLUE}Step 3: Creating Page Rules${NC}"
echo "========================================="
echo ""

# API Caching Rule
echo -e "${YELLOW}Creating API bypass cache rule...${NC}"
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/pagerules" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{
        "targets": [
            {
                "target": "url",
                "constraint": {
                    "operator": "matches",
                    "value": "api.eonpro.app/*"
                }
            }
        ],
        "actions": [
            {
                "id": "cache_level",
                "value": "bypass"
            },
            {
                "id": "security_level",
                "value": "high"
            }
        ],
        "priority": 1,
        "status": "active"
    }' > /dev/null

echo -e "${GREEN}✅ API page rule created${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Cloudflare configuration complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update nameservers at your registrar to:"
echo "   - Check in Cloudflare Dashboard → DNS → Nameservers"
echo ""
echo "2. Wait for DNS propagation (1-48 hours)"
echo "   - Check status: https://www.whatsmydns.net/#NS/eonpro.app"
echo ""
echo "3. Configure Auth0 custom domain:"
echo "   - Go to Auth0 Dashboard → Settings → Custom Domains"
echo "   - Add: auth.eonpro.app"
echo ""
echo "4. Update application configurations:"
echo "   - Frontend: Update API_URL to https://api.eonpro.app"
echo "   - Backend: Update CORS origins"
echo ""
echo -e "${GREEN}Domain migration script completed!${NC}"
