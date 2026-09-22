# Song Catalog & Asset Ingestion Specification

## Purpose
Specifies the structure of the song catalog manifest (`songs.json`), SHA-256 integrity checksum calculation, thumbnail generation, and asset synchronization from the MuseScore production repository.
## Requirements
### Requirement: Asset Structure & Ingestion Standard
The system SHALL ingest choral song packages from the upstream Music repository conforming to standard naming conventions.

#### Scenario: Multi-Format Asset Discovery
- **GIVEN** an ingestion run via `scripts/sync-song.sh <SongID>`
- **WHEN** source assets are copied to `public/songs/<SongID>/`
- **THEN** the script MUST include SATB PDF scores, MusicXML (`.mxl`), MuseScore (`.mscz`), audio (`.flac`, `.mp3`), and video (`.mp4`) while excluding `*(Master)*` files

#### Scenario: Merged Video Normalization
- **GIVEN** a song containing a direct-stream-copied video (`<Song>-Merged.mp4`)
- **WHEN** ingestion finishes
- **THEN** the script MUST replace the primary video file with the merged video stream to ensure synchronous audio-visual alignment

### Requirement: Manifest Generation & Hash Integrity
The system SHALL generate a comprehensive catalog manifest with SHA-256 content hashes.

#### Scenario: Deterministic Manifest Creation
- **GIVEN** updated song files in `public/songs/`
- **WHEN** running `node scripts/generate-manifest.cjs`
- **THEN** the generator SHALL inspect parts, extract metadata (title, arranger, engraver, key, copyright), compute cryptographic hashes, and output `public/songs.json`

#### Scenario: Cache Busting via Hash Parameter
- **GIVEN** an authenticated client downloading or rendering score files
- **WHEN** constructing file request URLs
- **THEN** the client MUST append `?v=<hash>` based on the manifest's calculated hash to guarantee deterministic cache invalidation upon asset updates

### Requirement: Repertoire Archival Status
The system SHALL support marking songs as archived to hide them from the default catalog view without removing files from the filesystem.

#### Scenario: Default Active Catalog Delivery
- **GIVEN** a catalog containing both active and archived songs
- **WHEN** client requests `GET /api/v1/songs` without query parameters
- **THEN** the API SHALL filter out archived songs and return only active songs

#### Scenario: Full Catalog Delivery with Archives Included
- **GIVEN** client requests `GET /api/v1/songs?include_archived=true`
- **WHEN** the request is processed
- **THEN** the API SHALL return all songs, flagging archived items with `archived: true`

#### Scenario: Manifest Generator Archival Support
- **GIVEN** a song directory with `archived: true` in `song.json` or `metadata.json`
- **WHEN** `node scripts/generate-manifest.cjs` runs
- **THEN** the generator SHALL include `"archived": true` in the output record in `songs.json`

