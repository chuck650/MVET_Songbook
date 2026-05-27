# Architectural Guide: Project Organization and Git Strategy

This document establishes the official project layout standard, directory architecture, and Git branching workflow for the **MVET Songbook** workspace. It acts as the operational standard to ensure rapid feature integration, maintain type-safe code boundaries, and prevent branching drift.

---

## 1. Directory Layout & "Hybrid Monorepo" Structure

The MVET Songbook codebase operates as a **hybrid monorepo**. It contains two major software components and one decoupled content database within a single unified Git repository. This layout provides the benefits of monorepo isolation without the configuration complexity of multi-package managers (like Yarn Workspaces or Turborepo).

```text
/                      <-- Frontend Root Workspace (Netlify Hosted)
├── public/            <-- Public Static Assets
│   ├── assets/        <-- UI Icons, Images, and Logos
│   ├── songs.json     <-- Generated Songbook Database Manifest
│   └── songs/         <-- Songbook Files (Protected MSCZ, MXL, PDF, MP3)
├── src/               <-- Frontend Source Code (Vite + React PWA)
│   ├── hooks/         <-- React Custom Hooks (Auth, WebAudio)
│   ├── songbook/      <-- Songbook UI Components & Stylesheets
│   ├── types/         <-- Common Shared TypeScript Interfaces
│   └── version.ts     <-- Automatic PWA App Version Pointer
├── k8s/               <-- Kubernetes Deployment Manifests (Local vs. Prod)
├── scripts/           <-- Local Automation Utilities (Sync, Manifests, Deploys)
│
├── api/               <-- Backend Gateway Workspace (VPS K3s Hosted)
│   ├── src/           <-- API Source Code (Express + TypeScript)
│   ├── package.json   <-- Isolated API Dependency Matrix
│   ├── tsconfig.json  <-- Isolated Backend TypeScript Compiler Options
│   └── Dockerfile     <-- OCI Container Image Build Configuration
│
└── docs/              <-- Technical Specifications & Architecture ADRs
```

### Separation of Concerns Matrix

| Component | Code Location | Primary Tech Stack | Production Hosting Environment |
| :--- | :--- | :--- | :--- |
| **Frontend PWA** | Root `/`, `/src` | React, Vite, Workbox PWA | GitHub Pages |
| **Backend API** | Subfolder `/api` | Express, TypeScript, Node | VPS Kubernetes Cluster (`vps-production`) |
| **Songbook DB** | `/public/songs*` | MuseScore, MusicXML, audio | K8s Persistent Volume Claim (PVC) |

---

## 2. Git Branching Strategy: Trunk-Based Development

To maintain a flawless production pipeline and avoid complex merge conflicts ("Merge Hell"), this project mandates a **Trunk-Based Development** branching strategy with short-lived feature branches.

### A. The Core Branches

1.  **`main` (The Production-Ready Trunk)**:
    *   The single source of truth for stable releases.
    *   `main` must **always** compile, pass all linting checks, and be deployable to production.
    *   No direct commits are made to `main` for code updates. All features must arrive via merged branches.
2.  **Short-Lived Feature Branches (`feat/` or `fix/`)**:
    *   Created for a single specific task (e.g., `feat/sw-token-auth` or `fix/audio-glitch`).
    *   **Lifespan**: Should be merged back into `main` quickly, ideally within 1-3 days.
    *   Allows developers to modify both client and server files concurrently so their feature dependencies are tested as a unified whole.

---

## 3. Deployment & Release Tagging Rules

When a feature branch is merged back to `main`, releases are tagged using standard semantic versioning protocols.

### A. Double-Tag Version Alignment
Because the backend API and frontend PWA are decoupled, they are tagged separately:
*   **PWA Client Application**: Tagged as `vX.Y.Z` (e.g., `v1.2.61`). Managed automatically during builds via `npm run build`.
*   **Backend API Container**: Tagged as `api-vA.B.C` (e.g., `api-v1.0.2`). This tag triggers the GitHub Container Registry (GHCR) compilation pipeline.

### B. Production Release Sequence

Once a branch is merged into `main`:
1.  **Tag and Push**: Create and push tags to GitHub:
    ```bash
    git tag v1.2.xx && git tag api-v1.0.yy
    git push origin main --tags
    ```
2.  **CI/CD Build**: GitHub Actions automatically compiles and pushes the PWA to GitHub Pages, and builds the Express API gateway to GHCR.
3.  ** VPS Cluster Rollout**: Once the GHCR image is ready, deploy the container to your live VPS using the production deploy script:
    ```bash
    npm run deploy-prod-api
    ```

---

## 4. The Decoupled Database Pipeline (Zero-Downtime Sync)

The **Songbook Database of Files** (`songs/` and `songs.json`) operates as a completely independent subcomponent. 

*   **Rule**: Changes to the music library (adding/removing songs, modifying timing maps, updating raw scores) **do not require code changes, git branching, or API restarts**.
*   **Workflow**:
    1.  Place new score exports in `public/songs/`.
    2.  Run `npm run sync` to verify changes and auto-regenerate the SHA-256 asset hashes inside `public/songs.json`.
    3.  Sync the database files to the environment's storage volume:
        *   **Local Development**: `npm run push-songbook local` (updates `/var/data/mvet-songbook`).
        *   **Production VPS**: `npm run push-songbook prod` (securely `rsync`s directly into the live production Kubernetes persistent volume over SSH).
