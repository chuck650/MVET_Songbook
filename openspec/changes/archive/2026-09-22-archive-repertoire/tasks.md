## 1. Schema & Manifest Updates

- [x] 1.1 Add `archived?: boolean` to TypeScript types in `src/types/songbook.ts` and `api/src/types.ts`
- [x] 1.2 Update `scripts/generate-manifest.cjs` to read `archived` from `song.json` or `metadata.json` and include it in `songs.json`

## 2. API Backend Implementation

- [x] 2.1 Add `ADMIN_PSK` configuration in `api/src/index.ts` and document in `.env.example`
- [x] 2.2 Update `GET /api/v1/songs` to filter out archived songs unless `?include_archived=true`
- [x] 2.3 Implement `POST /api/v1/songs/:id/archive` and `POST /api/v1/songs/:id/restore` endpoints guarded by `x-admin-key`
- [x] 2.4 Update `api/src/openapi.ts` to document new routes, parameters, and error responses

## 3. PWA Frontend UI Implementation

- [x] 3.1 Add `includeArchived` boolean setting to `SettingsContext.tsx` with LocalStorage persistence
- [x] 3.2 Add "Include Archived Performances" toggle in `SettingsView.tsx`
- [x] 3.3 Update song fetching and library rendering in `App.tsx` to display archived badge and honor the setting
- [x] 3.4 Add styling for the `.badge-archived` pill in `Songbook.css`

## 4. Verification & Testing

- [x] 4.1 Add test cases to `scripts/test-api.js` verifying archival filtering, `?include_archived=true`, and admin key authorization
- [x] 4.2 Verify frontend build with `npm run lint && npm run build`
- [x] 4.3 Test end-to-end on `k3s-local` and local browser
