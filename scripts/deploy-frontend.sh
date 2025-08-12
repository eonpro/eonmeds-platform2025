#!/bin/bash
set -e

echo "🚀 Deploying Frontend to Railway"
echo "================================"

cd packages/frontend

echo "📦 Installing dependencies..."
npm ci

echo "🔨 Building React app..."
npm run build

echo "⚙️  Setting Node version..."
railway variables --set "NIXPACKS_NODE_VERSION=20" || true

echo "🔗 Linking Railway service..."
railway link || true

echo "🚂 Deploying to Railway..."
railway up

echo "✅ Frontend deployment initiated!"