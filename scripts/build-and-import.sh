#!/usr/bin/env bash
set -euo pipefail

echo "🐳 Building Docker image locally..."
sudo docker build -t mvet-songbook-api:latest api/

echo "📦 Exporting image to tarball..."
sudo docker save mvet-songbook-api:latest -o /tmp/mvet-songbook-api.tar

echo "📥 Importing image to k3s containerd (k8s.io namespace)..."
sudo k3s ctr -n k8s.io images import /tmp/mvet-songbook-api.tar

echo "🧹 Cleaning up tarball..."
sudo rm /tmp/mvet-songbook-api.tar

echo "✅ Image successfully loaded into k3s containerd!"
