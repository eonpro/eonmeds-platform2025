#!/bin/bash

# AWS Secrets Creation Script for EONMEDS
# This script creates the necessary secrets in AWS Secrets Manager

set -euo pipefail

echo "🔐 Creating AWS Secrets for EONMEDS..."

# Database Secret
echo "Creating database secret..."
aws secretsmanager create-secret \
  --name /eonmeds/api/database \
  --description "EONMEDS Database Connection" \
  --secret-string '{
    "url": "postgresql://eonmeds_admin:398Xakf$57@eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com:5432/eonmeds"
  }' \
  --region us-east-1 || echo "Database secret already exists"

# Stripe Secret
echo "Creating Stripe secret..."
aws secretsmanager create-secret \
  --name /eonmeds/api/stripe \
  --description "EONMEDS Stripe API Keys" \
  --secret-string '{
    "secretKey": "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",
    "webhookSecret": "whsec_hv94xzS2J5E1y8qgvfGhF5PYW7q5Z7Vy"
  }' \
  --region us-east-1 || echo "Stripe secret already exists"

# JWT Secret
echo "Creating JWT secret..."
aws secretsmanager create-secret \
  --name /eonmeds/api/jwt \
  --description "EONMEDS JWT Secret" \
  --secret-string '{
    "secret": "A7SIqN7OF9mtnobJD8aJKFeW5+z301u+WRQGE5IHo10="
  }' \
  --region us-east-1 || echo "JWT secret already exists"

# Auth0 Secret
echo "Creating Auth0 secret..."
aws secretsmanager create-secret \
  --name /eonmeds/api/auth0 \
  --description "EONMEDS Auth0 Configuration" \
  --secret-string '{
    "domain": "dev-dvouayl22wlz8zwq.us.auth0.com",
    "clientId": "VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L",
    "audience": "https://api.eonmeds.com"
  }' \
  --region us-east-1 || echo "Auth0 secret already exists"

# OpenAI Secret
echo "Creating OpenAI secret..."
aws secretsmanager create-secret \
  --name /eonmeds/api/openai \
  --description "EONMEDS OpenAI API Key" \
  --secret-string '{
    "apiKey": "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"
  }' \
  --region us-east-1 || echo "OpenAI secret already exists"

echo "✅ Secrets creation complete!"
echo ""
echo "Verifying secrets..."
aws secretsmanager list-secrets --region us-east-1 --query "SecretList[?starts_with(Name, '/eonmeds/')].Name" --output table

echo ""
echo "🔍 To view a secret value, use:"
echo "aws secretsmanager get-secret-value --secret-id /eonmeds/api/database --region us-east-1"
