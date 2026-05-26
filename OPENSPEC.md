# OpenSpec: MVET Songbook Rehearsal Suite (v1.2)

This document serves as the formal technical specification for the MVET Songbook platform. It is the authoritative "Ground Truth" for both human developers and agentic AI systems, ensuring that every build maintains musical integrity, performance excellence, and architectural consistency.

---

## 0. Project Vision & Objectives

### 0.1 Objective
To create the premier digital resource for veteran-focused vocal arrangements, optimized for high-performance web delivery and offline reliability.

### 0.2 Core Principles
- **Musical Integrity**: No resampling artifacts; audio must reflect the 48kHz source.
- **Visual Precision**: Score rendering must be centered and readable on all devices ("Golden Ratio").
- **Reliability**: SHA-256 hash-based cache-busting ensures users always have the latest versions.
- **Security & Compliance**: Copyrighted sheet music, audio tracks, and sync hashes must be dynamically protected from public scrapers while remaining fully cached offline for validated choir members.

---

## 1. System Architecture

The platform operates as a **Split-Architecture Tier** dividing user interface rendering and offline reliable playback from a secure stateless API backend gateway.

### 1.1 Subsystems

1. **Frontend PWA Client (Vite + React)**
   - Deployed as a high-performance static Progressive Web App (`dist` publish folder) on GitHub Pages.
   - Manages client-side state, OSMD canvas rendering, Web Audio synthesis, and Service Worker offline caching.
   - Routable under `/songbook/`, falling back dynamically to client-side routing.

2. **Backend API Gateway (Express + TypeScript)**
   - Deployed as a lightweight containerized Node.js service (`api/` subdirectory) running inside K3s/Kubernetes under the `mvet-songbook` namespace.
   - Exposes an OpenAPI 3.0 REST specification with interactive Swagger documentation under `/docs`.
   - Handles security token issuance, catalog obfuscation, and authenticated file streaming.

3. **Ingress Routing & TLS Layer (Traefik + cert-manager)**
   - Managed natively inside the `mvet-songbook` namespace via Traefik ingress configuration rules.
   - Secure TLS termination is handled in-cluster (Option A) utilizing a Let's Encrypt production `ClusterIssuer` (HTTP-01 validation challenge).
   - Generates globally trusted SSL certificates bound to the dynamic secret `mvet-api-tls-prod` for public endpoint `https://mvet-api.cminfosec.com`.


### 1.2 Security & Authentication Lifecycle

- **Pre-Shared Key (PSK) Token Exchange**: Users enter a Choir PSK which is exchanged at `POST /api/auth/token` for a cryptographically signed JWT.
  - *Format*: Active PSK keys conform to the standard **UUIDv4** format (e.g., `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`), balancing high cryptographic entropy with user-friendly readability.
- **Service Worker Interceptor**: The frontend stores the token in local storage. The Service Worker intercepts outgoing requests to `/api/songs/:id/files/:type`, extracting the token and injecting it in the `Authorization: Bearer <token>` header to enable native browser player streaming.
- **Catalog Obfuscation**: The catalog `GET /api/songs` evaluates active tokens:
  - *Unauthenticated*: Automatically censors copyright-restricted files and hashes, returning `{ protected: true }` placeholders, while keeping public domain metadata clear.
  - *Authenticated*: Reveals direct file access parameters and hashes.
- **Bypassed Image Gateway**: To allow homepage catalog loading, image formats (`png`, `jpg`, `jpeg`, etc.) are served anonymously by the gateway, even for copyrighted scores.

---

## 2. API Endpoint Specification

All API paths are prefixed with `/api`. Standard responses follow HTTP status conventions (200 OK, 401 Unauthorized, 404 Not Found, 500 Internal Server Error).

### 2.1 Authenticate Choir Member
Exchanges a valid Pre-Shared Key (PSK) for a cryptographically signed JSON Web Token (JWT).

- **Route**: `POST /api/auth/token`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "psk": "2d82cd1f-1cb9-44d6-acb2-2bb61430af52"
  }
  ```
- **Responses**:
  - `200 OK`: Access granted.
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsIn...",
      "expiresAt": "2026-08-24T19:28:44.000Z"
    }
    ```
  - `401 Unauthorized`: Invalid pre-shared key.
    ```json
    {
      "error": "Invalid pre-shared key"
    }
    ```
  - `400 Bad Request`: Missing key in request body.

