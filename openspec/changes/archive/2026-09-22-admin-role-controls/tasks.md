## 1. Backend API Updates
- [x] 1.1 Update `JWTPayload` interface in `api/src/types.ts` to include `role?: 'member' | 'admin'`
- [x] 1.2 Update `POST /api/v1/auth/token` in `api/src/index.ts` to check `ADMIN_PSK` first, issuing `role: 'admin'`, else check `ACTIVE_PSKS` issuing `role: 'member'`
- [x] 1.3 Update `requireAdminAuth` middleware to accept either a valid Bearer JWT with `role: 'admin'` OR `x-admin-key: ADMIN_PSK`
- [x] 1.4 Update `api/src/openapi.ts` to reflect the new `role` claim in token response and dual auth on archive/restore routes

## 2. Frontend Client Updates
- [x] 2.1 Update `useSongbookAuth.ts` and `AuthContext.tsx` to parse token payload, exposing `role: 'member' | 'admin' | null` and `isAdmin: boolean`
- [x] 2.2 Update `SettingsView.tsx` to display `🛡️ Access Granted (Administrator)` when `isAdmin === true`
- [x] 2.3 Add archive/restore action buttons to song cards in `App.tsx` visible when `isAdmin === true`, with confirmation guard and dynamic state update
- [x] 2.4 Add CSS styling for admin song card buttons in `Songbook.css`

## 3. Testing & Verification
- [x] 3.1 Update `scripts/test-api.js` to test admin login via `POST /api/v1/auth/token` and Bearer JWT-authorized archival mutations
- [x] 3.2 Build API container image, deploy to `k3s-local`, and run `node scripts/test-api.js dev`
- [x] 3.3 Verify frontend build with `npm run lint && npm run build`
