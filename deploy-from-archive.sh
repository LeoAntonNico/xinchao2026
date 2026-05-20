#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/restaurant}"
ARCHIVE="${1:-/tmp/xinchao-deploy.tar.gz}"
BACKUP_DIR="/opt/backups/restaurant-code-$(date +%Y%m%d-%H%M%S)"

echo "Deploying Xin Chao from $ARCHIVE"
if [ ! -f "$ARCHIVE" ]; then
  echo "Archive not found: $ARCHIVE" >&2
  exit 1
fi

mkdir -p "$APP_DIR" /opt/backups
if [ -d "$APP_DIR/src" ]; then
  mkdir -p "$BACKUP_DIR"
  echo "Backing up current code to $BACKUP_DIR"
  tar \
    --exclude="$APP_DIR/node_modules" \
    --exclude="$APP_DIR/.next" \
    -czf "$BACKUP_DIR/code.tar.gz" \
    -C "$APP_DIR" .
fi

TMP_DIR="$(mktemp -d)"
tar -xzf "$ARCHIVE" -C "$TMP_DIR"

if [ -f "$APP_DIR/.env.local" ]; then
  cp "$APP_DIR/.env.local" "$TMP_DIR/.env.local"
elif [ -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env" "$TMP_DIR/.env"
fi

rsync -a --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .env.local \
  --exclude .env \
  "$TMP_DIR/" "$APP_DIR/"

cd "$APP_DIR"

echo "Installing dependencies"
npm ci

echo "Generating Prisma client"
npx prisma generate

echo "Applying migrations"
npx prisma migrate deploy || true

echo "Building Next.js app"
npm run build

echo "Restarting app"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart restaurant || pm2 start npm --name restaurant -- start
  pm2 save || true
elif command -v docker >/dev/null 2>&1 && [ -f docker-compose.yml ]; then
  docker compose up -d --build
else
  echo "No PM2 or Docker Compose found. Start manually with: npm start" >&2
fi

echo "Done"
