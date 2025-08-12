#!/bin/bash
set -e

echo "🚀 Deploying Backend to Railway"
echo "==============================="

cd packages/backend

echo "📦 Installing dependencies..."
npm ci

echo "🔨 Building TypeScript..."
npm run build

echo "⚙️  Setting Node version..."
railway variables --set "NIXPACKS_NODE_VERSION=20" || true

echo "🔗 Linking Railway service..."
railway link || true

echo "🚂 Deploying to Railway..."
railway up

echo "✅ Backend deployment initiated!"