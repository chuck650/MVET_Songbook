# Proposal: Administrative Role Claims and In-App Archival Controls

## Why
Currently, managing song archival status requires manual terminal execution or API tool scripts passing `x-admin-key`. Choir members and administrators both log in via the single PSK input in the PWA Settings, but the system does not recognize the administrator role in the frontend or grant in-app controls to archive or restore songs directly from song cards.

## What Changes
1. **Unified Authentication**:
   - `POST /api/v1/auth/token` accepts either a Member PSK (`ACTIVE_PSKS`) or the Admin PSK (`ADMIN_PSK`).
   - If authenticated via `ADMIN_PSK`, the issued JWT includes claim `{ role: 'admin' }`.
   - `POST /api/v1/songs/:id/archive` and `restore` accept either `Authorization: Bearer <admin-jwt>` OR the legacy `x-admin-key` header.
2. **PWA Client Role Recognition**:
   - `useSongbookAuth` and `AuthContext` decode the JWT token to expose `role: 'member' | 'admin'` and `isAdmin: boolean`.
   - Settings view displays `🛡️ Access Granted (Administrator)` when an administrator key is used.
3. **In-App Song Card Archival Controls**:
   - When `isAdmin === true`, song cards render administrative controls:
     - On active songs: an **Archive** button.
     - On archived songs (when shown): a **Restore** button.
   - User confirmation prevents accidental taps during rehearsals.
   - State updates in place and refreshes the catalog.

## Capabilities

### New Capabilities
- `admin-jwt-auth`: Allows administrators to authenticate via the existing PSK login input, receiving an `admin` role claim in the JWT.
- `in-app-repertoire-controls`: Allows authenticated administrators to archive and restore songs directly within the web app UI.

## Impact
- Non-breaking backwards compatibility: `x-admin-key` remains valid for automated scripts.
- General choir members experience zero UI changes unless logged in with the administrator key.
