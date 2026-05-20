# MVET Songbook Future Roadmap & Enhancement Tracker

This document serves as a persistent tracker for high-impact future enhancements and diagnostic features slated for development in subsequent phases.

---

## 📋 Enhancement Backlog

| ID | Title | Priority | Category | Status | Target Version |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **EP-01** | LocalStorage File Manager Page | 🔴 High | Diagnostics & Cache | Proposed | `v1.3.0` |
| **EP-02** | Vocal Balance Controls (Panning & Gain Mix) | 🟡 Medium | Audio Engine | Proposed | `v1.4.0` |
| **EP-03** | Local Audio Caching Pre-fetcher | 🟡 Medium | Offline Sync | Proposed | `v1.4.0` |
| **EP-04** | Modular Subcomponent Refactoring (`MusicViewer.tsx`) | 🟢 Low | Code Health | Proposed | `v1.5.0` |

---

## 💾 EP-01: LocalStorage & Cache File Manager

### 1. Vision & Purpose
To resolve PWA cache invalidation friction by providing users (and choir leaders) with a clear, standalone diagnostic dashboard. Instead of forcing hard refreshes or clearing browser histories, users can inspect, force-sync, or selectively prune cached song databases and audio files directly from the user interface.

### 2. UI/UX Integration
*   **Navigation Link**: A new hamburger menu/sidebar navigation option labeled **"💾 Local Storage"**.
*   **Location**: A new standalone route and tab component (`LocalStorageManager.tsx`) styled with premium glassmorphic cards matching the design system.

### 3. Key Features
*   **Storage Quota Monitor**:
    *   Displays a visual progress bar showing total estimated disk space utilized by the songbook (using the browser's `navigator.storage.estimate()` API).
*   **Granular Cache Inspector**:
    *   Lists all cached `.mxl` notation files, `.mp3`/`.flac` rehearsal tracks, and `.pdf` print scores, grouped cleanly by song name.
*   **Interactive Controls**:
    *   🔄 **Force Refresh**: A sync button next to each file to immediately bypass the service worker cache, fetch the latest version from the server, and write it to local cache.
    *   🗑️ **Prune / Delete**: A trash can icon next to each file or song group to remove files from local cache to free up space.
    *   🚨 **Master Reset**: A prominent warning button to "Clear All Offline Data and Re-register Service Worker" to cleanly reset the PWA.

---

## 🎛️ EP-02: Vocal Balance Controls (Audio Panning & Gain Mix)

### 1. Vision & Purpose
The ultimate ear-training rehearsal aid. Singers will be able to customize their audio balance, letting them isolate their own vocal part or keep other parts playing softly in the background to practice singing against harmony.

### 2. Key Features
*   **Native Web Audio Nodes**: Connect dynamic `GainNode` and `StereoPannerNode` chains to each of the four loaded audio tracks (Soprano, Alto, Tenor, Bass).
*   **Vocal Mix Drawer**:
    *   **Focus Slider**: A slider to balance "My Part" vs "Other Parts" (e.g., Soprano plays at 100% volume, while Alto, Tenor, and Bass play at a soft 15% volume).
    *   **Spatial Panning**: Option to pan your part hard-left and other parts hard-right when listening with rehearsal headphones.

---

## 📥 EP-03: Local Audio Caching Pre-fetcher

### 1. Vision & Purpose
To prevent situation-critical failures (such as entering a veteran performance venue or flight hangar with zero signal and realizing a rehearsal track was never cached). 

### 2. Key Features
*   **Download All Offline Assets**:
    *   A clean download button directly on each song card.
*   **Pre-fetching Queue**:
    *   When clicked, the app systematically pre-fetches the full suite of rehearsal assets (SATB, Soprano, Alto, Tenor, Bass audio guides + PDF + MusicXML) and writes them to Cache Storage.
    *   Shows a visual circular loader indicating download progress.

---

## 🛠️ EP-04: Modular Subcomponent Refactoring (`MusicViewer.tsx`)

### 1. Vision & Purpose
Clean up the monolithic architecture of the sheet music viewer page to ensure ease of maintenance, clean code isolation, and modular styling.

### 2. Refactoring Targets
*   Extract the rehearsal controls drawer into `/components/RehearsalDrawer.tsx`.
*   Extract the bottom miniature audio controller into `/components/AudioMiniPlayer.tsx`.
*   Decouple styles by splitting specific components out of `Songbook.css` into local CSS modules.
