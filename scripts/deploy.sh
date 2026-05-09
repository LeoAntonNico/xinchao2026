#!/bin/bash
# Auto-deploy script — run on VPS after setup is complete
set -e

echo "🚀 Xin Chào Restaurant — Deploy"

cd /opt/restaurant

echo "📥 Pulling latest code..."
git pull origin main

echo "📦 Installing dependencies..."
npm ci

echo "🗄️ Running migrations..."
npx prisma migrate deploy

echo "🔨 Building..."
npm run build

echo "🚀 Restarting app..."
pm2 restart restaurant || pm2 start npm --name "restaurant" -- start

echo "✅ Deploy complete at $(date)"
