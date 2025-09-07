#!/bin/bash

# Script to start Docker and build the backend image

set -euo pipefail

echo "🐳 Starting Docker Desktop..."

# Try to start Docker Desktop on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Check if Docker Desktop is installed
    if [ -d "/Applications/Docker.app" ]; then
        echo "Opening Docker Desktop..."
        open -a Docker
        
        # Wait for Docker to start
        echo "Waiting for Docker to be ready..."
        MAX_WAIT=60
        COUNTER=0
        
        while ! docker info > /dev/null 2>&1; do
            if [ $COUNTER -lt $MAX_WAIT ]; then
                echo -n "."
                sleep 2
                ((COUNTER++))
            else
                echo ""
                echo "❌ Docker failed to start after $MAX_WAIT seconds"
                echo "Please start Docker Desktop manually and run this script again"
                exit 1
            fi
        done
        
        echo ""
        echo "✅ Docker is running!"
    else
        echo "❌ Docker Desktop not found at /Applications/Docker.app"
        echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
        exit 1
    fi
else
    echo "⚠️  This script is designed for macOS. Please start Docker manually."
    exit 1
fi

# Continue with the build process
echo ""
echo "📦 Building backend Docker image..."

cd packages/backend

# Build the Docker image
echo "Building eonmeds-backend:latest..."
docker build -t eonmeds-backend:latest . --platform linux/amd64

# Tag for ECR
echo "Tagging image for ECR..."
docker tag eonmeds-backend:latest 147997129811.dkr.ecr.us-east-1.amazonaws.com/eonmeds-backend:latest
docker tag eonmeds-backend:latest 147997129811.dkr.ecr.us-east-1.amazonaws.com/eonmeds-backend:staging

# Push to ECR
echo "Pushing image to ECR..."
docker push 147997129811.dkr.ecr.us-east-1.amazonaws.com/eonmeds-backend:latest
docker push 147997129811.dkr.ecr.us-east-1.amazonaws.com/eonmeds-backend:staging

echo ""
echo "✅ Docker image built and pushed successfully!"
echo "Repository: 147997129811.dkr.ecr.us-east-1.amazonaws.com/eonmeds-backend"
echo "Tags: latest, staging"
