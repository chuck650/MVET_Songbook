#!/usr/bin/env bash
set -euo pipefail

# MVET Songbook - Local API Deployment
# Deploys the Express API gateway to the local development cluster (k3s-local)

WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAMESPACE="mvet-songbook"
KUBECTL_CONTEXT="k3s-local"

# Safety Check: Verify the target context exists in kubectl config
if ! kubectl config get-contexts | grep -q "${KUBECTL_CONTEXT}"; then
  echo "❌ Error: Target context '${KUBECTL_CONTEXT}' not found in kubectl config!"
  exit 1
fi

echo "🔑 Creating local testing secrets in namespace '${NAMESPACE}' on context '${KUBECTL_CONTEXT}'..."
kubectl --context "$KUBECTL_CONTEXT" create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl --context "$KUBECTL_CONTEXT" apply -f -

if [ ! -f "${WORKSPACE_DIR}/.env.secrets" ]; then
  echo "❌ Error: .env.secrets file not found in root workspace directory!"
  exit 1
fi

kubectl --context "$KUBECTL_CONTEXT" create secret generic mvet-auth-secrets \
  --namespace "$NAMESPACE" \
  --from-env-file="${WORKSPACE_DIR}/.env.secrets" \
  --dry-run=client -o yaml | kubectl --context "$KUBECTL_CONTEXT" apply -f -

echo "🚀 Applying api-deployment and ingress-local to cluster on context '${KUBECTL_CONTEXT}'..."
kubectl --context "$KUBECTL_CONTEXT" apply -f "${WORKSPACE_DIR}/k8s/api-deployment.yaml"
kubectl --context "$KUBECTL_CONTEXT" apply -f "${WORKSPACE_DIR}/k8s/ingress-local.yaml"

echo "⏳ Waiting for API Pod to be ready..."
kubectl --context "$KUBECTL_CONTEXT" wait --namespace "$NAMESPACE" \
  --for=condition=ready pod \
  --selector=app=mvet-api \
  --timeout=60s

echo "✅ Local API Deployment Complete!"
echo "🌐 API is now reachable at http://mvet-api.test/api"
echo "📚 Swagger documentation available at http://mvet-api.test/docs"
