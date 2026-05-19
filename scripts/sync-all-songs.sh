#!/bin/bash

# 1. Get the absolute path of the directory containing THIS script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define the array across multiple lines
song_ids=(
    "Armed_Forces_Medley_72"
    "God_Bless_America"
    "God_Bless_America-G_Major"
    "Stars_and_Stripes_Forever"
    "Star_Spangled_Banner"
)

# Loop through each element in the array
for id in "${song_ids[@]}"; do
    echo "Processing Song ID: $id"
    $SCRIPT_DIR/sync-song.sh "$id"
done

echo "All songs processed."