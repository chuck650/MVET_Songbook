# Authentication & Access Control Specification

## Purpose
Specifies the authentication lifecycle, Pre-Shared Key (PSK) token exchange, JSON Web Token (JWT) verification, Service Worker authorization injection, and catalog obfuscation for protected sheet music and media assets.
## Requirements
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

### Requirement: Service Worker Authorization Injection
The Service Worker SHALL intercept protected asset requests and inject authorization credentials.

#### Scenario: Background Media Fetch
- **GIVEN** an authenticated session stored in browser storage
- **WHEN** audio, video, or score file requests are dispatched to `/api/v1/songs/:id/files/:type`
- **THEN** the Service Worker MUST inject the Bearer token into the Authorization request header

#### Scenario: Query Parameter Fallback
- **GIVEN** direct browser navigation or media element playback without header access
- **WHEN** requesting a gated asset with `?token=<jwt>`
- **THEN** the API server SHALL validate the query parameter and grant access

### Requirement: Catalog Obfuscation
The system SHALL dynamically censor restricted score paths and download links for unauthenticated clients.

#### Scenario: Anonymous Catalog Request
- **GIVEN** an unauthenticated client request to `GET /api/v1/songs`
- **WHEN** songs containing copyrighted files are processed
- **THEN** the response MUST censor file paths and replace them with `{ protected: true }` markers

#### Scenario: Authenticated Catalog Request
- **GIVEN** a request with a valid Bearer token
- **WHEN** `GET /api/v1/songs` is executed
- **THEN** the response SHALL expose complete asset URLs, hashes, and download links

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

### Requirement: Song Card Administrative Archival Controls
The client application SHALL display dedicated administrative controls on song cards when authenticated as an administrator.

#### Scenario: Circular Action Button Placement and Styling
- **GIVEN** an authenticated administrator session (`role: 'admin'`)
- **WHEN** viewing song cards in the repertoire catalog
- **THEN** a circular action button SHALL be rendered immediately to the left of the circular information ('i') button
- **AND** the button SHALL display an archive icon (`📦`) for active repertoire or a restore icon (`♻️`) for archived repertoire
- **AND** the button SHALL use an amber/yellowish visual accent consistent with administrative actions, omitting text labels and providing an explanatory tooltip
- **AND** triggering the button SHALL prompt for confirmation prior to executing the archival mutation


