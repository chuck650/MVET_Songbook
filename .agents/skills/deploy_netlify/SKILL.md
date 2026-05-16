# Skill: Deploy to Netlify

This skill provides instructions for building and deploying the MVET Songbook to Netlify using the Netlify MCP server.

## Prerequisites
- Netlify MCP server configured with a valid Personal Access Token.
- Project Site ID: `0c13f55a-3eb5-4763-8d8b-eb8b4476277d`
- Team Name: `MVET_Songbook` (slug: `nelsonch650`)

## Procedure

### 1. Production Build
Execute the production build to generate the optimized PWA bundle.
```bash
npm run build
```
Wait for completion and verify the `dist/` directory exists.

### 2. Prepare Redirects
Ensure that PWA routing is supported by copying the `netlify.toml` into the publish directory.
```bash
cp netlify.toml dist/
```

### 3. Trigger Deployment
Use the Netlify MCP `deploy-site` operation to push the `dist/` folder to the live site.

**Arguments:**
- `siteId`: `0c13f55a-3eb5-4763-8d8b-eb8b4476277d`
- `deployDirectory`: `[absolute_path_to_workspace]/dist`

### 4. Verify Status
After triggering the deploy, use the returned `deployId` with the `get-deploy` operation to monitor the state until it reaches `ready`.

## Success Criteria
- Deployment state is `ready`.
- The site is accessible at https://mvet-songbook.netlify.app