### 2.2 Retrieve Song Catalog
Retrieves the complete list of vocal arrangements. If an active JWT token is provided, the full media URLs are exposed. Otherwise, copyrights are dynamically obfuscated.

- **Route**: `GET /api/songs`
- **Headers**: `Authorization: Bearer <token>` (Optional)
- **Responses**:
  - `200 OK`: Catalog compiled successfully.
    - *Unauthenticated Example (Copyright-restricted song)*:
      ```json
      [
        {
          "id": "Armed_Forces_Medley_72",
          "title": "Armed Forces Medley",
          "composer": "Various",
          "arranger": "Arr. Chuck Nelson",
          "engraver": "Chuck Nelson",
          "key": "Bb major",
          "mtime": "",
          "protected": true,
          "hashes": {
            "protected": true
          },
          "files": {
            "protected": true
          },
          "parts": {
            "Soprano": { "files": { "protected": true } },
            "Alto": { "files": { "protected": true } }
          }
        }
      ]
      ```
    - *Authenticated Example*:
      ```json
      [
        {
          "id": "Armed_Forces_Medley_72",
          "title": "Armed Forces Medley",
          "composer": "Various",
          "arranger": "Arr. Chuck Nelson",
          "engraver": "Chuck Nelson",
          "key": "Bb major",
          "mtime": "2026-05-26",
          "hashes": {
            "mxl": "a8f7e6d5...",
            "mp4": "b4a3c2d1..."
          },
          "files": {
            "mxl": "/api/songs/Armed_Forces_Medley_72/files/mxl",
            "mp4": "/api/songs/Armed_Forces_Medley_72/files/mp4"
          },
          "parts": {
            "Soprano": {
              "name": "Soprano",
              "files": {
                "mp4": "/api/songs/Armed_Forces_Medley_72/files/soprano_mp4"
              }
            }
          }
        }
      ]
      ```

### 2.3 Download Copyrighted Arrangement File
Streams a secure sheet music binary or vocal rehearsal track. Requires a valid JWT session.

- **Route**: `GET /api/songs/:id/files/:type`
- **Headers**: `Authorization: Bearer <token>` (Required)
- **Parameters**:
  - `id`: The song slug (e.g., `Armed_Forces_Medley_72`)
  - `type`: File key (e.g., `mxl`, `pdf`, `mp3`, `flac`, `mp4`, `soprano_mp4`, etc.)
- **Responses**:
  - `200 OK`: Binary file stream (e.g., `application/vnd.recordare.musicxml` or `video/mp4`).
  - `401 Unauthorized`: Missing, expired, or cryptographically invalid token signature.
  - `404 Not Found`: Song ID or requested file type does not exist.

### 2.4 Anonymous Image Thumbnail Gateway
Bypasses standard authentication blocks exclusively for image formats (`png`, `jpg`) to let PWA clients render catalog layouts without blocking.

- **Route**: `GET /songs/:id/thumbnail.png`
- **Responses**:
  - `200 OK`: Static PNG thumbnail stream.

---

## 3. Data Manifest Specification

The compiled database matches the following structured TypeScript interface definitions:

```typescript
interface SongManifest {
  id: string;        // URL slug (e.g., "Armed_Forces_Medley_72")
  title: string;     // Display title
  composer: string;  // Original composer
  arranger: string;  // SATB arranger
  engraver: string;  // Score engraver (e.g., "Chuck Nelson")
  key: string;       // Musical key (e.g., "Eb major")
  mtime: string;     // Last modified date (YYYY-MM-DD)
  hashes: Record<string, string>; // Path-to-Hash map (SHA-256)
  files: FileGroup;  // Full score files
  parts: Record<string, PartEntry>; // Voice parts (S/A/T/B/Men/Women)
}

interface FileGroup {
  mxl?: string;      // Raw Score (Download)
  osmd?: string;     // Interactive Score (Conductor Layout for Render)
  pdf?: string;      // Print Score (-SATB.pdf)
  mscz?: string;     // Source Project
  mp3?: string;      // Rehearsal Audio (Compressed)
  flac?: string;     // Rehearsal Audio (Lossless)
  mp4?: string;      // Rehearsal Video (Pre-rendered)
}

interface PartEntry {
  name: string;      // Display name (e.g., "Soprano")
  files: FileGroup;  // Files specific to this part
}
```

