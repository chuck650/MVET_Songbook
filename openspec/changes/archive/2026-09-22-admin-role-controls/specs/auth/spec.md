## MODIFIED Requirements

### Requirement: Pre-Shared Key Token Exchange
The system SHALL exchange a valid choir Pre-Shared Key (PSK) or administrative Pre-Shared Key (ADMIN_PSK) for a cryptographically signed JSON Web Token (JWT) bearing the corresponding role claim.

#### Scenario: Valid Member PSK Authentication
- **GIVEN** an active choir member with a valid UUIDv4 PSK from `ACTIVE_PSKS`
- **WHEN** client sends a POST request to `/api/v1/auth/token` with the PSK
- **THEN** the API SHALL return HTTP 200 containing a signed JWT token with claim `{ role: 'member' }`

#### Scenario: Valid Admin PSK Authentication
- **GIVEN** an administrator with the configured `ADMIN_PSK`
- **WHEN** client sends a POST request to `/api/v1/auth/token` with the admin PSK
- **THEN** the API SHALL return HTTP 200 containing a signed JWT token with claim `{ role: 'admin' }`

#### Scenario: Invalid PSK Block
- **GIVEN** an unrecognized or missing PSK
- **WHEN** client posts to `/api/v1/auth/token`
- **THEN** the API MUST reject the request with HTTP 401 Unauthorized

### Requirement: Administrative Catalog Mutation
The system SHALL require administrative credentials—either a Bearer JWT containing `role: 'admin'` or an `x-admin-key` header—to alter song archival status.

#### Scenario: Authorized Song Archival via Bearer JWT
- **GIVEN** an administrator possessing a signed JWT with `role: 'admin'`
- **WHEN** client posts to `POST /api/v1/songs/:id/archive` with `Authorization: Bearer <token>`
- **THEN** the API SHALL update the song status to `archived: true` and return HTTP 200

#### Scenario: Authorized Song Restoration via Bearer JWT
- **GIVEN** an administrator possessing a signed JWT with `role: 'admin'`
- **WHEN** client posts to `POST /api/v1/songs/:id/restore` with `Authorization: Bearer <token>`
- **THEN** the API SHALL update the song status to `archived: false` and return HTTP 200

#### Scenario: Authorized Mutation via Admin Key Header
- **GIVEN** an automated script or client providing a valid `x-admin-key` header matching `ADMIN_PSK`
- **WHEN** client posts to `POST /api/v1/songs/:id/archive` or `/restore`
- **THEN** the API SHALL execute the requested mutation and return HTTP 200

#### Scenario: Unauthorized Archival Attempt
- **GIVEN** a general choir member (JWT `role: 'member'`) or unauthenticated client
- **WHEN** requesting `POST /api/v1/songs/:id/archive` or `/restore`
- **THEN** the API MUST reject the request with HTTP 401 Unauthorized or HTTP 403 Forbidden
