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
- **VPS Isolation & Testing:** When modifying VPS routing, ingress, or container network configurations, always test legacy/side-by-side websites and services (e.g. mail interfaces) over public IP networks using loopback or external check tools to verify that host ports (80/443) remain untouched and un-hijacked.
- **Pre-Production Local Testing Gate:** ALWAYS test songbook assets and API updates against the local test server (`k3s-local`) at `http://mvet-api.test` and in the local browser at `http://localhost:5173/songbook/` prior to pushing to `vps-production`. Never bypass local verification.
- **K3s Certificate Maintenance:** K3s client certificates expire yearly. If `k3s-local` requests credentials or fails auth, run `bash .agents/skills/local-testing-and-deployment/scripts/refresh-k3s-certs.sh` to sync renewed certificates from `/etc/rancher/k3s/k3s.yaml` into `~/.kube/config`.
- **VPS Traffic Redirect Preflight:** Always verify that local VPS SSH tunnels or firewalld redirects (`vps connect` in `~/.local/bin/vps`) are inactive before deploying or running tests against `vps-production`, using `bash .agents/skills/local-testing-and-deployment/scripts/check-vps-redirect.sh`.
- **Music Notation Unicode Standards:** NEVER use regular letters or ASCII symbols (`b`, `#`, `n`) as substitutes for music notation. Always use their official Unicode equivalents: Flat `♭` (`U+266D`), Sharp `♯` (`U+266F`), and Natural `♮` (`U+266E`) across all metadata, UI badges, scripts, documentation, and agent responses. See `.agents/rules/music-notation.md`.
- **TypeScript Strict Typing Standards:** NEVER use `any` or `as any` in TypeScript source files. Always use `unknown` with runtime type guards, augment third-party library typings, use `catch (err: unknown)`, and type dictionaries with `Record<string, unknown>`. See `.agents/rules/typescript-strict-types.md`.
- **Mandatory Spec-First Rule (OpenSpec):** NEVER implement, modify, or delete features in code before authoring or updating the living specification in `openspec/specs/` and verifying that `openspec validate --specs` passes 100%. Spec verification must always precede code execution. See `.agents/rules/openspec.md`.
- **Agent Skills & Workflows Preference:** ALWAYS prefer agent skills, rules, and workflows over ad-hoc raw scripts. All automation scripts must reside within and be documented by their respective skills in `.agents/skills/`. Use `local-testing-and-deployment`, `song-catalog-management`, and `release-management` skills directly.

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
- [x] ESM, TypeScript & ESLint Modernization (Strict TSC/Linter Compilation passing)
- [x] Modular Licensing Engine, Translucency Card Badges & DMCA Safe Harbor Policies (v1.2.31)
- [x] Split-Architecture Choir Access Controls & Dynamic PSK Authentication (v1.2.37)
- [x] Public Song Thumbnail Gateway & Credential-Aware Offline Sync (v1.2.38)
- [x] High-Fidelity Display Calibration Zoom Slider & Circular Glass Controls (v1.2.40)
- [x] Clean Up Redundant Version Footer in Settings View (v1.2.41)
- [x] High-Contrast Split-Architecture About & Legal View (v1.2.42)
- [x] Secure Video Rehearsal Playback & Authenticated Downloads (v1.2.43)
- [x] Standard UUIDv4 Choir PSK Obfuscation Migration (v1.2.44)
- [x] Binding key/src Direct to HTML5 Video for React Hot-Reload (v1.2.46)
- [x] API-Aware Service Worker Runtime Caching and Unified Offline Sync Caching (v1.2.47)
- [x] Local & Production Songbook Sync and Thumbnail Auto-Regeneration (v1.2.52)
- [x] Decoupled API Gateway GHCR Automation Pipeline & Tag Release v1.0.0 (v1.2.52)
- [x] Production K8s Pure Registry Deployment Config & Automated Testing Suite (v1.2.52)
- [x] Production K8s cert-manager & Let's Encrypt automated TLS integration (v1.2.53)
- [x] Custom-titled downloads with dynamic Content-Disposition headers for MSCZ/MXL/PDF buttons (v1.2.54)
- [x] Cross-origin CORS exposed headers and Service Worker download bypass hardening (v1.2.55)
- [x] Inline PDF rendering support with cross-origin target="_blank" view and direct MSCZ/MXL attachment downloads (v1.2.56)
- [x] Idempotent production API deployment via rolling restart mechanism in deploy-prod-api.sh (v1.2.57)
- [x] Unified RESTful API Router with /api/v1 versioning and legacy backward-compatible alias routing (v1.2.59)
- [x] Query-controlled Content-Disposition supporting browser-inline rendering for PDF downloads (v1.2.59)
- [x] Restored service worker runtime caching for PDF/MSCZ files and resolved mobile PWA new-tab/external PDF breaks using premium full-screen inline React overlays with v=hash cache integrity (v1.2.60)
- [x] High-contrast fullscreen inline React PDF overlay viewer, resolved floating promise ESLint blocks, modularized deploy-api vs. push-songbook scripting, and deployed production release v1.2.61 / api-v1.0.2 (v1.2.61)
- [x] Strict API /api/v1 URI versioning enforcement, 16-checkpoint test suite implementation, local sandbox K3s rolling restart deployment, and automated Markdown Audit Report generator with nested list layout spacing fixes (v1.2.62 / api-v1.0.3)
- [x] Comprehensive visual Markdown Chorus User Guide with local screenshots and accurate UX rehearsal suite steps (v1.2.65)
- [x] Stateless Service Worker token recovery from IndexedDB, cross-origin iframe navigation Blob URL conversion, and cap setTimeout to 24 hours to prevent integer overflow (v1.2.71)
- [x] Workbox caching strategy optimization to CacheFirst for score files and 5s timeout on dynamic catalog fetches, with static offline mode indicators (v1.2.73)
- [x] Optional Instrumental Rehearsal Track Part Support with automatic pattern discovery and local k3s deployment verification (v1.3.0)
- [x] Local API routing protection and friendly score loading error page handler (v1.3.3)
- [x] Explicit PWA Service Worker scope alignment for DevTools Application visibility (v1.3.4)
- [x] Battle Hymn of the Republic Asset Ingestion & Copyright Configuration (v1.3.5-prep)
- [x] K3s Client Certificate Health & Auto-Refresh Script (scripts/refresh-k3s-certs.sh)
- [x] Local Pre-Production Testing SOP, Agent Skill & Knowledge Base (.agents/skills/local-testing-and-deployment)
- [x] Battle Hymn of the Republic Local K3s Ingestion & 16-Checkpoint Verification Passed
- [x] Smart Part Names & Abbreviations Rendering for Multi-Staff SATB Scores (v1.3.5-prep)
- [x] OpenSpec Toolchain Initialization & Modular Living Specs Migration (openspec v1.2.0)
- [x] OpenSpec Agent Governance Rules, Spec Management Skill, and Change Workflow (.agents/rules/openspec.md)
- [x] VPS Client Certificate Auto-Refresh Script & Integration (scripts/refresh-vps-certs.sh)
- [x] VPS Traffic Redirect & SSH Tunnel Preflight Guard (scripts/check-vps-redirect.sh)
- [x] Role-Based Admin JWT Authentication & In-App Song Archival Suite (v1.3.5 / api-v1.1.0)
- [x] Production Deployment & 25/25 Endpoint Verification on VPS (v1.3.5)
- [x] Card lower controls layout refinement (Info & Admin action button separation) (v1.3.5)
- [x] Music Notation Unicode Standards enforcement rule (`♭`, `♯`, `♮`) & metadata normalization (v1.3.5)
- [x] Persistent Repertoire State Engine (`repertoire_state.json`), API v1.1.1 overlay, 26/26 test checkpoints, & CLI pull utility (v1.3.5 / api-v1.1.1)
- [x] Automated Orphan Repertoire State Pruning & OpenSpec Spec-First Rule enforcement (v1.3.6 / api-v1.1.1)
- [x] Full Migration of Raw Scripts into Self-Documenting Agent Skills (`song-catalog-management`, `release-management`, `local-testing-and-deployment`) (v1.3.6)
- [x] Production Deployment of v1.3.6 (GitHub Pages PWA) & api-v1.1.1 (GHCR Docker Container) with 27/27 verification checkpoints passed on live VPS (v1.3.6 / api-v1.1.1)

