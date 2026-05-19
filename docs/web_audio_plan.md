# Technical Plan: High-Precision Web Audio Sync Engine

This document outlines the architectural transition from the standard HTML5 `<audio>` element to a custom **Web Audio API** engine. This shift will enable sub-millisecond precision and granular, note-level synchronization in the MVET Songbook rehearsal suite.

## 1. Core Objectives
- **Microsecond Precision**: Use `AudioContext.currentTime` instead of the 250ms-polled `HTMLMediaElement.currentTime`.
- **Note-Level Sync**: Replace measure-by-measure jumps with beat-for-beat follow-along.
- **Low Latency**: Enable instant seek/play without browser-induced buffering delays.

## 2. Technical Architecture

### A. The Audio Engine
- **Buffer Management**: Use `fetch()` + `AudioContext.decodeAudioData()` to load songs into memory as `AudioBuffer` objects (perfect for 3-5 minute vocal tracks).
- **Playback Control**: Utilize `AudioBufferSourceNode` with `GainNode` and `StereoPannerNode` for the existing part-isolation features.
- **Clocking**: Implement a `requestAnimationFrame` sync loop that calculates positions relative to the `AudioContext` clock.

### B. High-Fidelity Timing Manifest
- **Generator Update**: Modify `scripts/generate-timing-maps.cjs` to iterate through every **Voice Entry** (beats/notes) instead of just measures.
- **Schema Update**:
  ```json
  {
    "index": 42,
    "measure": 16,
    "beat": 1.5,
    "time": 0.3542,
    "type": "note"
  }
  ```

### C. Visual Engine (OSMD)
- **Granular Walking**: Update `MusicViewer.jsx` to call `cursor.next()` for every beat entry in the manifest.
- **Interpolated Highlighting**: Use CSS transitions on the cursor to smoothly glide between note positions rather than jumping.

## 3. Implementation Phases

| Phase | Task | Deliverable |
| :--- | :--- | :--- |
| **1** | **Note Manifest** | Update build scripts to extract beat-level timestamps. |
| **2** | **Buffer Loading** | Implement `AudioBuffer` caching and decoding logic in `App.jsx`. |
| **3** | **Precision Sync** | Replace `audio.currentTime` with `ctx.currentTime` logic in `MusicViewer`. |
| **4** | **UX Polish** | Implement smooth-gliding cursor transitions and visual measure-box highlighting. |

## 4. Risks & Mitigations
- **Memory Usage**: Storing multiple 320kbps buffers in memory. *Mitigation: Clear inactive song buffers on view transition.*
- **Initialization**: Browser "User Interaction" requirements for `AudioContext`. *Mitigation: Resume context on the first 'Play' click.*

---
> [!NOTE]
> This plan is currently for architectural review. Implementation will proceed only after the current measure-level stability is fully validated.
