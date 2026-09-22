#!/usr/bin/env bash
# Forwarding runner to agent skill script
exec bash "$(dirname "$0")/../.agents/skills/local-testing-and-deployment/scripts/deploy-prod-api.sh" "$@"
