#!/usr/bin/env bash
set -euo pipefail

# MVET Songbook - Push Songbook Files to API Volume
# Usage:
#   npm run push-songbook          (Defaults to local k3s volume)
#   npm run push-songbook local    (Local k3s volume sync)
#   npm run push-songbook prod     (Production cluster volume sync over SSH rsync)

TARGET="${1:-local}"
WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🔄 Running generate-manifest to build fresh songs.json and extract any new thumbnails..."
node "${WORKSPACE_DIR}/scripts/generate-manifest.cjs"

if [ "$TARGET" = "local" ]; then
  echo "📂 Target: Local Development (k3s-local)"
  echo "📂 Checking local volume directory /var/data/mvet-songbook/..."
  if [ ! -d "/var/data/mvet-songbook" ]; then
    echo "⚠️  Volume directory /var/data/mvet-songbook does not exist. Creating..."
    sudo mkdir -p /var/data/mvet-songbook
    sudo chown -R "$(whoami)":"$(whoami)" /var/data/mvet-songbook
  fi

  echo "📁 Syncing local songs.json to local K3s volume..."
  rsync -av --delete "${WORKSPACE_DIR}/public/songs.json" "/var/data/mvet-songbook/songs.json"

  echo "📁 Syncing local songs/ directory to local K3s volume..."
  rsync -av --delete "${WORKSPACE_DIR}/public/songs/" "/var/data/mvet-songbook/songs/"

  echo "✅ Successfully synced songbook files to local K3s volume!"

elif [ "$TARGET" = "prod" ] || [ "$TARGET" = "production" ]; then
  echo "🚀 Target: Production VPS Volume (vps-production)"
  
  SSH_HOST="vps"
  REMOTE_DIR="/var/data/mvet-songbook"
  
  echo "🔍 Ensuring remote volume directory '${REMOTE_DIR}' exists on '${SSH_HOST}'..."
  ssh "$SSH_HOST" "sudo mkdir -p ${REMOTE_DIR} && sudo chown -R \$(whoami):\$(whoami) ${REMOTE_DIR}"
  
  echo "📁 Syncing local songs.json to production volume over SSH..."
  rsync -avz --delete "${WORKSPACE_DIR}/public/songs.json" "${SSH_HOST}:${REMOTE_DIR}/songs.json"
  
  echo "📁 Syncing local songs/ directory to production volume over SSH..."
  rsync -avz --delete "${WORKSPACE_DIR}/public/songs/" "${SSH_HOST}:${REMOTE_DIR}/songs/"
  
  echo "✅ Successfully synced songbook files to production cluster volume over SSH!"
else
  echo "❌ Error: Unknown target '$TARGET'. Use 'local' or 'prod'."
  exit 1
fi
