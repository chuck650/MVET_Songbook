#!/usr/bin/env node

/**
 * MVET Songbook - Pull Repertoire State
 * 
 * Inspects or syncs runtime repertoire state overrides (e.g. archived statuses)
 * from the active local or production API gateway back into local metadata.json.
 * 
 * Usage:
 *   node scripts/pull-repertoire-state.cjs [local|prod] [--apply]
 *   npm run pull-repertoire-state
 *   npm run pull-repertoire-state -- prod --apply
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const args = process.argv.slice(2);
let target = 'local';
let shouldApply = false;

for (const arg of args) {
  if (arg === 'prod' || arg === 'production') {
    target = 'prod';
  } else if (arg === 'local') {
    target = 'local';
  } else if (arg === '--apply' || arg === '-a') {
    shouldApply = true;
  }
}

const API_BASE = target === 'prod' ? 'https://mvet-api.cminfosec.com' : 'http://mvet-api.test';
const WORKSPACE_DIR = path.resolve(__dirname, '../../../../');
const LOCAL_VOLUME_STATE = '/var/data/mvet-songbook/repertoire_state.json';

function fetchRemoteState(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(`${url}/api/v1/repertoire-state`, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON response: ${e.message}`));
          }
        } else {
          reject(new Error(`Server responded with HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out connecting to ${url}`));
    });
  });
}

async function getRepertoireState() {
  // First try direct local file read if target is local and file exists
  if (target === 'local' && fs.existsSync(LOCAL_VOLUME_STATE)) {
    try {
      const raw = fs.readFileSync(LOCAL_VOLUME_STATE, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`[warn] Failed to read ${LOCAL_VOLUME_STATE} directly: ${e.message}. Falling back to API...`);
    }
  }

  return await fetchRemoteState(API_BASE);
}

async function main() {
  console.log(`🌐 Target: ${target.toUpperCase()} (${API_BASE})`);
  console.log(`🔄 Fetching persistent repertoire state overrides...`);

  let state = {};
  try {
    state = await getRepertoireState();
  } catch (err) {
    console.error(`❌ Error fetching repertoire state: ${err.message}`);
    process.exit(1);
  }

  const entries = Object.entries(state);
  if (entries.length === 0) {
    console.log(`ℹ️  No runtime repertoire state overrides found on ${target}. All catalog statuses match songs.json.`);
    return;
  }

  console.log(`\n📋 Current Repertoire State Overrides:`);
  console.log(`--------------------------------------------------------------------------------`);
  console.log(`| ${'Song ID'.padEnd(35)} | ${'Status'.padEnd(10)} | ${'Last Updated'.padEnd(25)} |`);
  console.log(`--------------------------------------------------------------------------------`);
  for (const [id, s] of entries) {
    const status = s.archived ? 'Archived 📦' : 'Active ✅';
    const updated = s.updatedAt || 'Unknown';
    console.log(`| ${id.padEnd(35)} | ${status.padEnd(10)} | ${updated.padEnd(25)} |`);
  }
  console.log(`--------------------------------------------------------------------------------\n`);

  if (!shouldApply) {
    console.log(`💡 To apply these status overrides to local repository metadata (git tracking), run:`);
    console.log(`   npm run pull-repertoire-state -- ${target} --apply\n`);
    return;
  }

  console.log(`✏️  Applying repertoire overrides to local metadata.json files...`);
  let modifiedCount = 0;

  for (const [songId, s] of entries) {
    const songDir = path.join(WORKSPACE_DIR, 'public', 'songs', songId);
    if (!fs.existsSync(songDir)) {
      console.warn(`⚠️  Song directory not found locally: public/songs/${songId}`);
      continue;
    }

    const metadataPath = path.join(songDir, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      console.warn(`⚠️  metadata.json not found for: ${songId}`);
      continue;
    }

    try {
      const meta = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      const previousArchived = !!meta.archived;
      const newArchived = !!s.archived;

      if (previousArchived !== newArchived) {
        if (newArchived) {
          meta.archived = true;
        } else {
          delete meta.archived;
        }
        fs.writeFileSync(metadataPath, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
        console.log(`   ✅ public/songs/${songId}/metadata.json updated (archived: ${newArchived})`);
        modifiedCount++;
      }
    } catch (e) {
      console.error(`❌ Failed to update metadata for ${songId}: ${e.message}`);
    }
  }

  if (modifiedCount > 0) {
    console.log(`\n🔄 Re-generating manifest (public/songs.json)...`);
    const { execSync } = require('child_process');
    execSync('node scripts/generate-manifest.cjs', { stdio: 'inherit', cwd: WORKSPACE_DIR });
    console.log(`\n🎉 Repertoire state successfully committed to local manifest (${modifiedCount} song(s) updated).`);
  } else {
    console.log(`ℹ️  Local metadata already matches remote repertoire state.`);
  }
}

main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
