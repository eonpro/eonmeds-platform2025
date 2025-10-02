#!/bin/bash

# Create VPC Connector for App Runner to access RDS

set -euo pipefail

echo "🔗 Creating VPC Connector for App Runner..."

# Variables from RDS configuration
VPC_ID="vpc-0f5692160307d6cca"
SUBNETS="subnet-0bf69a7a39e4cabfc,subnet-0aaf7aad2aaa8fd23"  # Using 2 subnets in different AZs
RDS_SECURITY_GROUP="sg-03d7eb4039e1af12a"

# First, create a security group for the VPC connector
echo "Creating security group for VPC connector..."
CONNECTOR_SG=$(aws ec2 create-security-group \
  --group-name eonmeds-apprunner-connector-sg \
  --description "Security group for App Runner VPC connector" \
  --vpc-id $VPC_ID \
  --region us-west-2 \
  --output text \
  --query 'GroupId' 2>/dev/null || \
  aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=eonmeds-apprunner-connector-sg" \
    --region us-west-2 \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

echo "Security group: $CONNECTOR_SG"

# Add egress rule to allow all outbound traffic
aws ec2 authorize-security-group-egress \
  --group-id $CONNECTOR_SG \
  --protocol all \
  --cidr 0.0.0.0/0 \
  --region us-west-2 2>/dev/null || echo "Egress rule already exists"

# Allow the connector security group to access RDS
echo "Updating RDS security group to allow connector access..."
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SECURITY_GROUP \
  --protocol tcp \
  --port 5432 \
  --source-group $CONNECTOR_SG \
  --region us-west-2 2>/dev/null || echo "Ingress rule already exists"

# Create the VPC connector
echo "Creating VPC connector..."
CONNECTOR_ARN=$(aws apprunner create-vpc-connector \
  --vpc-connector-name eonmeds-vpc-connector \
  --subnets $SUBNETS \
  --security-groups $CONNECTOR_SG \
  --region us-west-2 \
  --query 'VpcConnector.VpcConnectorArn' \
  --output text 2>/dev/null || \
  aws apprunner list-vpc-connectors \
    --region us-west-2 \
    --query "VpcConnectors[?VpcConnectorName=='eonmeds-vpc-connector'].VpcConnectorArn | [0]" \
    --output text)

if [ "$CONNECTOR_ARN" == "None" ] || [ -z "$CONNECTOR_ARN" ]; then
  echo "❌ Failed to create VPC connector"
  exit 1
fi

echo "✅ VPC Connector created successfully!"
echo "ARN: $CONNECTOR_ARN"
echo ""
echo "This connector will be used in the App Runner configuration to access RDS."

# Save the ARN for later use
echo "$CONNECTOR_ARN" > vpc-connector-arn.txt
