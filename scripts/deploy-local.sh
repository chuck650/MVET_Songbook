#!/usr/bin/env bash
set -euo pipefail

echo "📂 Setting up local volume directory at /var/data/mvet-songbook/..."
sudo mkdir -p /var/data/mvet-songbook
sudo chown -R chuck:chuck /var/data/mvet-songbook

echo "📁 Syncing local songs and songs.json into k3s volume..."
rsync -av --delete public/songs.json /var/data/mvet-songbook/songs.json
rsync -av --delete public/songs/ /var/data/mvet-songbook/songs/

echo "🔑 Creating local testing secrets in Kubernetes (mvet-songbook namespace)..."
kubectl create namespace mvet-songbook --dry-run=client -o yaml | kubectl apply -f -

if [ ! -f .env.secrets ]; then
  echo "❌ Error: .env.secrets file not found in root workspace directory!"
  exit 1
fi

kubectl create secret generic mvet-auth-secrets \
  --namespace mvet-songbook \
  --from-env-file=.env.secrets \
  --dry-run=client -o yaml | kubectl apply -f -

echo "🚀 Applying api-deployment and ingress-local to cluster..."
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/ingress-local.yaml

echo "⏳ Waiting for API Pod to be ready..."
kubectl wait --namespace mvet-songbook \
  --for=condition=ready pod \
  --selector=app=mvet-api \
  --timeout=60s

echo "✅ Local API Deployment Complete!"
echo "🌐 API is now reachable at http://mvet-api.test/api"
echo "📚 Swagger documentation available at http://mvet-api.test/docs"
