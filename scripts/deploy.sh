#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Deploying roulette from $ROOT"

# Build client
echo "-> Building client"
cd "$ROOT/client"
npm ci
npm run build

# Build server
echo "-> Building server"
cd "$ROOT/server"
npm ci
npm run build

# Start or reload with pm2
echo "-> Starting application with pm2"
PM2_CMD="$(command -v pm2 || true)"
if [ -z "$PM2_CMD" ]; then
  echo "pm2 not found. Install it globally: npm i -g pm2"
  exit 1
fi

if [ -f "$ROOT/ecosystem.config.js" ]; then
  pm2 startOrReload "$ROOT/ecosystem.config.js" --env production
else
  pm2 start --name roulette --cwd "$ROOT/server" node dist/index.js --update-env --time
fi

echo "Deployment finished. Use 'pm2 status' to check the process." 
