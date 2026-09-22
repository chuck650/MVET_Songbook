#!/usr/bin/env bash
# Forwarding runner to agent skill script
exec bash "$(dirname "$0")/../.agents/skills/song-catalog-management/scripts/sync-all-songs.sh" "$@"