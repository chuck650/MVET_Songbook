#!/usr/bin/env bash
set -euo pipefail

# MVET Songbook - VPS Traffic Redirect Preflight Check
# Ensures that local 'vps' SSH tunnel and firewalld redirect rules are INACTIVE
# before executing production deployments or testing against https://mvet-api.cminfosec.com.

AUTO_DISCONNECT=false
for arg in "$@"; do
  case "$arg" in
    --auto-disconnect|--fix|-f)
      AUTO_DISCONNECT=true
      ;;
    -h|--help)
      echo "Usage: $(basename "$0") [--auto-disconnect]"
      echo "Checks if the local VPS SSH forwarding / firewalld redirect is active."
      echo "Exits with 0 if inactive, or exits with 1 if active (unless --auto-disconnect is used)."
      exit 0
      ;;
  esac
done

# Locate the 'vps' command
VPS_CMD=""
if command -v vps >/dev/null 2>&1; then
  VPS_CMD="vps"
elif [ -x "${HOME}/.local/bin/vps" ]; then
  VPS_CMD="${HOME}/.local/bin/vps"
fi

IS_ACTIVE=false
REASON=""

if [ -n "$VPS_CMD" ]; then
  STATUS_OUTPUT=$("$VPS_CMD" status 2>&1 || true)
  if echo "$STATUS_OUTPUT" | grep -q "SSH Tunnel.*: ACTIVE"; then
    IS_ACTIVE=true
    REASON="SSH Tunnel on localhost:4443 is ACTIVE"
  fi
  if echo "$STATUS_OUTPUT" | grep -q "Firewall Redirect Rule: ACTIVE"; then
    IS_ACTIVE=true
    if [ -n "$REASON" ]; then
      REASON="${REASON} and Firewall Redirect Rule is ACTIVE"
    else
      REASON="Firewall Redirect Rule is ACTIVE"
    fi
  fi
else
  # Direct fallback check if 'vps' utility is not found
  if sudo firewall-cmd --direct --query-rule ipv4 nat OUTPUT 0 -d "83.229.67.95" -p tcp --dport 443 -j REDIRECT --to-ports 4443 >/dev/null 2>&1; then
    IS_ACTIVE=true
    REASON="firewalld NAT redirect rule to 83.229.67.95:443 is ACTIVE"
  elif ss -tulnp 2>/dev/null | grep -qw "4443"; then
    IS_ACTIVE=true
    REASON="Port 4443 SSH forward listener is active"
  fi
fi

if [ "$IS_ACTIVE" = "true" ]; then
  echo "⚠️  [WARNING] VPS Traffic Redirect detected: ${REASON}."
  
  if [ "$AUTO_DISCONNECT" = "true" ]; then
    echo "🔄 Attempting automatic disconnect via '$VPS_CMD disconnect'..."
    if [ -n "$VPS_CMD" ]; then
      "$VPS_CMD" disconnect
    else
      sudo firewall-cmd --direct --remove-rule ipv4 nat OUTPUT 0 -d "83.229.67.95" -p tcp --dport 443 -j REDIRECT --to-ports 4443 >/dev/null 2>&1 || true
    fi
    echo "✅ Successfully disconnected VPS redirect."
    exit 0
  else
    echo "❌ [BLOCK] Production deployment or testing cannot proceed while the VPS redirect is active."
    echo "   The redirect interferes with public WAN traffic to https://mvet-api.cminfosec.com."
    echo ""
    echo "   To resolve, run in your terminal:"
    echo "       vps disconnect"
    echo ""
    echo "   Or rerun this command with --auto-disconnect (or --fix)."
    exit 1
  fi
else
  echo "✅ VPS traffic redirect is INACTIVE (normal direct connectivity to VPS)."
  exit 0
fi
