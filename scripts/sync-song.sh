#!/bin/bash

# MVET Songbook - Asset Sync Script
# Syncs a song from local Music project to web project

# SONG="Star_Spangled_Banner"

if [ "$#" -eq 0 ]; then
    echo "Error: Song ID is missing." >&2
    exit 1
fi

SONG="$1"

# Define paths (using quotes to handle spaces)
SOURCE_DIR="$HOME/Projects/Music/MVET/${SONG}/"
DEST_DIR="$HOME/Projects/www/MVET_Songbook/public/songs/${SONG}/"

echo "🔄 Syncing $SONG assets..."

# Check if source exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Error: Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Run the rsync command
rsync -av --delete \
  --include="${SONG}-SATB.pdf" \
  --include="*.mscz" \
  --include="*.mxl" \
  --include="*.mp3" \
  --include="*.mp4" \
  --include="*.flac" \
  --exclude="*.pdf" \
  --exclude="*" \
  "$SOURCE_DIR" \
  "$DEST_DIR"

echo "Detecting merged AV..."

if [ -f "${DEST_DIR}/${SONG}-Merged.mp4" ]; then
    echo "✅ Found Merged AV: ${SONG}-Merged.mp4"
fi

# Replace main and SATB MP4 files with merged MP4 file
if [ -f "${DEST_DIR}/${SONG}-Merged.mp4" ]; then
    echo "✅ Found Merged AV: ${SONG}-Merged.mp4"
    rm "${DEST_DIR}/${SONG}.mp4"
    rm "${DEST_DIR}/${SONG}-SATB.mp4"
    mv "${DEST_DIR}/${SONG}-Merged.mp4" "${DEST_DIR}/${SONG}.mp4"
    echo "✅ Renamed Merged AV: ${SONG}.mp4"
fi

echo "✅ Sync complete. Run 'npm run build' to update the manifest and hashes."
