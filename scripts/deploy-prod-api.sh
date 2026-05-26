#!/usr/bin/env bash
set -euo pipefail

# MVET Songbook - Production API Deployment
# Deploys the Express API gateway from GHCR to the production cluster (vps-production)

WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAMESPACE="mvet-songbook"
KUBECTL_CONTEXT="vps-production"

echo "📁 Creating production namespace '${NAMESPACE}' on context '${KUBECTL_CONTEXT}'..."
kubectl --context "$KUBECTL_CONTEXT" create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl --context "$KUBECTL_CONTEXT" apply -f -

echo "🔑 Creating production secrets in namespace '${NAMESPACE}' on context '${KUBECTL_CONTEXT}'..."
if [ ! -f "${WORKSPACE_DIR}/.env.secrets" ]; then
  echo "❌ Error: .env.secrets file not found in root workspace directory!"
  exit 1
fi

kubectl --context "$KUBECTL_CONTEXT" create secret generic mvet-auth-secrets \
  --namespace "$NAMESPACE" \
  --from-env-file="${WORKSPACE_DIR}/.env.secrets" \
  --dry-run=client -o yaml | kubectl --context "$KUBECTL_CONTEXT" apply -f -

echo "🚀 Applying deployment and services to '${NAMESPACE}' namespace on context '${KUBECTL_CONTEXT}'..."
kubectl --context "$KUBECTL_CONTEXT" apply -f "${WORKSPACE_DIR}/k8s/api-deployment-prod.yaml"

echo "🌐 Applying ingress routing rules to '${NAMESPACE}' namespace on context '${KUBECTL_CONTEXT}'..."
kubectl --context "$KUBECTL_CONTEXT" apply -f "${WORKSPACE_DIR}/k8s/ingress-prod.yaml"

echo "⏳ Waiting for Production API Pod to be ready on context '${KUBECTL_CONTEXT}'..."
kubectl --context "$KUBECTL_CONTEXT" wait --namespace "$NAMESPACE" \
  --for=condition=ready pod \
  --selector=app=mvet-api \
  --timeout=60s

echo "✅ Production API Deployment Complete on context '${KUBECTL_CONTEXT}'!"
