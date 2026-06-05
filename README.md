# MVET Songbook

**The premier digital resource for veteran-focused vocal arrangements.**

MVET Songbook is a high-fidelity rehearsal platform and sheet music library dedicated to military service songs. Designed for veteran choirs and vocalists, it combines professional SATB arrangements with high-performance web technology to ensure every performance honors the service it celebrates.

---

## 🏛 Three-Tier Architecture

The system is designed with three isolated tiers to balance public PWA availability with strict copyright licensing compliance:

1. **The Songbook & Metadata Database**: A high-fidelity structured audio, video, sheet music (MusicXML/PDF), and thumbnail library synced into local cluster volumes via out-of-band delta synchronization.
2. **The Backend API Gateway**: A TypeScript-based containerized Express REST gateway that manages dynamic catalog masking, JWT access control lifecycles, and token-authorized media streaming.
3. **The Frontend PWA**: A static, modern React application built using Vite, fully offline-reliable with Workbox Service Worker caching, and rendered natively on client tablets and mobile screens.

---

## 🛠 Tech Stack

- **Frontend Client**: Vite + React (PWA with Workbox offline reliable synchronization)
- **API Backend**: Express + TypeScript stateless REST gateway container
- **API Spec**: OpenAPI 3.0 (with interactive Swagger UI documentation at `/docs`)
- **Audio Engine**: Web Audio API (48kHz/24-bit optimized) with Network-Aware Auto-Play
- **Rendering Engine**: OpenSheetMusicDisplay (OSMD) with asymmetric centering
- **Deployment & Orchestration**: Docker, Kubernetes (k3s on local development and remote VPS production contexts)
- **Asset Transfer**: High-performance secure SSH rsync delta synchronization
- **Dev Environment**: Built using [Google Antigravity](https://antigravity.google) Agentic IDE.

---

## 📦 Getting Started

### Prerequisites
- Node.js (Latest LTS)
- npm
- Docker & Kubernetes (`kubectl` config with your cluster contexts)
- SSH keys configured for the host alias `vps` in your local SSH config (`~/.ssh/config`)

### Installation
```bash
git clone https://github.com/chuck650/MVET_Songbook.git
cd MVET_Songbook
npm install
```

---

## 🛠 Development & Testing Setup

### 1. Synchronize Song Assets (Local MuseScore Exports)
To compile the local database manifest and parse all exported MuseScore tracks into your project:
```bash
npm run sync
```
*This command runs the `sync-all-songs.sh` worker script, generating `public/songs.json` with secure SHA-256 hashes and extracting new thumbnails.*

### 2. Local Cluster Development (k3s-local)
Boot the local API backend container and volume mounts within your local Kubernetes cluster:

1. **Deploy local K3s architecture**:
   ```bash
   bash scripts/deploy-local.sh
   ```
   *Deploys the Express gateway pod under the `mvet-songbook` namespace, loads local secrets from `.env.secrets`, and exposes http://mvet-api.test*

2. **Rebuild/Reload local code modifications**:
   If you edit the Express code in the `/api` directory, rebuild and reload the local container instantly:
   ```bash
   bash scripts/build-and-import.sh
   ```

3. **Deploy the songbook database to local volume**:
   ```bash
   npm run push-songbook local
   ```
   *Syncs your database manifest and media directories directly into your local cluster volume path `/var/data/mvet-songbook`.*

4. **Start the Vite frontend dev server**:
   ```bash
   npm run dev
   ```
   *Runs the Vite development server locally at http://localhost:5173/songbook/*

5. **Verify with local integration tests**:
   ```bash
   node scripts/test-api.js dev <your-local-psk>
   ```

### 3. PWA Testing Strategy (Dev vs. Preview)
To ensure the offline synchronization and Service Worker caching layers work flawlessly, our official testing strategy enforces verifying builds locally before tagging releases:

* **For general UI and logic changes:** Run `npm run dev`. This launches the Vite development server with Hot Module Replacement (HMR). The service worker is bypassed in dev mode to avoid loading stale cached code while you write files.
* **For testing PWA features, caching, and offline status:**
  1. Compile the production bundle locally:
     ```bash
     npm run build
     ```
  2. Start the production simulator:
     ```bash
     npm run preview
     ```
  3. Open `http://localhost:4173/songbook/` in your browser. This serves the optimized production build and activates the Workbox Service Worker, allowing you to test offline status indicators, range caching, and network timeouts.

---

## 🚀 Production Deployment & Release Workflows

Deployments are strictly decoupled to protect copyrighted assets while keeping the public interfaces globally available.

### 1. Deploying the PWA (GitHub Pages)
The static frontend client PWA is deployed to GitHub Pages automatically via GitHub Actions whenever you push a PWA release tag.

#### Build Versioning Process (Idempotent Versioning)
Our build process is fully idempotent; version numbers are **never** auto-incremented during build compilation. Instead, the version must be bumped manually prior to release commits:
- **Major Release:** `npm run bump:major` (e.g., `1.2.71` -> `2.0.0` - resets minor and build numbers to 0)
- **Minor Release:** `npm run bump:minor` (e.g., `1.2.71` -> `1.3.0` - resets build number to 0)
- **Build/Patch Release:** `npm run bump:build` (e.g., `1.2.72` -> `1.2.73` - increments the patch version)

#### Release Steps:
1. **Manually bump the version** (updates `package.json` and `src/version.ts`):
   ```bash
   npm run bump:build
   ```
2. **Commit and push PWA changes**:
   ```bash
   git add .
   git commit -m "chore: release version v1.2.73"
   git push origin main
   ```
3. **Tag and release**:
   ```bash
   git tag v1.2.73
   git push origin v1.2.73
   ```
   *GitHub Actions will capture the tag and compile/deploy the static code directly to `https://chuck650.github.io/MVET_Songbook/`.*

### 2. Deploying the API Gateway (GHCR & kubectl)
The Express container does **not** contain any copyrighted music files, making it completely safe to build and compile in the public cloud.

1. **Build and publish the API image**:
   Push an `api-v*` tag to trigger the automated container compilation and publish it directly to the GitHub Container Registry (GHCR):
   ```bash
   git tag api-v1.0.0
   git push origin api-v1.0.0
   ```
   *This compiles the TypeScript code and registers `ghcr.io/chuck650/mvet-api:latest`.*

2. **Launch the remote infrastructure (kubectl-only)**:
   Deploy the published container and workstation secrets directly to your remote VPS cluster context over your secure Wireguard tunnel:
   ```bash
   npm run deploy-prod-api
   ```
   *This commands targets your `vps-production` cluster context, securely generates K8s secrets from your local `.env.secrets` file without checking them into Git, applies the pure deployment manifests `k8s/api-deployment-prod.yaml` & `k8s/ingress-prod.yaml` under the identical namespace `mvet-songbook`, and awaits container readiness.*

### 3. Deploying the Private Songbook Volume (SSH rsync)
To sync your copyrighted SATB media files directly from your control workstation to the VPS persistent storage (bypassing the public cloud entirely):
```bash
npm run push-songbook prod
```
*This connects securely over your SSH `vps` host config, configures file permissions on `/var/data/mvet-songbook`, and executes an ultra-fast, delta-optimized `rsync` sync.*

### 4. Verifying Production Stability
Test all five security layers and streaming endpoints natively on the remote host:
```bash
node scripts/test-api.js prod <your-production-psk>
```

---

## 📄 Documentation

- **Technical Specification**: [OPENSPEC.md](OPENSPEC.md) — The authoritative ground truth for schemas and APIs.
- **Design Philosophy**: [DESIGN.md](DESIGN.md) — Architectural rationale and design decisions.
- **Project Status**: [GEMINI.md](GEMINI.md) — Current state and roadmap.

## ⚖️ License
Proprietary. All arrangements are protected by copyright and licensed specifically for MVET performance use.

---
*Created and maintained with Google Antigravity Agentic IDE.*
