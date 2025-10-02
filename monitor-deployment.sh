#!/bin/bash

# Monitor App Runner Deployment Status

echo "════════════════════════════════════════════════════════════════"
echo "    MONITORING DEPLOYMENT PROGRESS"
echo "════════════════════════════════════════════════════════════════"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check deployment every 30 seconds
while true; do
    clear
    echo "🔄 Checking Deployment Status..."
    echo ""
    
    # Get service status
    SERVICE_ARN=$(aws apprunner list-services --region us-east-1 --query "ServiceSummaryList[?ServiceName=='eonmeds-backend-staging'].ServiceArn" --output text)
    
    if [ ! -z "$SERVICE_ARN" ]; then
        STATUS=$(aws apprunner describe-service --service-arn $SERVICE_ARN --region us-east-1 --query "Service.Status" --output text)
        
        echo -e "Service: ${BLUE}eonmeds-backend-staging${NC}"
        echo -e "Status: ${YELLOW}$STATUS${NC}"
        echo ""
        
        if [ "$STATUS" = "RUNNING" ]; then
            echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
            echo ""
            
            # Test payment routes
            echo "Testing payment routes..."
            response=$(curl -s "https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/public/invoice/TEST-001" 2>/dev/null)
            
            if echo "$response" | grep -q "Route.*not found"; then
                echo -e "${YELLOW}⚠️  Routes still propagating...${NC}"
            elif echo "$response" | grep -q "Invoice not found"; then
                echo -e "${GREEN}✅ PAYMENT ROUTES ARE LIVE!${NC}"
                echo ""
                echo "Your payment system is now active!"
                echo "Patients can pay invoices online!"
                break
            fi
        elif [ "$STATUS" = "OPERATION_IN_PROGRESS" ]; then
            echo -e "${YELLOW}⏳ Deployment in progress...${NC}"
            echo "This usually takes 5-10 minutes"
        else
            echo -e "${RED}Status: $STATUS${NC}"
        fi
    fi
    
    echo ""
    echo "Next check in 30 seconds... (Press Ctrl+C to stop)"
    sleep 30
done
