# System Architecture Specification

## Purpose
Specifies the decoupled split-architecture tier of the MVET Songbook platform, separating the high-performance client Progressive Web Application (PWA) from the containerized Express REST API backend and ingress layers.

## Requirements

### Requirement: Decoupled Split-Architecture Tier
The system SHALL decouple client score presentation and playback from backend authorization and file distribution.

#### Scenario: Client Application Delivery
- **GIVEN** a web client or rehearsal singer
- **WHEN** navigating to the primary songbook application URL
- **THEN** the client PWA SHALL be delivered as a static bundle hosted on GitHub Pages with client-side routing

#### Scenario: API Gateway Deployment
- **GIVEN** API service requests targeting `/api/v1/`
- **WHEN** incoming requests arrive at the gateway
- **THEN** the backend container SHALL process requests via an Express REST API deployed on Kubernetes

### Requirement: Ingress & TLS Termination
The system SHALL route network traffic and terminate TLS via Traefik and cert-manager.

#### Scenario: Production Ingress
- **GIVEN** external HTTPS traffic reaching the production VPS cluster
- **WHEN** requesting `https://mvet-api.cminfosec.com`
- **THEN** Traefik MUST route traffic to the `mvet-api-svc` service with Let's Encrypt automated TLS certificates

#### Scenario: Local Test Server Ingress
- **GIVEN** local workstation development on `k3s-local`
- **WHEN** requesting `http://mvet-api.test`
- **THEN** the local Traefik IngressRoute MUST route `/api`, `/docs`, and `/openapi.json` to the local API service

### Requirement: Environment Isolation & Pre-Production Gate
The system MUST enforce strict isolation between development, home lab, and live production environments.

#### Scenario: Context Separation
- **GIVEN** local development tasks
- **WHEN** executing local sync and deployment scripts
- **THEN** the active kubectl context MUST be verified as `k3s-local` before any cluster mutations occur

#### Scenario: Production Gate
- **GIVEN** pending songbook or API updates
- **WHEN** a release to `vps-production` is requested
- **THEN** the changes MUST first pass automated API testing and local browser verification on `k3s-local`

### Requirement: Mobile Responsive Dialogs & Informational Views
The system SHALL ensure modals, prompt dialogs, and legal documentation views adapt fluidly to small-screen and mobile portrait viewports without content truncation, margin overflow, or button clipping.

#### Scenario: PWA Upgrade Notification Prompt Responsiveness
- **GIVEN** an update prompt is displayed (`ReloadPrompt`) on a mobile screen (`<= 600px` width)
- **WHEN** the prompt is positioned above the viewport edge
- **THEN** the container width SHALL fit dynamically within the screen boundaries with symmetric padding
- **AND** action buttons (`Upgrade Now` and `Dismiss`) SHALL wrap or stack vertically with full-width tap targets to prevent horizontal overflow

#### Scenario: About & Legal View Small-Screen Optimization
- **GIVEN** the About & Legal view on a mobile device in portrait or landscape orientation
- **WHEN** rendered on viewports `<= 640px`
- **THEN** the container and content cards SHALL constrain padding and enforce word-break and overflow wrapping on email addresses, names, links, and license identifiers
- **AND** contact cards SHALL stack label-value pairs vertically or wrap cleanly to prevent horizontal boundary overflow

### Requirement: UI Asset Bundling & Content Hashing
The application build pipeline SHALL bundle and fingerprint core UI icons and visual action assets with unique cryptographic content hashes to ensure deterministic Service Worker cache invalidation across versions.

#### Scenario: Format Action Icons Bundling
- **GIVEN** UI format action icons for PDF, MSCZ, and MXL downloads on song cards
- **WHEN** the application is compiled for production via the bundler
- **THEN** the icons SHALL be imported as modular bundled assets within `src/assets/`
- **AND** emitted into the build output with unique content hashes in their filenames
- **AND** the Service Worker precache manifest SHALL reference the fingerprinted asset filenames rather than unhashed static paths to guarantee immediate cache updates upon asset revision
- **AND** monochrome or transparent music notation icons (such as MusicXML `.icon-mxl`) SHALL provide a solid high-contrast white backing (`background: #ffffff`, subtle rounding) to guarantee clear legibility against dark theme action buttons

