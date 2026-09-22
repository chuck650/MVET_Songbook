# Design: Administrative Role Claims and In-App Archival Controls

## Context
Repertoire archiving allows retiring past performance arrangements from the default songbook display without deleting any assets. The API endpoints `/api/v1/songs/:id/archive` and `/restore` currently require an `x-admin-key` header matching `ADMIN_PSK`. Singers and administrators use the same browser interface. We need to allow an administrator to log into the web app using the admin PSK and perform catalog archiving directly from the UI.

## Goals
- Allow single-point login in the existing Settings view for both members and administrators.
- Issue JWTs containing `role: 'admin'` when the submitted PSK matches `ADMIN_PSK`.
- Authorize `/archive` and `/restore` via either Bearer JWT with `role: 'admin'` OR `x-admin-key`.
- Expose `isAdmin: boolean` in React `AuthContext`.
- Render Archive / Restore action buttons on Song Cards when `isAdmin` is active.

## Non-Goals
- Multi-user RBAC database: authentication remains stateless PSK-based.
- Creating a separate admin portal or URL path.

## Decisions

### Decision 1: Role in JWT Payload
The `JWTPayload` interface is updated to:
```typescript
export interface JWTPayload {
  authorized: boolean;
  role?: 'member' | 'admin';
  iat?: number;
  exp?: number;
}
```
When `POST /api/v1/auth/token` receives a PSK:
- If it matches `ADMIN_PSK`, generate JWT with `{ authorized: true, role: 'admin' }`.
- If it matches `ACTIVE_PSKS`, generate JWT with `{ authorized: true, role: 'member' }`.

### Decision 2: Dual Authorization on Mutation Endpoints
The `requireAdminAuth` middleware checks:
1. Valid Bearer JWT with `payload.role === 'admin'`, OR
2. Header `x-admin-key === ADMIN_PSK`.
This ensures existing curl/scripts continue to work while browser requests seamlessly use the user's JWT.

### Decision 3: Song Card Administrative Controls
- In `src/songbook/App.tsx`, when `isAdmin === true`:
  - If `!song.archived`, render a secondary button: `📦 Archive`.
  - If `song.archived`, render a secondary button: `♻️ Restore`.
- Tapping triggers a confirmation prompt (`window.confirm`) to guard against accidental rehearsal clicks.
- On success, the song list updates dynamically.