### 3.1 SHA-256 Hashing & Cache-Busting
- **Build Time**: `generate-manifest.cjs` calculates a SHA-256 hash for every media asset.
- **Run Time**: The application fetches the manifest with a timestamp (`?v=Date.now()`).
- **URL Generation**: All media URLs must append the hash from the manifest: `path?v=[hash]`.
- **Surgical Sync**: The client compares local storage hashes against the manifest. Stale files are invalidated and re-fetched only upon user request.

---

## 4. High-Fidelity Audio Implementation

### 4.1 Web Audio Engine
- **Clock**: Synchronized to the browser's hardware clock.
- **Sample Rate**: Forced to **48000 Hz** to match high-resolution source files (MuseScore exports).
- **Network-Aware Auto-Play**: The engine monitors its own asynchronous download state. It triggers playback precisely when the audio buffer finishes decoding, ensuring a seamless one-click experience without arbitrary timeouts.
- **Format Support**: 
    - **FLAC**: Primary format (24-bit/48kHz).
    - **MP3**: Fallback format.
- **Format Toggle**: Users can switch between MP3/FLAC. Switching closes any active audio player and resets the transport to prevent format mismatch crackling.

### 4.2 Precision Metering
- **Visualizer**: A 3-bar miniature equalizer reflecting real-time amplitude data from the `AnalyserNode`.
- **Latency**: Minimal latency through direct AudioBuffer source scheduling.

---

## 5. Score Rendering Specification

### 5.1 OSMD Configuration
- **Golden Ratio Margins**: To ensure horizontal centering on the virtual "paper" container (accounting for asymmetric SVG bounding boxes):
    - `PageLeftMargin = 2.0`
    - `PageRightMargin = 10.0`
    - `PageTop/BottomMargin = 5.0`
- **Options**: `drawMeasureNumbers` (user toggleable), `autoResize: true`.

### 5.2 Metadata Display
- **Viewer Header**: Displays the Song Title only (minimalist design).
- **Viewer Footer**: A centered metadata pill showing:
    - `Arranger: [Name]`
    - `Engraver: [Name]`
    - `Key: [Key]`
    - `Updated: [Date]`

---

## 6. UI/UX Standards

### 6.1 Aesthetics
- **Theme**: Deep Navy (`#0f172a`), Sky Blue (`#38bdf8`), Glassmorphism borders (`rgba(255,255,255,0.1)`).
- **Animations**: Subtle hover transitions on Song Cards (scale/rotate).

### 6.2 Accessibility
- **High Contrast Mode**: Inverts score rendering for low-light/stage use.
- **Mobile First**: All transport controls and the settings drawer must be usable via touch.

---

## 7. Change Log Summary

| Version | Key Milestone |
|---------|---------------|
| 1.2.53  | **Decoupled Workstation Pipeline**. Switched production deployments to native workstations via context-targeted kubectl and lightning-fast out-of-band SSH `rsync` synchronization, achieving namespace alignment (`mvet-songbook`) across dev and prod. |
| 1.2.38  | **OpenAPI Backend Integration**. Switched to a secure, split-architecture containerized Express API gateway running in Kubernetes (k3s), providing JWT access controls, credential-aware offline sync, and public thumbnail bypass routes. |
| 1.1.80  | **Split-Role Architecture**. Separated raw MXL downloads from OSMD render files (-SATB.mxl). |
| 1.1.77  | **Asset Syncing & Parts**. Added support for 'women' and 'men' vocal groups, added `npm run sync`. |
| 1.1.72  | **Network-Aware Auto-Play**. Engineered exact-time auto-playback for WebAudio following network load. |
| 1.1.68  | **Performance Mode**. Implemented Infinite Canvas and 86vh Atomic Vertical Fit for landscape mobile. |
| 1.1.16  | **Horizontal Centering Optimization**. Implemented the Golden Ratio asymmetric margin fix. |
| 1.1.13  | **Metadata Hardening**. Integrated Engraver extraction from MuseScore properties. |
| 1.1.11  | **SHA-256 Cache-Busting**. Added manifest hashing to resolve Edge/browser caching issues. |
| 1.1.0   | **High-Res Audio**. Forced 48kHz AudioContext for lossless FLAC support. |

---
*End of Specification*
