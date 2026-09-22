#!/usr/bin/env bash
set -euo pipefail

# MVET Songbook - K3s Local Certificate Health & Refresh Helper
# Inspects and refreshes expired k3s-local credentials in ~/.kube/config

CHECK_ONLY=false
if [[ "${1:-}" == "--check-only" ]]; then
  CHECK_ONLY=true
fi

KUBECONFIG_PATH="${HOME}/.kube/config"
K3S_YAML="/etc/rancher/k3s/k3s.yaml"

if [[ ! -f "$KUBECONFIG_PATH" ]]; then
  echo "❌ Error: $KUBECONFIG_PATH does not exist."
  exit 1
fi

echo "🔍 Inspecting k3s-local client certificate in $KUBECONFIG_PATH..."

CLIENT_CERT_B64=$(kubectl config view --raw -o jsonpath='{.users[?(@.name=="default")].user.client-certificate-data}' 2>/dev/null || true)

if [[ -z "$CLIENT_CERT_B64" ]]; then
  echo "⚠️  No client-certificate-data found for user 'default' in $KUBECONFIG_PATH."
  exit 1
fi

CERT_TEXT=$(echo "$CLIENT_CERT_B64" | base64 -d | openssl x509 -noout -dates 2>/dev/null || true)
if [[ -z "$CERT_TEXT" ]]; then
  echo "❌ Failed to parse client certificate with openssl."
  exit 1
fi

NOT_AFTER=$(echo "$CERT_TEXT" | grep 'notAfter=' | cut -d= -f2)
NOT_AFTER_EPOCH=$(date -d "$NOT_AFTER" +%s)
NOW_EPOCH=$(date +%s)

DAYS_LEFT=$(( (NOT_AFTER_EPOCH - NOW_EPOCH) / 86400 ))

echo "📅 Certificate Expiration Date: $NOT_AFTER"
echo "⏳ Days Remaining: $DAYS_LEFT day(s)"

if [[ "$DAYS_LEFT" -gt 7 ]]; then
  echo "✅ k3s-local client certificate is healthy and valid for $DAYS_LEFT more day(s)."
  if [[ "$CHECK_ONLY" == "true" ]]; then
    exit 0
  fi
  exit 0
fi

if [[ "$DAYS_LEFT" -le 0 ]]; then
  echo "🚨 k3s-local client certificate has EXPIRED!"
else
  echo "⚠️  k3s-local client certificate will expire in less than 7 days!"
fi

if [[ "$CHECK_ONLY" == "true" ]]; then
  echo "ℹ️  Run 'bash scripts/refresh-k3s-certs.sh' without --check-only to refresh credentials."
  exit 1
fi

if [[ ! -f "$K3S_YAML" ]]; then
  echo "❌ Cannot refresh: $K3S_YAML not found. Is K3s installed locally?"
  exit 1
fi

echo "🔄 Refreshing k3s-local credentials from $K3S_YAML..."
BACKUP_PATH="${KUBECONFIG_PATH}.backup-$(date +%Y%m%d%H%M%S)"
cp "$KUBECONFIG_PATH" "$BACKUP_PATH"
echo "💾 Backed up existing kubeconfig to $BACKUP_PATH"

sudo python3 -c '
import yaml, os, subprocess

with open("/etc/rancher/k3s/k3s.yaml", "r") as f:
    k3s_cfg = yaml.safe_load(f)

k3s_ca = k3s_cfg["clusters"][0]["cluster"]["certificate-authority-data"]
k3s_client_cert = k3s_cfg["users"][0]["user"]["client-certificate-data"]
k3s_client_key = k3s_cfg["users"][0]["user"]["client-key-data"]

home_cfg_path = os.path.expanduser("~/.kube/config")
with open(home_cfg_path, "r") as f:
    home_cfg = yaml.safe_load(f)

for c in home_cfg.get("clusters", []):
    if c.get("name") == "default":
        c["cluster"]["certificate-authority-data"] = k3s_ca

for u in home_cfg.get("users", []):
    if u.get("name") == "default":
        u["user"]["client-certificate-data"] = k3s_client_cert
        u["user"]["client-key-data"] = k3s_client_key

with open(home_cfg_path, "w") as f:
    yaml.safe_dump(home_cfg, f)

current_uid = os.getuid()
current_gid = os.getgid()
os.chown(home_cfg_path, current_uid, current_gid)
'

echo "✅ Successfully refreshed k3s-local credentials!"
echo "🧪 Verifying connectivity to local cluster..."
kubectl --context k3s-local get nodes
echo "🎉 Local k3s cluster is fully reachable and verified!"