## Key Context Points
- **Domain**: Veteran music, SATB vocal arrangements, MusicXML.
- **GitHub Pages URL**: `https://chuck650.github.io/MVET_Songbook/`
- **Automation**: GitHub Actions workflow `.github/workflows/deploy.yml` manages automated Vite PWA compilation and deployment.
- **Precision**: v1.1.68 implements the Atomic Vertical Fit (86vh) and Infinite Canvas (uncapped max-width) for flawless landscape mobile stability.
- **Visuals**: Universal symmetric margins (4.0L / 4.0R) ensure the sheet music is flawlessly centered under the title across all device types and orientations, preventing any right-skew or overflow.
- **Performance Mode**: Unconstrained `:not(.performance-mode)` SVG scaling ensures the single horizontal staffline renders at its full crisp width without vertical squishing.
- **Type-Safety & Code Standards**: TypeScript strict mode compiles flawlessly with a robust ESLint v9 configuration to guard all Web Audio and score parsing interfaces. Root ESLint setup has been refined to ignore containerized server paths (`api/`), enabling 100% error-free linter runs across the entire client PWA interface.

## Next Steps
1. Decompose the monolithic `MusicViewer.tsx` into clean, atomic subcomponents (`AudioMiniPlayer.tsx`, `RehearsalDrawer.tsx`, etc.).
2. Segment the modular stylesheets for isolated components from `Songbook.css`.

---
*Last updated by Antigravity on 2026-09-22 (v1.3.6 / api-v1.1.1 / skills-migration-prod-release)*



