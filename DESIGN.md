# MVET Songbook – Design Philosophy & Architecture

This document outlines the design decisions and architectural rationale behind the MVET Songbook Rehearsal Suite. It serves as a guide for understanding the "Why" behind the "What."

---

## 1. Design Philosophy

### 1.1 High Fidelity & Technical Accuracy
As a tool for veteran choirs, the application must provide an authoritative musical reference. This means:
- **Audio Fidelity**: Maintaining the 48kHz sample rate of MuseScore exports to avoid resampling crackle and maintain tonal clarity.
- **Visual Accuracy**: Using OpenSheetMusicDisplay (OSMD) to ensure MusicXML is rendered with professional engraving standards, rather than using static images.

### 1.2 Performance & Efficiency
The platform is designed to be lean and responsive:
- **MPA Architecture**: Using a Multi-Page Application structure separates the marketing landing page from the high-utility Songbook App, reducing the initial bundle size for new visitors.
- **Selective Caching**: Large media files (MP4, FLAC) are only cached when the user explicitly interacts with them, protecting device storage on older mobile devices common among veterans.

---

## 2. Key Architectural Decisions

### 2.1 The "Pre-rendered Sync" Strategy
Early versions explored real-time browser-side synchronization between the score and audio (using custom timing maps and cursor loops). This was completely abandoned and deprecated in favor of **MuseScore 4.7 Video Exports**.
- **Rationale**: Browser-side sync is fragile across different hardware/browser combinations. Pre-rendering the score-tracking "playhead" into an MP4 video file guarantees 100% synchronization accuracy natively within the browser's video player, with zero CPU overhead for the client. As a result, all `timing.json` map generations were purged from the build process.

### 2.2 Web Audio API over HTML5 Audio
We chose the **Web Audio API** for rehearsal track playback.
- **Rationale**: Native `<audio>` tags provide limited control over the underlying audio buffer. The Web Audio API allows us to force a specific sample rate (48kHz), implement high-resolution metering (Equalizer), and execute a **Network-Aware Auto-Play** architecture that triggers playback immediately upon decoding, preventing the latency or "seeking" issues common in standard audio elements.

### 2.3 The Sidecar Manifest Pattern (Split-Role Architecture)
Each song directory contains a `song.json` sidecar that maps file roles (PDF, MP4, etc.) to actual filenames. We utilize a **Split-Role Architecture** for MusicXML.
- **Rationale**: This allows for human-curated file management while supporting automated build-time manifest generation. By splitting the MusicXML roles into `"mxl"` (for raw file downloads) and `"osmd"` (for the visual rendering engine, usually set to a `*-SATB.mxl` conductor layout), we maintain strict control over both the visual layout and the downloadable payloads without forcing strict naming conventions on the user.

---

## 3. Visual Language & UX

### 3.1 Patriotic Glassmorphism
The aesthetic uses deep navy backgrounds (`#0f172a`) with sky blue accents (`#38bdf8`) and translucent "glass" borders.
- **Rationale**: This creates a modern, premium feel that honors the veteran focus without relying on generic patriotic tropes. The high-contrast elements ensure accessibility for older eyes.

### 3.2 The "Golden Ratio" Centering
We discovered that OSMD SVGs are inherently asymmetric due to part label positioning.
- **Rationale**: To center the score on the virtual "paper," we apply an asymmetric margin split (**2.0 Left / 10.0 Right**). This compensates for the implicit label space and ensures the staves are visually centered in the container.

### 3.3 Performance Mode (86vh Atomic Vertical Fit)
A dedicated "Performance Mode" was built specifically for tablet and mobile landscape use during live performances.
- **Rationale**: Rendering long SVG documents on mobile browsers can cause vertical scrolling tears or zooming issues. By establishing an "Infinite Canvas" with an exact `86vh` vertical constraint, the score securely locks to the screen bounds without scrolling, while custom on-screen gesture areas provide safe page-turning.

---

## 4. Caching & Reliability

### 4.1 Surgical SHA-256 Sync
The build script generates a unique SHA-256 hash for every asset.
- **Rationale**: Browser caching is often unreliable (especially on Edge or mobile WebView). By appending the hash to every URL (`?v=[hash]`), we bypass stale caches and guarantee that a corrected audio track or score is immediately available to the user after a build.

### 4.2 Network-First Manifest
The `songs.json` manifest is fetched with a timestamp to force a network check on every app load.
- **Rationale**: This ensures the client always has the latest "Source of Truth" for hashes and metadata before deciding which local files to use.

---

## 5. Development Workflow
This project utilizes an **Agent-Driven Development** model.
- **Rationale**: By maintaining structured documentation (OpenSpec, Design Docs), autonomous agents can verify the codebase against established standards, perform regression testing, and evolve features with high consistency.

---
*Last Updated: 2026-05-15*
