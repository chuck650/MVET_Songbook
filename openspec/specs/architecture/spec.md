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
