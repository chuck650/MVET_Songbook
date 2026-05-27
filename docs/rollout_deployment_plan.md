# 🚀 Production Rollout and Deployment Plan

This document establishes the precise, chronological command sequence to safely deploy the versioned `/api/v1` routes and the Service Worker Token Synchronization Engine to our production environments.

---

## 📈 Summary of Environments & Decoupled Triggers

*   **API Gateway (VPS Kubernetes):** Docker image built and published to GHCR strictly on tags matching **`api-v*`**. Deployed over secure context via Traefik ingress.
*   **Frontend PWA (GitHub Pages):** Built and deployed to public pages strictly on tags matching **`v*`**.

---

## 📅 Chronological Step-by-Step Progression

### Step 1: Pre-Deployment Verification & Local Staging
Validate that all local code changes on our feature branch `feat/sw-token-auth` compile perfectly without syntax or styling defects.

1.  **Run strict linter & compiler checks:**
    ```bash
    npm run lint
    npm run build
    ```
2.  **Stage all verified local changes:**
    ```bash
    git add .
    ```
*   **Gating Condition:** Zero TypeScript compiler errors or ESLint warnings.

---

### Step 2: Build, Publish & Confirm the Production API Container (GHCR)
We must compile and register our updated versioned API container in the public cloud.

1.  **Commit the local modifications to the feature branch:**
    ```bash
    git commit -m "feat(auth): sw token sync and strict api versioning v1.2.62"
    git push origin feat/sw-token-auth
    ```
2.  **Tag the commit with the next API release version:**
    ```bash
    git tag api-v1.0.3
    ```
3.  **Push the tag to GitHub to trigger the automated container compiler (`deploy-api.yml`):**
    ```bash
    git push origin api-v1.0.3
    ```
4.  **Confirm and monitor workflow completion using the GitHub CLI (`gh`):**
    *   **Monitor in real-time:**
        ```bash
        gh run watch
        ```
        *(Or list the most recent runs to confirm a green checkmark: `gh run list --workflow="Deploy API to GHCR" --limit 1`)*
*   **Gating Condition:** The GitHub CLI must report that the run completed with a `success` status. Do **not** proceed to Step 3 until this run is fully completed and green.

---

### Step 3: Rollout the Production API Server (VPS Kubernetes)
Once the new container is safely stored in GHCR, apply the deployment manifests and execute the rolling restart on the remote VPS.

1.  **Execute the production rollout script:**
    ```bash
    npm run deploy-prod-api
    ```
    *This script targets the `vps-production` context, uploads local `.env.secrets` securely, applies production K8s manifests, and triggers a rolling pod restart to pull the fresh container.*
2.  **Verify production API health:**
    ```bash
    node scripts/test-api.js prod <your-production-psk>
    ```
*   **Gating Condition:** All 16 verification endpoints must return a successful Zulu-formatted PASS status.

---

### Step 4: Promote and Deploy the PWA Client (GitHub Pages)
Now that the API gateway is versioned and ready to handle incoming `/api/v1` fetches, we deploy the frontend client.

1.  **Switch to the mainline branch and merge the verified feature changes:**
    ```bash
    git checkout main
    git merge feat/sw-token-auth
    ```
2.  **Tag the mainline commit with the client release version:**
    ```bash
    git tag v1.2.62
    ```
3.  **Push the merge and the release tag to GitHub to trigger the PWA compiler (`deploy.yml`):**
    ```bash
    git push origin main --tags
    ```
4.  **Confirm PWA compiler completion using the GitHub CLI:**
    ```bash
    gh run list --workflow="Deploy to GitHub Pages" --limit 1
    ```
*   **Gating Condition:** The GitHub CLI must report a successful completed run status for the PWA compiler workflow.

---

### Step 5: Live Verification & Activation Check
Verify the live environment to ensure complete client-server token synchronization.

1.  Open the live URL: `https://chuck650.github.io/MVET_Songbook/`.
2.  Input your active Access Key.
3.  Load the interactive rehearsal suite for any copyrighted song.
4.  **Confirm that the Address Bar and `<audio>` markup contain zero `?token=...` query secrets.**
5.  Check the Network tab to confirm that outbound fetches to `/api/v1/songs/...` carry the `Authorization: Bearer` header under the hood.
