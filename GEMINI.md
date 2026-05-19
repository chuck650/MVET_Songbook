# Gemini Project Context: MVET Songbook

This file serves as a persistent context for Gemini (Google Antigravity) to maintain project state, adherence to rules, and track progress.

## Project Vision
To create the premier digital resource for veteran-focused vocal arrangements, ensuring musical integrity and high-performance web delivery.

## Documentation
- **Technical Standards:** [OPENSPEC.md](file:///home/chuck/Projects/www/MVET_Songbook/OPENSPEC.md)
- **Design System & Architecture:** [DESIGN.md](file:///home/chuck/Projects/www/MVET_Songbook/DESIGN.md)

## Workspace Rules (from Tutorial)

### Netlify Project Best Practices
- **Deployment Config:** Always maintain a `netlify.toml` file in the root directory.
- **Publish Directory:** Set to `dist`.
- **Build Command:** `npm run build`.
- **Environment Handling:** Use `.env.example` for documentation; never hardcode secrets.
- **Vite Integration:** Prefix client-side variables with `VITE_`.

### Code Quality & Testing Rules
- **Modularity:** Break components into `src/components`.
- **Accessibility:** Ensure ARIA labels and WCAG 2.1 compliance.
- **Verification:** Use headless browser testing to verify interactivity after builds.

## Current Project Status
- [x] Project Initialization
- [x] README.md Creation
- [x] GEMINI.md Creation
- [x] Initial Scaffolding (Vite + React)
- [x] MusicXML Parser Integration
- [x] Interactive Rehearsal Suite (Part Isolation, Zoom, Contrast, Volta/Repeat handling)
- [x] Global Settings Engine (LocalStorage, Wake Lock)
- [x] Offline Sync Engine (MusicXML Caching)
- [x] Netlify Configuration (`netlify.toml`)
- [x] Production Deployment (Fixed Volta handling in Medley)
- [x] Agent Skill Creation (Deploy to Netlify)
- [x] Precision Sync Engine (Native Web Audio API, Note-level sync, Smooth gliding)
- [x] Agent Skill Creation (Web Audio Implementation)
- [x] Documentation Updates (DESIGN.md & OPENSPEC.md refreshed for Timing Maps & Voltas)
- [x] Note-by-Note Visual Tracking & Unified Audio Controls (v2.3.6)
- [x] Bidirectional Score-Audio Synchronization (v3.9.0 Hardened Engine)
- [x] Metadata Hardening & Engraver Extraction (v1.1.13)
- [x] Horizontal Centering Optimization (Asymmetric Margin Fix)
- [x] Handheld Hardening & Atomic Vertical Fit (v1.1.65)
- [x] Infinite Canvas & Artifact Elimination (v1.1.68)
- [x] Viewport-Proportional Margins & Manual Zoom Engine (v1.2.7)
- [x] Universal Symmetric Margins & Decoupled Performance Scroller (v1.2.12)
- [x] Production Deployment of v1.2.13 (Hardened Margins & Performance Mode Scroller)
- [x] GitHub Pages Migration & Dynamic Path Resolution Hardening (v1.2.14)

## Key Context Points
- **Domain**: Veteran music, SATB vocal arrangements, MusicXML.
- **GitHub Pages URL**: `https://chuck650.github.io/MVET_Songbook/`
- **Automation**: GitHub Actions workflow `.github/workflows/deploy.yml` manages automated Vite PWA compilation and deployment.
- **Precision**: v1.1.68 implements the Atomic Vertical Fit (86vh) and Infinite Canvas (uncapped max-width) for flawless landscape mobile stability.
- **Visuals**: Universal symmetric margins (4.0L / 4.0R) ensure the sheet music is flawlessly centered under the title across all device types and orientations, preventing any right-skew or overflow.
- **Performance Mode**: Unconstrained `:not(.performance-mode)` SVG scaling ensures the single horizontal staffline renders at its full crisp width without vertical squishing.

## Next Steps
1. Implement real-time metronome overlay synced to the Web Audio clock.
2. Finalize Web Audio gain/panning for S/A and T/B part isolation.
3. Optimize PWA caching for decoded AudioBuffers.

---
*Last updated by Antigravity on 2026-05-19*
