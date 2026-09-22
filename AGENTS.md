# MVET Songbook - Agent Instructions & Knowledge Base

## Project Overview
**MVET Songbook** is a progressive web application (PWA) and decoupled Express API gateway delivering interactive, high-precision rehearsal resources and sheet music for veteran-focused vocal arrangements.

- **Frontend Client**: Vite + React + TypeScript + OpenSheetMusicDisplay + Web Audio API.
- **Backend API**: Express REST API (`/api/v1/`), JWT choir PSK authentication, gated downloads, OpenAPI/Swagger docs.
- **Production Host**: GitHub Pages (Client PWA) + Production VPS Kubernetes Cluster (`https://mvet-api.cminfosec.com`).
- **Local Test Server**: Local K3s cluster (`k3s-local` at `http://mvet-api.test`).

---

## 🧭 Environment Topology & Rules

| Context Name | Server Address | Description | Primary Use Case |
|:---|:---|:---|:---|
| **`k3s-local`** | `https://127.0.0.1:6443` | Local K3s cluster on dev machine | **Local Test Server** for pre-production validation |
| **`talos-home`** | `https://10.51.60.43:6443` | Physical Talos home cluster | General home lab infrastructure |
| **`vps-production`** | `https://10.51.51.7:6443` | Internet VPS cluster | **Live Production** serving live users |

### 🚨 Golden Rule: Mandatory Pre-Production Gate
**Never deploy application code or songbook assets to `vps-production` without first verifying end-to-end functionality on `k3s-local` and in the local browser.**

1. Always verify the active context is `k3s-local` before local testing:
   ```bash
   kubectl config current-context
   ```
2. Never switch contexts or push to `prod` unless explicitly instructed and approved by the user.

---

## 🛠️ Local Test Server Setup & Maintenance

### Local API Gateway
- **Ingress URL**: `http://mvet-api.test` (configured via Traefik IngressRoute `mvet-api-ingress-local`).
- **Storage Volume**: `/var/data/mvet-songbook/` (mounted into `/app/data` via `DirectoryOrCreate` hostPath).
- **Secrets**: Namespace `mvet-songbook`, secret `mvet-auth-secrets` generated from `.env.secrets`.

### K3s Certificate Rotation & Troubleshooting
K3s client certificates expire every 365 days. When `kubectl` commands report:
```text
error: You must be logged in to the server (the server has asked for the client to provide credentials)
```
1. Run the health check:
   ```bash
   bash .agents/skills/local-testing-and-deployment/scripts/refresh-k3s-certs.sh --check-only
   ```
2. If expired or expiring soon, run the automatic refresh:
   ```bash
   bash .agents/skills/local-testing-and-deployment/scripts/refresh-k3s-certs.sh
   ```
   *This safely updates the `default` user and cluster blocks in `~/.kube/config` using `/etc/rancher/k3s/k3s.yaml` while leaving `talos-home` and `vps-production` intact.*

### VPS Certificate Rotation (`vps-production`)
If `vps-production` client credentials expire, run:
```bash
bash .agents/skills/local-testing-and-deployment/scripts/refresh-vps-certs.sh
```
*This retrieves the renewed credentials from `/etc/rancher/k3s/k3s.yaml` on the VPS over SSH and updates the `vps-admin` user block in `~/.kube/config` automatically.*

---

## 📦 Song Deployment Pipeline

### 1. Ingest Song Files
Sync from `~/Projects/Music/MVET/<SongID>/` to `public/songs/<SongID>/`:
```bash
bash scripts/sync-song.sh <SongID>
# Or sync all:
bash scripts/sync-all-songs.sh
```

### 2. Generate Manifest
```bash
node scripts/generate-manifest.cjs
```

### 3. Sync to Local Volume
```bash
npm run push-songbook local
```

### 4. Run API Tests
```bash
node scripts/test-api.js dev
```

### 5. Test in Local Browser
```bash
npm run dev
```
Open `http://localhost:5173/songbook/` and perform visual and auditory verification.

### 6. Production Push (Strictly Upon Approval)
```bash
npm run push-songbook prod
```

---

## 🎼 Score Display & Part Label Standards

To support complex choral scores (such as multi-stave arrangements like *Battle Hymn of the Republic*):

- **Multi-Staff & SATB Scores (`activePartKey === 'full'`)**:
  - Automatically enable `drawPartNames: true` and `drawPartAbbreviations: true`.
  - **System 1**: Displays full part names (e.g. `Unison`, `Women`, `Men`).
  - **System 2+**: Displays standard abbreviations (e.g. `U.`, `W.`, `M.`).
- **Isolated Practice Parts (`Soprano`, `Alto`, `Tenor`, `Bass`, etc.)**:
  - Automatically suppress labels (`false`) to maximize horizontal screen width on single-staff scores.
- **Performance Mode**:
  - Suppress labels (`false`) to ensure smooth, uncrowded horizontal strip scrolling.

---

## 📋 OpenSpec Spec-Driven Development Toolchain

The project utilizes the **OpenSpec** CLI toolchain (`openspec`, version 1.2.0) to maintain formal living specifications and govern change proposals.

- **Living Specifications**: Located in [`openspec/specs/`](file:///home/chuck/Projects/www/MVET_Songbook/openspec/specs/) (`architecture`, `auth`, `score-rendering`, `audio-sync`, `catalog`).
- **Validate Specifications**:
  ```bash
  openspec validate --specs
  ```
- **Slash Commands**:
  - `/opsx:propose "<name>"`: Generate a structured change proposal (`proposal.md`, `design.md`, delta `specs/`, `tasks.md`).
  - `/opsx:apply`: Apply implementation tasks.
  - `/opsx:archive "<name>"`: Merge change deltas into living specs and archive.
  - `/opsx:explore`: Explore technical ideas and architectures.

---

## 📚 Related Documentation
- Master Spec Index: [OPENSPEC.md](file:///home/chuck/Projects/www/MVET_Songbook/OPENSPEC.md)
- Design Architecture: [DESIGN.md](file:///home/chuck/Projects/www/MVET_Songbook/DESIGN.md)
- Project Context & Log: [GEMINI.md](file:///home/chuck/Projects/www/MVET_Songbook/GEMINI.md)
- Local Deployment Skill: [.agents/skills/local-testing-and-deployment/SKILL.md](file:///home/chuck/Projects/www/MVET_Songbook/.agents/skills/local-testing-and-deployment/SKILL.md)
- OpenSpec Living Specs: [openspec/specs/](file:///home/chuck/Projects/www/MVET_Songbook/openspec/specs/)


