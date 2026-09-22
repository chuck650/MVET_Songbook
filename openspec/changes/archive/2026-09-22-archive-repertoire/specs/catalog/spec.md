## ADDED Requirements

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
