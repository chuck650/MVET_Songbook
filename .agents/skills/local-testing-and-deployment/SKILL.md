---
name: local-testing-and-deployment
description: Manages the local k3s-local Kubernetes testing environment, handles K3s certificate rotation recovery, and guides the end-to-end song ingestion and local browser verification pipeline for MVET Songbook.
---

# Skill: Local Testing & Songbook Deployment Pipeline

This skill guides the preparation, maintenance, and verification of the local test environment (`k3s-local`), troubleshooting K3s client certificates, and executing the pre-production song ingestion pipeline.

---

## 1. Environment Topology & Context Guard

The user manages three distinct cluster contexts:

| Context | Server / IP | Role | Access Method |
|:---|:---|:---|:---|
| **`k3s-local`** | `https://127.0.0.1:6443` | **Local Test Server** (Testing Ground) | Local K3s, `/var/data/mvet-songbook`, `http://mvet-api.test` |
| **`talos-home`** | `https://10.51.60.43:6443` | **Home Cluster** (LAN Infrastructure) | Talos Linux physical cluster |
| **`vps-production`** | `https://10.51.51.7:6443` | **Live Production** (Internet-Facing) | Remote VPS, `https://mvet-api.cminfosec.com` |

> [!IMPORTANT]
> **Strict Pre-Production Gate Rule**:
> NEVER push songbook assets or API deployments to `vps-production` without first verifying end-to-end functionality on `k3s-local` and conducting visual/audio playback checks in the local browser.

To verify the active context:
```bash
kubectl config current-context
# Must output: k3s-local
```

If it is not set to `k3s-local`:
```bash
kubectl config use-context k3s-local
```

---

## 2. K3s Certificate Rotation & Troubleshooting

### Symptoms
When running `kubectl` commands against `k3s-local`, the command fails with:
```text
error: You must be logged in to the server (the server has asked for the client to provide credentials)
```

### Root Cause
K3s client certificates expire after 1 year. While K3s automatically rotates internal certificates and writes fresh credentials into `/etc/rancher/k3s/k3s.yaml`, the user's `~/.kube/config` retains the old, expired certificate for user `default`.

### Resolution Procedure

1. **Check Certificate Health**:
   ```bash
   bash .agents/skills/local-testing-and-deployment/scripts/refresh-k3s-certs.sh --check-only
   ```
2. **Refresh Stale Credentials**:
   ```bash
   bash .agents/skills/local-testing-and-deployment/scripts/refresh-k3s-certs.sh
   ```
   *This script backs up `~/.kube/config` and safely extracts the updated `client-certificate-data`, `client-key-data`, and `certificate-authority-data` from `/etc/rancher/k3s/k3s.yaml` into only the `default` cluster and user blocks, preserving `talos-home` and `vps-production`.*
3. **Verify Connectivity**:
   ```bash
   kubectl --context k3s-local get nodes
   ```

### VPS Production Certificate Maintenance (`vps-production`)
When deploying or communicating with `vps-production`, client certificates can also expire yearly:
1. **Check Certificate Health**:
   ```bash
   bash .agents/skills/local-testing-and-deployment/scripts/refresh-vps-certs.sh --check-only
   ```
2. **Automatic Refresh**:
   ```bash
   bash .agents/skills/local-testing-and-deployment/scripts/refresh-vps-certs.sh
   ```
   *This automatically backs up `~/.kube/config`, retrieves the active credentials from `/etc/rancher/k3s/k3s.yaml` on the VPS via SSH, updates the `vps-admin` user, and verifies cluster connectivity. It is also executed automatically as a preflight step in `scripts/deploy-prod-api.sh`.*

### VPS Traffic Redirect & SSH Tunnel Preflight (`vps-production`)
When developing or testing other local services, a local forwarding tunnel or firewalld redirect may be active (managed via `~/.local/bin/vps connect` / `disconnect`):
- If the redirect is active, it redirects external WAN traffic destined for `83.229.67.95:443` across an SSH port forward on port 4443, which breaks direct public HTTPS connectivity to `https://mvet-api.cminfosec.com`.
- **Preflight Check**:
  ```bash
  bash .agents/skills/local-testing-and-deployment/scripts/check-vps-redirect.sh
  ```
- **Resolution**:
  ```bash
  vps disconnect
  # Or run with auto-disconnect:
  bash .agents/skills/local-testing-and-deployment/scripts/check-vps-redirect.sh --auto-disconnect
  ```
  *This check is built directly into `scripts/deploy-prod-api.sh`, `scripts/push-songbook.sh prod`, and `scripts/test-api.js prod`.*

---

## 3. End-to-End Song Ingestion & Testing Pipeline

Whenever a new song is added or updated from the Music project (`~/Projects/Music/MVET/`):

### Step 1: Asset Ingestion
Sync the song assets into the web application repository:
```bash
# For a specific song:
bash scripts/sync-song.sh <Song_Directory_Name>

# For all catalog songs:
bash scripts/sync-all-songs.sh
```
*Note: `sync-song.sh` automatically swaps the direct-stream-copied merged video (`*-Merged.mp4`) to the main video name.*

### Step 2: Manifest Generation
Scan `public/songs/`, compute SHA-256 hashes, and generate `public/songs.json`:
```bash
node scripts/generate-manifest.cjs
```

### Step 3: Context Check
Ensure the active context is `k3s-local`:
```bash
kubectl config current-context
```

### Step 4: Push to Local Storage Volume
Rsync `public/songs.json` and `public/songs/` into the local hostPath mount `/var/data/mvet-songbook/`:
```bash
npm run push-songbook local
```

### Step 5: Run Automated API Integration Tests
Execute the 16-point integration test suite against the local API gateway (`http://mvet-api.test`):
```bash
node scripts/test-api.js dev
```
Verify that all checkpoints pass with a 100% success rate.

### Step 6: Browser Verification
Start the development server:
```bash
npm run dev
```
Open [http://localhost:5173/songbook/](http://localhost:5173/songbook/) in the local browser to verify:
1. Catalog card renders with the correct song title and thumbnail.
2. MusicXML score renders crisp and centered in OpenSheetMusicDisplay.
3. Audio playback starts and synchronizes with the cursor.
4. Part switching (SATB, Soprano, Alto, Tenor, Bass) functions properly.
5. Smart Part Labels: In multi-staff scores, system 1 shows full names and subsequent systems show abbreviations (e.g., Unison/U., Women/W., Men/M.); isolated practice parts suppress labels.
6. Gated downloads (MSCZ, MXL, PDF) succeed with valid session tokens.

### Step 7: Production Release (Only After User Approval)
Only after the user reviews and confirms everything is working locally:
```bash
# Push song files to production VPS volume:
npm run push-songbook prod

# If API code changes occurred:
npm run deploy-prod-api

# Commit changes, tag release, and push to GitHub:
git add .
git commit -m "feat(catalog): add <Song Title> to songbook"
npm run bump:minor # or bump:build
git push origin main --tags
```
