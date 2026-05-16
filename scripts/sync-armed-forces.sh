#!/bin/bash

# MVET Songbook - Asset Sync Script
# Syncs Armed Forces Medley from local Music project to web project

# Define paths (using quotes to handle spaces)
SOURCE_DIR="$HOME/Projects/Music/Armed Forces Medley/"
DEST_DIR="$HOME/Projects/www/MVET_Songbook/public/songs/Armed_Forces_Medley_72/"

echo "🔄 Syncing Armed Forces Medley assets..."

# Check if source exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Error: Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Run the rsync command
rsync -av --delete \
  --include="Armed_Forces_Medley_72-SATB.pdf" \
  --include="*.mscz" \
  --include="*.mxl" \
  --include="*.mp4" \
  --include="*.flac" \
  --exclude="*.pdf" \
  --exclude="*" \
  "$SOURCE_DIR" \
  "$DEST_DIR"

echo "✅ Sync complete. Run 'npm run build' to update the manifest and hashes."
