#!/bin/bash
set -euo pipefail

echo "🔑 Adding OpenAI API Key to AWS Secrets Manager"
echo "==============================================="
echo ""

# Prompt for API key
read -p "Paste your OpenAI API key (starts with sk-): " OPENAI_KEY

# Validate key format
if [[ ! "$OPENAI_KEY" =~ ^sk- ]]; then
    echo "❌ Invalid key format. OpenAI keys should start with 'sk-'"
    exit 1
fi

echo ""
echo "📤 Updating secret in AWS Secrets Manager..."

# Update the secret
aws secretsmanager update-secret \
  --secret-id /eonmeds/api/openai \
  --secret-string "{\"apiKey\":\"$OPENAI_KEY\"}" \
  --region us-east-1

if [ $? -eq 0 ]; then
    echo "✅ Secret updated successfully!"
    echo ""
    echo "⚠️  IMPORTANT: You still need to restart App Runner service"
    echo ""
    echo "Next steps:"
    echo "1. Go to: https://console.aws.amazon.com/apprunner"
    echo "2. Click on 'eonmeds-backend-staging'"
    echo "3. Click 'Deploy' button to trigger a new deployment"
    echo "4. Wait 3-5 minutes for deployment to complete"
else
    echo "❌ Failed to update secret"
    echo ""
    echo "Alternative: Add directly in App Runner console"
    echo "1. Go to App Runner console"
    echo "2. Edit configuration"
    echo "3. Add OPENAI_API_KEY = $OPENAI_KEY"
fi
