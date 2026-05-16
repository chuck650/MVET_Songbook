# OpenSpec: MVET Songbook Rehearsal Suite (v1.1)

This document serves as the formal technical specification for the MVET Songbook platform. It is the authoritative "Ground Truth" for both human developers and agentic AI systems, ensuring that every build maintains musical integrity, performance excellence, and architectural consistency.

---

## 0. Project Vision & Objectives

### 0.1 Objective
To create the premier digital resource for veteran-focused vocal arrangements, optimized for high-performance web delivery and offline reliability.

### 0.2 Core Principles
- **Musical Integrity**: No resampling artifacts; audio must reflect the 48kHz source.
- **Visual Precision**: Score rendering must be centered and readable on all devices ("Golden Ratio").
- **Reliability**: SHA-256 hash-based cache-busting ensures users always have the latest versions.
- **Efficiency**: "User-Initiated Only" caching strategy for large media files to protect device storage.

---

## 1. System Architecture

### 1.1 Multi-Page Application (MPA)
- **Framework**: Vite + React.
- **Root (`/`)**: High-performance, SEO-optimized landing page.
- **Songbook (`/songbook/`)**: Progressive Web App (PWA) for interactive rehearsal.
- **Routing**: Netlify redirects handle SPA-style navigation within the `/songbook/` scope.

### 1.2 Technology Stack
- **Frontend**: React (Functional Components + Hooks).
- **Styling**: Vanilla CSS with a deep navy glassmorphism aesthetic.
- **Rendering**: OpenSheetMusicDisplay (OSMD) for MusicXML (.mxl).
- **Audio**: Native Web Audio API for high-resolution 48kHz playback.
- **PWA**: Workbox-powered service worker for offline functionality.

---

## 2. Data Manifest Specification

### 2.1 The Global Manifest (`songs.json`)
The `public/songs.json` file is a compiled index generated at build time by `scripts/generate-manifest.cjs`.

#### Schema (v1.1)
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
  parts: Record<string, PartEntry>; // Voice parts (S/A/T/B)
}

interface FileGroup {
  mxl?: string;      // Interactive Score
  pdf?: string;      // Print Score
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

### 2.2 SHA-256 Hashing & Cache-Busting
- **Build Time**: `generate-manifest.cjs` calculates a SHA-256 hash for every media asset.
- **Run Time**: The application fetches the manifest with a timestamp (`?v=Date.now()`).
- **URL Generation**: All media URLs must append the hash from the manifest: `path?v=[hash]`.
- **Surgical Sync**: The client compares local storage hashes against the manifest. Stale files are invalidated and re-fetched only upon user request.

---

## 3. High-Fidelity Audio Implementation

### 3.1 Web Audio Engine
- **Clock**: Synchronized to the browser's hardware clock.
- **Sample Rate**: Forced to **48000 Hz** to match high-resolution source files (MuseScore 4.7 exports).
- **Format Support**: 
    - **FLAC**: Primary format (24-bit/48kHz).
    - **MP3**: Fallback format.
- **Format Toggle**: Users can switch between MP3/FLAC. Switching closes any active audio player and resets the transport to prevent format mismatch crackling.

### 3.2 Precision Metering
- **Visualizer**: A 3-bar miniature equalizer reflecting real-time amplitude data from the `AnalyserNode`.
- **Latency**: Minimal latency through direct AudioBuffer source scheduling.

---

## 4. Score Rendering Specification

### 4.1 OSMD Configuration
- **Golden Ratio Margins**: To ensure horizontal centering on the virtual "paper" container (accounting for asymmetric SVG bounding boxes):
    - `PageLeftMargin = 2.0`
    - `PageRightMargin = 10.0`
    - `PageTop/BottomMargin = 5.0`
- **Options**: `drawMeasureNumbers` (user toggleable), `autoResize: true`.

### 4.2 Metadata Display
- **Viewer Header**: Displays the Song Title only (minimalist design).
- **Viewer Footer**: A centered metadata pill showing:
    - `Arranger: [Name]`
    - `Engraver: [Name]`
    - `Key: [Key]`
    - `Updated: [Date]`

---

## 5. UI/UX Standards

### 5.1 Aesthetics
- **Theme**: Deep Navy (`#0f172a`), Sky Blue (`#38bdf8`), Glassmorphism borders (`rgba(255,255,255,0.1)`).
- **Animations**: Subtle hover transitions on Song Cards (scale/rotate).

### 5.2 Accessibility
- **High Contrast Mode**: Inverts score rendering for low-light/stage use.
- **Mobile First**: All transport controls and the settings drawer must be usable via touch.

---

## 6. Build & Lifecycle

### 6.1 Build Pipeline
1. `npm run bump-version`: Increments the minor build version.
2. `npm run generate-manifest`: Scans the song library and updates `public/songs.json` with hashes and metadata.
3. `vite build`: Compiles the application into `dist/`.

### 6.2 Versioning
- **Schema**: Semantic Versioning (Major.Minor.Build).
- **Automation**: Build numbers increment automatically; Major/Minor are manual triggers.

---

## 7. Change Log Summary

| Version | Key Milestone |
|---------|---------------|
| 1.1.16  | **Horizontal Centering Optimization**. Implemented the Golden Ratio asymmetric margin fix. |
| 1.1.13  | **Metadata Hardening**. Integrated Engraver extraction from MuseScore properties. |
| 1.1.11  | **SHA-256 Cache-Busting**. Added manifest hashing to resolve Edge/browser caching issues. |
| 1.1.0   | **High-Res Audio**. Forced 48kHz AudioContext for lossless FLAC support. |

---
*End of Specification*
