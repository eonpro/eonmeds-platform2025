#!/bin/bash

# ========================================
# Production Infrastructure Verification
# ========================================
# This script verifies all production services
# are running correctly after migration
# ========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Production Infrastructure Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check endpoint
check_endpoint() {
    local NAME=$1
    local URL=$2
    local EXPECTED_CODE=$3
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "Checking $NAME... "
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || echo "000")
    
    if [ "$HTTP_CODE" = "$EXPECTED_CODE" ]; then
        echo -e "${GREEN}✅ OK (HTTP $HTTP_CODE)${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED (Expected $EXPECTED_CODE, got $HTTP_CODE)${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Function to check DNS
check_dns() {
    local DOMAIN=$1
    local RECORD_TYPE=$2
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "Checking DNS $RECORD_TYPE record for $DOMAIN... "
    
    if nslookup -type=$RECORD_TYPE $DOMAIN > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Resolving${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ Not resolving${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Function to check SSL
check_ssl() {
    local DOMAIN=$1
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "Checking SSL certificate for $DOMAIN... "
    
    if echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | grep "Verify return code: 0" > /dev/null; then
        echo -e "${GREEN}✅ Valid${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${YELLOW}⚠️  Check manually${NC}"
        return 1
    fi
}

# Function to check API health
check_api_health() {
    local NAME=$1
    local URL=$2
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "Checking $NAME health... "
    
    RESPONSE=$(curl -s "$URL" || echo '{"error":"failed"}')
    
    if echo "$RESPONSE" | grep -q "healthy\|ok\|running"; then
        echo -e "${GREEN}✅ Healthy${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ Unhealthy${NC}"
        echo "  Response: $RESPONSE"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# ========================================
# DNS Checks
# ========================================
echo -e "${BLUE}1. DNS Resolution${NC}"
echo "----------------------------------------"

# Check if using custom domain or AWS endpoints
if [ "$1" = "--aws" ]; then
    echo "Using AWS endpoints..."
    FRONTEND_URL="https://d3p4f8m2bxony8.cloudfront.net"
    API_URL="https://qm6dnecfhp.us-east-1.awsapprunner.com"
    AUTH_DOMAIN="dev-dvouayl22wlz8zwq.us.auth0.com"
else
    echo "Using custom domain (eonpro.app)..."
    FRONTEND_URL="https://eonpro.app"
    API_URL="https://api.eonpro.app"
    AUTH_DOMAIN="auth.eonpro.app"
    
    check_dns "eonpro.app" "A"
    check_dns "www.eonpro.app" "CNAME"
    check_dns "api.eonpro.app" "CNAME"
    check_dns "auth.eonpro.app" "CNAME"
fi

echo ""

# ========================================
# Frontend Checks
# ========================================
echo -e "${BLUE}2. Frontend (CloudFront/S3)${NC}"
echo "----------------------------------------"

check_endpoint "Frontend Homepage" "$FRONTEND_URL" "200"
check_endpoint "Frontend Static Asset" "$FRONTEND_URL/static/js/main.js" "200"
check_endpoint "Frontend Favicon" "$FRONTEND_URL/favicon.ico" "200"

echo ""

# ========================================
# Backend API Checks
# ========================================
echo -e "${BLUE}3. Backend API (App Runner)${NC}"
echo "----------------------------------------"

check_api_health "API Health" "$API_URL/health"
check_endpoint "API Version" "$API_URL/version" "200"
check_endpoint "API Root" "$API_URL/api/v1" "200"

# Webhook endpoints (should return error without proper signature)
check_endpoint "Stripe Webhook" "$API_URL/api/v1/webhooks/stripe" "400"
check_endpoint "HeyFlow Webhook" "$API_URL/api/v1/webhooks/general/heyflow" "200"

echo ""

# ========================================
# Auth0 Checks
# ========================================
echo -e "${BLUE}4. Auth0 Authentication${NC}"
echo "----------------------------------------"

check_endpoint "Auth0 Domain" "https://$AUTH_DOMAIN" "200"
check_endpoint "Auth0 JWKS" "https://$AUTH_DOMAIN/.well-known/jwks.json" "200"

echo ""

# ========================================
# SSL Certificate Checks
# ========================================
if [ "$1" != "--aws" ]; then
    echo -e "${BLUE}5. SSL Certificates${NC}"
    echo "----------------------------------------"
    
    check_ssl "eonpro.app"
    check_ssl "api.eonpro.app"
    check_ssl "auth.eonpro.app"
    
    echo ""
fi

# ========================================
# Database Connectivity
# ========================================
echo -e "${BLUE}6. Database (RDS PostgreSQL)${NC}"
echo "----------------------------------------"

echo -n "Checking database connectivity... "
if nc -zv eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com 5432 2>/dev/null; then
    echo -e "${GREEN}✅ Port 5432 accessible${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}❌ Cannot connect to database${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo ""

# ========================================
# Performance Checks
# ========================================
echo -e "${BLUE}7. Performance Metrics${NC}"
echo "----------------------------------------"

echo -n "Frontend load time: "
TIME=$(curl -o /dev/null -s -w '%{time_total}' "$FRONTEND_URL")
if (( $(echo "$TIME < 2" | bc -l) )); then
    echo -e "${GREEN}✅ ${TIME}s${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠️  ${TIME}s (slow)${NC}"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo -n "API response time: "
TIME=$(curl -o /dev/null -s -w '%{time_total}' "$API_URL/health")
if (( $(echo "$TIME < 0.5" | bc -l) )); then
    echo -e "${GREEN}✅ ${TIME}s${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠️  ${TIME}s (slow)${NC}"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo ""

# ========================================
# Security Headers Check
# ========================================
echo -e "${BLUE}8. Security Headers${NC}"
echo "----------------------------------------"

check_security_header() {
    local HEADER=$1
    local URL=$2
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "Checking $HEADER... "
    
    if curl -s -I "$URL" | grep -i "$HEADER" > /dev/null; then
        echo -e "${GREEN}✅ Present${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${YELLOW}⚠️  Missing${NC}"
    fi
}

check_security_header "Strict-Transport-Security" "$FRONTEND_URL"
check_security_header "X-Content-Type-Options" "$FRONTEND_URL"
check_security_header "X-Frame-Options" "$FRONTEND_URL"

echo ""

# ========================================
# Summary
# ========================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}            TEST SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

SUCCESS_RATE=$(echo "scale=1; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc)

echo "Total Checks: $TOTAL_CHECKS"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
echo "Success Rate: ${SUCCESS_RATE}%"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Infrastructure is healthy.${NC}"
elif [ $FAILED_CHECKS -le 3 ]; then
    echo -e "${YELLOW}⚠️  Minor issues detected. Review failed checks.${NC}"
else
    echo -e "${RED}❌ Multiple failures detected. Immediate attention required!${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo ""

# Additional recommendations
if [ $FAILED_CHECKS -gt 0 ]; then
    echo -e "${YELLOW}Recommendations:${NC}"
    echo "1. Check CloudWatch logs for errors"
    echo "2. Verify environment variables in App Runner"
    echo "3. Check Auth0 configuration"
    echo "4. Verify DNS propagation status"
    echo "5. Review security group rules"
fi

exit $FAILED_CHECKS
