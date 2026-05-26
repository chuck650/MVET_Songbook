# MVET Songbook

**The premier digital resource for veteran-focused vocal arrangements.**

MVET Songbook is a high-fidelity rehearsal platform and sheet music library dedicated to military service songs. Designed for veteran choirs and vocalists, it combines professional SATB arrangements with high-performance web technology to ensure every performance honors the service it celebrates.

---

## 🚀 Key Features

- **High-Fidelity Rehearsal Suite**: Precision-engineered audio (48kHz FLAC) with Network-Aware Auto-Play and pre-rendered video tracking for flawless practice sessions.
- **Interactive Sheet Music**: Dynamic MusicXML rendering via OpenSheetMusicDisplay (OSMD) with part isolation and a dedicated **Performance Mode** (Infinite Canvas & 86vh vertical fit) for live tablet use.
- **Veteran-Optimized Arrangements**: Authentic SATB transcriptions (including isolated Men and Women parts) with sustainable vocal ranges.
- **Offline Reliable (PWA)**: Full Progressive Web App support ensures your library is available in rehearsal spaces with no Wi-Fi.
- **Surgical Sync**: SHA-256 hash-based cache management ensures you always have the latest scores and audio tracks.

## 🛠 Tech Stack

- **Frontend Client**: Vite + React (PWA with Workbox offline reliable synchronization)
- **API Backend**: Express + TypeScript stateless REST gateway container
- **API Spec**: OpenAPI 3.0 (with interactive Swagger UI documentation at `/docs`)
- **Audio Engine**: Web Audio API (48kHz/24-bit optimized) with Network-Aware Auto-Play
- **Rendering Engine**: OpenSheetMusicDisplay (OSMD) with asymmetric centering
- **Deployment & Orchestration**: Docker, Kubernetes (k3s for local development), and Netlify (PWA hosting)
- **Dev Environment**: Built using [Google Antigravity](https://antigravity.google) Agentic IDE.

## 📦 Getting Started

### Prerequisites
- Node.js (Latest LTS)
- npm
- Docker & Kubernetes (k3s / kubectl) — for running the local API backend cluster

### Installation
```bash
git clone https://github.com/chuck/MVET_Songbook.git
cd MVET_Songbook
npm install
```

### Local Content Syncing
```bash
npm run sync
```
*Securely synchronizes local exported assets (from MuseScore) into both the client static directory and the backend cluster storage folder.*

### Local Development
To run the dual-tier development workspace:

1. **Start the Frontend PWA Client**:
   ```bash
   npm run dev
   ```
   *Runs the Vite development server at http://localhost:5173/songbook/*

2. **Boot the Backend API (K3s Cluster)**:
   Ensure your local Kubernetes/K3s context is running, then deploy the API pods and volume mounts:
   ```bash
   bash scripts/deploy-local.sh
   ```
   *Deploys the Express container and routes http://mvet-api.test*

   *If you make changes to the Express codebase under `/api/src`, rebuild and reload the container:*
   ```bash
   bash scripts/build-and-import.sh
   ```

3. **Run API Integration Tests**:
   ```bash
   node scripts/test-api.js dev
   ```
   *Runs the 12-point authentication, catalog obfuscation, and secure file streaming verification suite.*

### Production Build
```bash
npm run build
```
*The build script automatically increments the version, updates the manifest file with SHA-256 hashes, and compiles the Vite PWA into the `dist/` publishing folder.*

## 📄 Documentation

- **Technical Specification**: [OPENSPEC.md](OPENSPEC.md) — The authoritative ground truth for schemas and APIs.
- **Design Philosophy**: [DESIGN.md](DESIGN.md) — Architectural rationale and design decisions.
- **Project Status**: [GEMINI.md](GEMINI.md) — Current state and roadmap.

## ⚖️ License
Proprietary. All arrangements are protected by copyright and licensed specifically for MVET performance use.

---
*Created and maintained with Google Antigravity Agentic IDE.*
