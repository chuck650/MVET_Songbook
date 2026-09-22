#!/usr/bin/env bash
set -euo pipefail

# MVET Songbook - VPS Production Certificate Health & Refresh Helper
# Inspects and refreshes expired vps-production credentials in ~/.kube/config

CHECK_ONLY=false
if [[ "${1:-}" == "--check-only" ]]; then
  CHECK_ONLY=true
fi

KUBECONFIG_PATH="${HOME}/.kube/config"
SSH_HOST="vps"

if [[ ! -f "$KUBECONFIG_PATH" ]]; then
  echo "❌ Error: $KUBECONFIG_PATH does not exist."
  exit 1
fi

echo "🔍 Inspecting vps-production client certificate in $KUBECONFIG_PATH..."

CLIENT_CERT_B64=$(kubectl config view --raw -o jsonpath='{.users[?(@.name=="vps-admin")].user.client-certificate-data}' 2>/dev/null || true)

if [[ -z "$CLIENT_CERT_B64" ]]; then
  echo "⚠️  No client-certificate-data found for user 'vps-admin' in $KUBECONFIG_PATH."
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
  echo "✅ vps-production client certificate is healthy and valid for $DAYS_LEFT more day(s)."
  exit 0
fi

if [[ "$DAYS_LEFT" -le 0 ]]; then
  echo "🚨 vps-production client certificate has EXPIRED!"
else
  echo "⚠️  vps-production client certificate will expire in less than 7 days!"
fi

if [[ "$CHECK_ONLY" == "true" ]]; then
  echo "ℹ️  Run 'bash .agents/skills/local-testing-and-deployment/scripts/refresh-vps-certs.sh' without --check-only to refresh credentials."
  exit 1
fi

echo "🔄 Fetching active K3s credentials from ${SSH_HOST}..."

# Retrieve remote k3s.yaml via SSH
REMOTE_YAML=$(ssh "$SSH_HOST" "sudo cat /etc/rancher/k3s/k3s.yaml")
if [[ -z "$REMOTE_YAML" ]]; then
  echo "❌ Failed to retrieve k3s.yaml from $SSH_HOST"
  exit 1
fi

BACKUP_PATH="${KUBECONFIG_PATH}.backup-vps-$(date +%Y%m%d%H%M%S)"
cp "$KUBECONFIG_PATH" "$BACKUP_PATH"
echo "💾 Backed up existing kubeconfig to $BACKUP_PATH"

python3 - <<PYEOF
import yaml, os

remote_raw = """$REMOTE_YAML"""
k3s_cfg = yaml.safe_load(remote_raw)

k3s_ca = k3s_cfg["clusters"][0]["cluster"]["certificate-authority-data"]
k3s_client_cert = k3s_cfg["users"][0]["user"]["client-certificate-data"]
k3s_client_key = k3s_cfg["users"][0]["user"]["client-key-data"]

home_cfg_path = os.path.expanduser("~/.kube/config")
with open(home_cfg_path, "r") as f:
    home_cfg = yaml.safe_load(f)

# Update vps-production cluster certificate-authority-data
for c in home_cfg.get("clusters", []):
    if c.get("name") == "vps-production":
        c["cluster"]["certificate-authority-data"] = k3s_ca

# Update vps-admin user client-certificate-data and client-key-data
for u in home_cfg.get("users", []):
    if u.get("name") == "vps-admin":
        u["user"]["client-certificate-data"] = k3s_client_cert
        u["user"]["client-key-data"] = k3s_client_key

with open(home_cfg_path, "w") as f:
    yaml.safe_dump(home_cfg, f)

print("✅ Updated vps-admin credentials in ~/.kube/config")
PYEOF

echo "🔍 Verifying access to vps-production..."
if kubectl --context vps-production get nodes; then
  echo "🎉 vps-production certificate refresh successful!"
else
  echo "⚠️ Credentials updated, but connection check returned non-zero."
fi
