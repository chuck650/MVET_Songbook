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

- **Framework**: Vite + React
- **Audio Engine**: Web Audio API (48kHz/24-bit optimized)
- **Rendering**: OpenSheetMusicDisplay (OSMD)
- **Deployment**: Netlify
- **Dev Environment**: Built using [Google Antigravity](https://antigravity.google) Agentic IDE.

## 📦 Getting Started

### Prerequisites
- Node.js (Latest LTS)
- npm

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
*Securely synchronizes local exported assets (from MuseScore) into the web project.*

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```
*The build script automatically increments the version, generates the file manifest with SHA-256 hashes, and compiles the Vite project.*

## 📄 Documentation

- **Technical Specification**: [OPENSPEC.md](OPENSPEC.md) — The authoritative ground truth for schemas and APIs.
- **Design Philosophy**: [DESIGN.md](DESIGN.md) — Architectural rationale and design decisions.
- **Project Status**: [GEMINI.md](GEMINI.md) — Current state and roadmap.

## ⚖️ License
Proprietary. All arrangements are protected by copyright and licensed specifically for MVET performance use.

---
*Created and maintained with Google Antigravity Agentic IDE.*
