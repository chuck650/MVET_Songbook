#!/usr/bin/env bash
set -euo pipefail

# MVET Songbook - Push Songbook Files to API Volume
# Usage:
#   npm run push-songbook          (Defaults to local k3s volume)
#   npm run push-songbook local    (Local k3s volume sync)
#   npm run push-songbook prod     (Production cluster pod sync)

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
  echo "🚀 Target: Production Cluster (vps-production)"
  
  NAMESPACE="vps-production"
  SELECTOR="app=mvet-api"
  KUBECTL_CONTEXT="vps-production"
  
  echo "🔍 Locating active API pod in namespace '${NAMESPACE}' on context '${KUBECTL_CONTEXT}'..."
  PODS=$(kubectl --context "$KUBECTL_CONTEXT" get pods -n "$NAMESPACE" -l "$SELECTOR" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || true)
  
  if [ -z "$PODS" ]; then
    echo "❌ Error: No running pods found with selector '${SELECTOR}' in namespace '${NAMESPACE}' on context '${KUBECTL_CONTEXT}'!"
    echo "Please ensure the production API is deployed and running."
    exit 1
  fi
  
  # Get the first pod
  read -ra POD_ARRAY <<< "$PODS"
  POD_NAME="${POD_ARRAY[0]}"
  echo "✅ Found active pod: $POD_NAME"
  
  echo "📁 Copying songs.json to pod /app/data/songs.json..."
  kubectl --context "$KUBECTL_CONTEXT" cp "${WORKSPACE_DIR}/public/songs.json" "${NAMESPACE}/${POD_NAME}:/app/data/songs.json"
  
  echo "📁 Copying songs/ directory to pod /app/data/songs/..."
  kubectl --context "$KUBECTL_CONTEXT" cp "${WORKSPACE_DIR}/public/songs" "${NAMESPACE}/${POD_NAME}:/app/data/"
  
  echo "✅ Successfully synced songbook files to production cluster pod!"
else
  echo "❌ Error: Unknown target '$TARGET'. Use 'local' or 'prod'."
  exit 1
fi
