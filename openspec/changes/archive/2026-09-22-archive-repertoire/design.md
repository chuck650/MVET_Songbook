# Design: Repertoire Archival & Visibility Controls

## Context
Choral performance libraries evolve over time. Retired songs (such as one-off ceremony arrangements) should not clutter the active singer view, but deleting them risks losing server-side rehearsal assets. We need a two-tier approach:
1. **Metadata & Manifest Tier**: Mark songs with `archived: true` so the static PWA and API can filter them out by default while preserving files in `/var/data/mvet-songbook/` and version control.
2. **API & Admin Control Tier**: Allow administrators to toggle song archive status via authenticated REST endpoints (`/api/v1/songs/:id/archive`) using an `ADMIN_PSK`.

## Goals / Non-Goals

**Goals:**
- Allow non-destructive archiving of songs without deleting files from the filesystem or K3s/VPS volumes.
- Exclude archived songs by default from the primary PWA library view and default API catalog response.
- Provide a query parameter (`GET /api/v1/songs?include_archived=true`) to fetch the complete catalog.
- Add an *"Include Archived Performances"* toggle in the PWA Settings Drawer to view past repertoire.
- Add secure administrative REST endpoints (`POST /api/v1/songs/:id/archive` and `POST /api/v1/songs/:id/restore`) guarded by `ADMIN_PSK`.

**Non-Goals:**
- Moving files between physical directories on the server during runtime (moving files would complicate Git tracking and volume sync).
- Allowing general choir members (standard PSK holders) to alter catalog visibility.

## Decisions

### Decision 1: In-Place Archival Flag (`archived: boolean`)
Instead of physically moving files to an archive directory, we preserve the files in place in `/public/songs/<SongID>/` and add `"archived": true` in `song.json` (or `metadata.json`) and the generated `songs.json`.
* *Rationale*: Keeps media paths stable, prevents broken links, and allows instantaneous restoration without copying large audio/video files.
* *Alternatives Considered*: Moving folders to `public/songs-archive/`. Rejected because it would break client deep links and require re-syncing gigabytes of data.

### Decision 2: Admin-Key Authorization Header for Mutating Endpoints
Introduce an `ADMIN_PSK` environment variable. Mutating routes require `x-admin-key: <ADMIN_PSK>` or `Authorization: Bearer <admin-jwt>`.
* *Rationale*: Protects the songbook from unintended modifications by choir members who have the general rehearsal PSK.
* *Alternatives Considered*: Single shared PSK. Rejected because any choir member could archive songs.

### Decision 3: PWA Settings Drawer Toggle
Add a switch in the Settings Drawer: *"Include Archived Performances"*.
* *Rationale*: Keeps the primary library clean by default while giving users instant access to past repertoire with an "Archived" badge when needed.

## Risks / Trade-offs

- **[Risk]** API volume `songs.json` diverges from Git working tree if modified via API.
  - *Mitigation*: The archive/restore endpoints update the server's `songs.json` file in `DATA_DIR` immediately. When a developer runs `npm run push-songbook`, the local source-of-truth remains in `public/songs/<SongID>/song.json`.

- **[Risk]** Workbox caching archived files.
  - *Mitigation*: Since archived songs are excluded from the default catalog, the PWA will not precache or fetch their assets unless the user explicitly enables the archive toggle.
