#!/bin/bash
# Hetzner VPS initial setup — run once as root
set -e

echo "🚀 Xin Chào Restaurant — Server Setup"

# Update
apt update && apt upgrade -y

# Docker
if ! command -v docker &> /dev/null; then
  echo "📦 Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker root
  systemctl enable docker
  systemctl start docker
fi

# Node.js 20
if ! command -v node &> /dev/null; then
  echo "📦 Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

# PM2
if ! command -v pm2 &> /dev/null; then
  echo "📦 Installing PM2..."
  npm install -g pm2
fi

# Nginx + Certbot
apt install -y nginx certbot python3-certbot-nginx

# Directories
mkdir -p /opt/restaurant
mkdir -p /opt/postgres/data
mkdir -p /opt/backups
chmod 700 /opt/backups

echo "✅ Base setup complete. Run deploy.sh next."
