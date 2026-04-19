#!/bin/bash
# Deploy JustPlanner to production server
# Usage: ./deploy.sh

set -e

SERVER="root@5.35.94.142"
REMOTE_PATH="/var/www/justplanner"

echo "🚀 Deploying JustPlanner..."

# Sync files (excluding node_modules and .git)
echo "📦 Syncing files to server..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude 'google-credentials.json' \
  -e ssh \
  /Users/maximfedorov/dev/justplanner/ \
  $SERVER:$REMOTE_PATH/

# Build and restart on server
echo "🔨 Building on server..."
ssh $SERVER "cd $REMOTE_PATH && npm install && npm run build"

echo "🔄 Restarting backend..."
ssh $SERVER "cd $REMOTE_PATH/server && npm install && pm2 restart justplanner-api"

echo ""
echo "✅ Deploy complete!"
echo "🌐 Open: https://justplanner.ru"
