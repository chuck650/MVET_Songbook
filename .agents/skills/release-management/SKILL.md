---
name: release-management
description: Governs version bumping (major, minor, patch/build), synchronized updates across package.json and src/version.ts, and release tagging for GitHub Pages PWA and GHCR Docker API containers.
---

# Skill: Release Management & Version Control

This skill guides semantic versioning, version synchronization, git tag creation, and deployment triggers for the **MVET Songbook** Progressive Web Application and Decoupled Express API Gateway.

---

## 1. Versioning Architecture

The project maintains two decoupled release cycles:

1. **Client PWA (GitHub Pages)**:
   - Version tracked in `package.json` (`version`) and `src/version.ts` (`export const VERSION = '...'`).
   - Git release tags follow `v<semver>` (e.g. `v1.3.5`).
   - Pushing a `v*` tag triggers the GitHub Actions workflow `.github/workflows/deploy.yml` which compiles Vite and publishes to GitHub Pages.

2. **Backend API Gateway (GHCR / K8s)**:
   - Version tracked in `api/package.json` and OpenAPI spec `api/src/openapi.ts`.
   - Git release tags follow `api-v<semver>` (e.g. `api-v1.1.1`).
   - Pushing an `api-v*` tag triggers `.github/workflows/deploy-api.yml` which builds and publishes multi-arch Docker images to GitHub Container Registry (`ghcr.io/chuck650/mvet-api:<version>`).

---

## 2. Bumping Versions

Use the automated version bumper script:
```bash
# Increment build/patch version (e.g. 1.3.5 -> 1.3.6):
node .agents/skills/release-management/scripts/bump-version.cjs build
# Or via npm shortcut:
npm run bump:build

# Increment minor feature version (e.g. 1.3.5 -> 1.4.0):
node .agents/skills/release-management/scripts/bump-version.cjs minor
# Or via npm shortcut:
npm run bump:minor

# Increment major version (e.g. 1.3.5 -> 2.0.0):
node .agents/skills/release-management/scripts/bump-version.cjs major
# Or via npm shortcut:
npm run bump:major
```

### What `bump-version.cjs` Does:
1. Parses semantic version string from `package.json`.
2. Computes the next version number.
3. Updates `package.json`.
4. Updates `src/version.ts` so the client UI and Settings drawer display the exact version string.

---

## 3. Release Checklist & Procedures

### Client PWA Release
1. Run preflight checks:
   ```bash
   npm run lint
   npm run build
   ```
2. Bump the client version:
   ```bash
   npm run bump:minor # or bump:build
   ```
3. Commit and tag:
   ```bash
   git add package.json src/version.ts
   git commit -m "chore(release): bump client to v<version>"
   git tag "v<version>"
   git push origin main --tags
   ```

### Backend API Release
1. Bump version in `api/package.json` and `api/src/openapi.ts`.
2. Verify local K3s testing passed 100%:
   ```bash
   node .agents/skills/local-testing-and-deployment/scripts/test-api.js dev
   ```
3. Commit and tag:
   ```bash
   git add api/
   git commit -m "chore(api): bump api gateway to v<version>"
   git tag "api-v<version>"
   git push origin main --tags
   ```

---

## 4. Scripts Inventory

| Script | Purpose |
|:---|:---|
| [`scripts/bump-version.cjs`](file:///home/chuck/Projects/www/MVET_Songbook/.agents/skills/release-management/scripts/bump-version.cjs) | Increments major, minor, or build version across `package.json` and `src/version.ts` |
