# Change Proposal: Repertoire Archival & Visibility Controls

## Why
Choral performance repertoire frequently includes songs arranged for a single performance or past concert cycle. Currently, all songs placed in `public/songs/` are displayed by default, cluttering the library for singers and forcing unnecessary asset downloads, while deleting them risks losing server-side rehearsal files. This change introduces non-destructive archival, allowing retired music to remain preserved on the server and easily retrieved when needed.

## What Changes
- **Catalog Schema & Manifest**: Add optional `archived: boolean` flag to `song.json` sidecars and `public/songs.json`.
- **API Visibility Filtering**:
  - `GET /api/v1/songs` defaults to returning only active (`archived !== true`) songs.
  - `GET /api/v1/songs?include_archived=true` exposes both active and archived repertoire.
- **Admin Archival Endpoints**:
  - `POST /api/v1/songs/:id/archive`: Flags a song as archived in the catalog.
  - `POST /api/v1/songs/:id/restore`: Restores an archived song to active status.
  - Guarded by a dedicated `ADMIN_PSK` header to prevent general choir members from altering the catalog.
- **PWA Rehearsal Library View**:
  - Add a toggle in the Settings Drawer / Library Header: *"Show Past Performance Archive"* (default: OFF).
  - When enabled, archived songs appear with an *"Archived"* badge and can be rehearsed normally.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `catalog`: Add requirements for `archived` metadata field handling in manifest generation and catalog endpoints.
- `auth`: Add requirements for `ADMIN_PSK` administrative authorization on catalog state modification routes.

## Impact
- **Backend API**: `api/src/index.ts`, `api/src/types.ts`, `api/src/openapi.ts`.
- **Manifest Tooling**: `scripts/generate-manifest.cjs`.
- **Frontend Client**: `src/types/songbook.ts`, `src/songbook/App.tsx`, `src/songbook/SettingsView.tsx`, `src/songbook/Songbook.css`.
- **Secrets & Deployment**: `.env.secrets`, Kubernetes secret `mvet-auth-secrets` to store optional `ADMIN_PSK`.
