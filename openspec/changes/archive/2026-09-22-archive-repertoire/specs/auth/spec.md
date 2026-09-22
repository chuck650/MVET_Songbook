## ADDED Requirements

### Requirement: Administrative Catalog Mutation
The system SHALL require administrative credentials (`ADMIN_PSK`) to alter song archival status.

#### Scenario: Authorized Song Archival
- **GIVEN** an administrator providing a valid `x-admin-key` header matching `ADMIN_PSK`
- **WHEN** client posts to `POST /api/v1/songs/:id/archive`
- **THEN** the API SHALL update the song status to `archived: true` and return HTTP 200

#### Scenario: Authorized Song Restoration
- **GIVEN** an administrator providing a valid `x-admin-key` header matching `ADMIN_PSK`
- **WHEN** client posts to `POST /api/v1/songs/:id/restore`
- **THEN** the API SHALL update the song status to `archived: false` and return HTTP 200

#### Scenario: Unauthorized Archival Attempt
- **GIVEN** a general choir member or unauthenticated client without `ADMIN_PSK`
- **WHEN** requesting `POST /api/v1/songs/:id/archive` or `/restore`
- **THEN** the API MUST reject the request with HTTP 401 Unauthorized or HTTP 403 Forbidden
