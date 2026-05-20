/**
 * generate-manifest.cjs
 *
 * Generates public/songs.json from individual song directories.
 *
 * Sidecar System (OPENSPEC §1.2.0):
 *   Each song directory may contain a song.json sidecar that maps file roles
 *   (mxl, pdf, mp3, flac, mp4, mscz) to actual filenames.
 *
 *   Generator rules:
 *   1. Sidecar-First: Existing sidecar entries are NEVER overwritten.
 *   2. Heuristic Discovery: Missing roles are auto-detected from the directory
 *      using priority-ordered filename patterns (see MAIN_HEURISTICS below).
 *   3. Write on First Run: If no sidecar exists, one is created with all
 *      heuristically discovered entries as a human-editable starting point.
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SONGS_DIR   = path.join(__dirname, '../public/songs');
const OUTPUT_FILE = path.join(__dirname, '../public/songs.json');

// Canonical part keys in display order (OPENSPEC §1.2.3)
const PART_KEYS = ['soprano', 'alto', 'tenor', 'bass', 'women', 'men'];

// Display names keyed by lowercase part key
const PART_NAMES = { soprano: 'Soprano', alto: 'Alto', tenor: 'Tenor', bass: 'Bass', women: 'Women', men: 'Men' };

// Known media/score extensions handled per role
const ROLE_EXTENSIONS = {
  mscz: ['.mscz'],
  mxl:  ['.mxl'],
  pdf:  ['.pdf'],
  mp3:  ['.mp3'],
  flac: ['.flac'],
  mp4:  ['.mp4'],
};

// Main-score override suffixes in priority order (OPENSPEC §1.2.0, Rule 2)
// Matched BEFORE the bare [id].[ext] default.
const MAIN_OVERRIDE_SUFFIXES = ['-Main', '-Full', '-SATB'];

// Part keyword patterns (case-insensitive) mapped to canonical part key
const PART_PATTERNS = [
  { key: 'soprano', patterns: ['soprano', '-S-', '-S.'] },
  { key: 'alto',    patterns: ['alto',    '-A-', '-A.'] },
  { key: 'tenor',   patterns: ['tenor',   '-T-', '-T.'] },
  { key: 'bass',    patterns: ['bass',    '-B-', '-B.'] },
  { key: 'women',   patterns: ['women',   '-W-', '-W.'] },
  { key: 'men',     patterns: ['men',     '-M-', '-M.'] },
];

// ---------------------------------------------------------------------------
// Sanitization: Fix double-escaped ampersands in MusicXML
// ---------------------------------------------------------------------------

function sanitizeMXL(mxlPath) {
  try {
    const zip = new AdmZip(mxlPath);
    let changed = false;

    // 1. Find the main XML entry
    const containerEntry = zip.getEntry('META-INF/container.xml');
    if (containerEntry) {
      const cObj = xmlParser.parse(containerEntry.getData().toString());
      const rootFile = cObj.container?.rootfiles?.rootfile?.['@_full-path'];
      if (rootFile) {
        const entry = zip.getEntry(rootFile);
        if (entry) {
          let content = entry.getData().toString('utf8');
          if (content.includes('&amp;amp;')) {
            content = content.replace(/&amp;amp;/g, '&amp;');
            zip.updateFile(rootFile, Buffer.from(content, 'utf8'));
            changed = true;
          }
        }
      }
    }

    if (changed) {
      zip.writeZip(mxlPath);
      console.log(`  [sanitize] Fixed double ampersands in: ${path.basename(mxlPath)}`);
    }
  } catch (err) {
    console.warn(`  [sanitize] Failed to sanitize ${path.basename(mxlPath)}: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function sha256(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buf).digest('hex');
  } catch { return null; }
}

/**
 * Determines whether a filename belongs to a vocal part.
 * Returns the canonical part key (e.g. 'soprano') or null.
 */
function detectPartKey(filename) {
  const lower = filename.toLowerCase();
  for (const { key, patterns } of PART_PATTERNS) {
    if (patterns.some(p => lower.includes(p.toLowerCase()))) return key;
  }
  return null;
}

/**
 * Determines whether a filename is a main-score override candidate.
 * Returns true if any MAIN_OVERRIDE_SUFFIXES appear before the extension.
 */
function isMainOverride(baseName) {
  return MAIN_OVERRIDE_SUFFIXES.some(s => baseName.endsWith(s));
}

// ---------------------------------------------------------------------------
// MusicXML / MSCZ metadata extraction
// ---------------------------------------------------------------------------

function getMusicXMLContent(zip) {
  const containerEntry = zip.getEntry('META-INF/container.xml');
  if (containerEntry) {
    const cObj = xmlParser.parse(containerEntry.getData().toString());
    const rootFile = cObj.container?.rootfiles?.rootfile?.['@_full-path'];
    if (rootFile) {
      const entry = zip.getEntry(rootFile);
      if (entry) return entry.getData().toString();
    }
  }
  const xmlEntry = zip.getEntries().find(
    e => e.entryName.endsWith('.xml') && !e.entryName.includes('META-INF/')
  );
  return xmlEntry ? xmlEntry.getData().toString() : null;
}

function extractMXLMetadata(xmlStr) {
  try {
    const obj = xmlParser.parse(xmlStr);
    const score = obj['score-partwise'];
    const workTitle      = score?.work?.['work-title'];
    const movementTitle  = score?.['movement-title'];
    const identification = score?.identification;

    let composer = '';
    let arranger = '';
    let engraver = '';
    if (identification?.creator) {
      const creators = Array.isArray(identification.creator)
        ? identification.creator : [identification.creator];
      
      const c = creators.find(x => x['@_type'] === 'composer');
      if (c) composer = c['#text'] || c;

      const a = creators.find(x => x['@_type'] === 'arranger');
      if (a) arranger = a['#text'] || a;

      const e = creators.find(x => x['@_type'] === 'engraver');
      if (e) engraver = e['#text'] || e;
    }

    let copyright = '';
    if (identification?.rights) {
      copyright = identification.rights['#text'] || identification.rights;
    }

    let key = '';
    const misc = identification?.miscellaneous?.['miscellaneous-field'];
    if (Array.isArray(misc)) {
      const kf = misc.find(f => f['@_name'] === 'key');
      if (kf) key = kf['#text'] || kf;
      
      const ef = misc.find(f => f['@_name'] === 'engraver');
      if (ef) engraver = ef['#text'] || ef;
    } else if (misc) {
      if (misc['@_name'] === 'key') key = misc['#text'] || misc;
      if (misc['@_name'] === 'engraver') engraver = misc['#text'] || misc;
    }

    return { title: movementTitle || workTitle || '', composer, arranger, engraver, copyright, key };
  } catch { return {}; }
}

function getMusicXMLKey(fifths, mode) {
  const keys = {
    'major': {
      '0': 'C major', '1': 'G major', '2': 'D major', '3': 'A major', '4': 'E major', '5': 'B major', '6': 'F# major', '7': 'C# major',
      '-1': 'F major', '-2': 'Bb major', '-3': 'Eb major', '-4': 'Ab major', '-5': 'Db major', '-6': 'Gb major', '-7': 'Cb major'
    },
    'minor': {
      '0': 'A minor', '1': 'E minor', '2': 'B minor', '3': 'F# minor', '4': 'C# minor', '5': 'G# minor', '6': 'D# minor', '7': 'A# minor',
      '-1': 'D minor', '-2': 'G minor', '-3': 'C minor', '-4': 'F minor', '-5': 'Bb minor', '-6': 'Eb minor', '-7': 'Ab minor'
    }
  };
  return keys[mode.toLowerCase()]?.[fifths.toString()] || '';
}

function extractMSCZMetadata(msczPath) {
  try {
    const zip     = new AdmZip(msczPath);
    const entries = zip.getEntries();
    const mscx    = entries.find(e => e.entryName.endsWith('.mscx'));
    if (!mscx) return {};
    const content = mscx.getData().toString('utf8');
    const keyMatch = content.match(/<metaTag name="key">(.*?)<\/metaTag>/);
    return { key: keyMatch?.[1] || null };
  } catch { return {}; }
}

// ---------------------------------------------------------------------------
// Sidecar helpers (OPENSPEC §1.2.0)
// ---------------------------------------------------------------------------

/**
 * Reads the song.json sidecar if it exists; returns {} otherwise.
 */
function readSidecar(folderPath) {
  const sidecarPath = path.join(folderPath, 'song.json');
  if (!fs.existsSync(sidecarPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
  } catch (err) {
    console.warn(`  [sidecar] Failed to parse song.json: ${err.message}`);
    return {};
  }
}

/**
 * Writes the sidecar (only creates / merges — never overwrites existing entries).
 */
function writeSidecar(folderPath, sidecar) {
  const sidecarPath = path.join(folderPath, 'song.json');
  fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2));
}

/**
 * Applies heuristic discovery to fill in any missing roles in the sidecar.
 *
 * Priority for main files (OPENSPEC §1.2.0, Rule 2):
 *   1. [id]-Main.[ext]
 *   2. [id]-Full.[ext]
 *   3. [id]-SATB.[ext]
 *   4. [id].[ext]   (default)
 *
 * Part files are matched by keyword patterns in PART_PATTERNS.
 *
 * Rule 1 (Sidecar-First): any role already set in the sidecar is skipped.
 * Rule 3: writes the result back so humans can review/edit.
 */
function applyHeuristics(songId, folderPath, sidecar) {
  const allFiles = fs.readdirSync(folderPath).filter(f =>
    fs.statSync(path.join(folderPath, f)).isFile()
  );

  // Ensure sidecar has files / parts containers
  if (!sidecar.files)  sidecar.files  = {};
  if (!sidecar.parts)  sidecar.parts  = {};

  let changed = false;

  for (const [role, exts] of Object.entries(ROLE_EXTENSIONS)) {
    // ── Main files ──────────────────────────────────────────────────────────
    if (!sidecar.files[role]) {
      const candidates = allFiles.filter(f => exts.includes(path.extname(f).toLowerCase()));

      // Only consider files that are NOT identified as a vocal part
      const mainCandidates = candidates.filter(f => detectPartKey(f) === null);

      // Priority 1-3: override suffixes
      let found = null;
      for (const suffix of MAIN_OVERRIDE_SUFFIXES) {
        found = mainCandidates.find(f => {
          const base = path.basename(f, path.extname(f));
          return base === `${songId}${suffix}`;
        });
        if (found) break;
      }

      // Priority 4: bare [id].[ext]
      if (!found) {
        found = mainCandidates.find(f => {
          const base = path.basename(f, path.extname(f));
          return base === songId;
        });
      }

      // Warn on ambiguity (multiple matches, none exactly matching)
      if (!found && mainCandidates.length > 1) {
        console.warn(
          `  [sidecar] Ambiguous ${role} files for ${songId}: ` +
          `${mainCandidates.join(', ')} — picking first alphabetically. ` +
          `Edit song.json to resolve.`
        );
        found = mainCandidates.sort()[0];
      } else if (!found && mainCandidates.length === 1) {
        found = mainCandidates[0];
      }

      if (found) {
        sidecar.files[role] = found;
        changed = true;
        console.log(`  [sidecar] Discovered main ${role}: ${found}`);
      }
    }

    // ── Part files ───────────────────────────────────────────────────────────
    const partCandidates = allFiles.filter(f =>
      exts.includes(path.extname(f).toLowerCase()) && detectPartKey(f) !== null
    );

    for (const f of partCandidates) {
      const partKey = detectPartKey(f);
      if (!PART_KEYS.includes(partKey)) continue;

      if (!sidecar.parts[partKey]) {
        sidecar.parts[partKey] = { name: PART_NAMES[partKey], files: {} };
      }
      if (!sidecar.parts[partKey].files[role]) {
        sidecar.parts[partKey].files[role] = f;
        changed = true;
        console.log(`  [sidecar] Discovered ${partKey} ${role}: ${f}`);
      }
    }
  }

  // Remove empty parts entries
  for (const pk of Object.keys(sidecar.parts)) {
    if (!sidecar.parts[pk]?.files || Object.keys(sidecar.parts[pk].files).length === 0) {
      delete sidecar.parts[pk];
    }
  }

  return changed;
}

// ---------------------------------------------------------------------------
// Main manifest builder
// ---------------------------------------------------------------------------

function buildFilesBlock(songId, folderPath, rawFiles, prefix) {
  const result = {};
  for (const [role, filename] of Object.entries(rawFiles)) {
    if (!filename) continue;
    const absPath = path.join(folderPath, filename);
    if (fs.existsSync(absPath)) {
      result[role] = `${prefix}/${filename}`;
    } else {
      console.warn(`  [manifest] Missing file referenced in sidecar: ${filename}`);
    }
  }
  return result;
}

function generateManifest() {
  console.log(`Scanning songs in: ${SONGS_DIR}`);
  if (!fs.existsSync(SONGS_DIR)) {
    console.error('Songs directory not found'); return;
  }

  const songList = [];

  for (const folder of fs.readdirSync(SONGS_DIR)) {
    const folderPath = path.join(SONGS_DIR, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const songId = folder;
    const urlPrefix = `/songs/${songId}`;
    console.log(`\nProcessing: ${songId}`);

    // ── 1. Load / create sidecar ──────────────────────────────────────────
    const sidecar = readSidecar(folderPath);
    const sidecarExisted = Object.keys(sidecar).length > 0;

    const changed = applyHeuristics(songId, folderPath, sidecar);

    if (!sidecarExisted || changed) {
      writeSidecar(folderPath, sidecar);
      console.log(`  [sidecar] ${sidecarExisted ? 'Updated' : 'Created'} song.json`);
    }

    // ── 2. Build files blocks from sidecar ────────────────────────────────
    const mainFiles = buildFilesBlock(songId, folderPath, sidecar.files || {}, urlPrefix);

    if (Object.keys(mainFiles).length === 0) {
      console.warn(`  [manifest] No files found for ${songId} — skipping.`);
      continue;
    }

    // ── 3. Build parts from sidecar (canonical order) ─────────────────────
    const parts = {};
    for (const pk of PART_KEYS) {
      const partDef = sidecar.parts?.[pk];
      if (!partDef?.files) continue;
      const partFiles = buildFilesBlock(songId, folderPath, partDef.files, urlPrefix);
      if (Object.keys(partFiles).length > 0) {
        parts[pk] = { name: partDef.name || PART_NAMES[pk], files: partFiles };
      }
    }

    // ── 6. Generate file hashes for cache busting (all files) ────────────
    const hashes = {};
    for (const f of fs.readdirSync(folderPath)) {
      if (f === 'song.json') continue;
      const absPath = path.join(folderPath, f);
      if (!fs.statSync(absPath).isFile()) continue;

      // Sanitize MusicXML double-escaped ampersands
      if (f.toLowerCase().endsWith('.mxl')) {
        sanitizeMXL(absPath);
      }

      const h = sha256(absPath);
      if (h) hashes[`${urlPrefix}/${f}`] = h;
    }

    // ── 5. Extract metadata (MXL → MSCZ → defaults) ──────────────────────
    let meta = { title: folder.replace(/_/g, ' '), subtitle: '', composer: 'Unknown Composer',
                 arranger: 'Veteran Arrangement', engraver: '', copyright: '', key: '', mtime: '' };

    const mxlPath = mainFiles.mxl ? path.join(__dirname, '../public', mainFiles.mxl) : null;
    if (mxlPath && fs.existsSync(mxlPath)) {
      // Get file modification date
      const mtimeDate = fs.statSync(mxlPath).mtime;
      meta.mtime = `${mtimeDate.toISOString().split('T')[0]} ${mtimeDate.getHours().toString().padStart(2, '0')}:${mtimeDate.getMinutes().toString().padStart(2, '0')}`;
      
      try {
        const zip = new AdmZip(mxlPath);
        const xml = getMusicXMLContent(zip);
        if (xml) {
          const m = extractMXLMetadata(xml);
          if (m.title)     meta.title     = m.title;
          if (m.composer)  meta.composer  = m.composer;
          if (m.arranger)  meta.arranger  = m.arranger;
          if (m.engraver)  meta.engraver  = m.engraver;
          if (m.copyright) meta.copyright = m.copyright;
          if (m.key)       meta.key       = m.key;
        }
      } catch (err) {
        console.warn(`  [metadata] MXL read failed: ${err.message}`);
      }
    }

    const msczPath = mainFiles.mscz ? path.join(__dirname, '../public', mainFiles.mscz) : null;
    if (msczPath && fs.existsSync(msczPath)) {
      const msczMeta = extractMSCZMetadata(msczPath);
      if (msczMeta.key) meta.key = msczMeta.key;

      // Extract thumbnail from MSCZ if none exists on disk
      const thumbDisk = path.join(folderPath, 'thumbnail.png');
      if (!fs.existsSync(thumbDisk)) {
        try {
          const zip = new AdmZip(msczPath);
          const th  = zip.getEntry('Thumbnails/thumbnail.png');
          if (th) { fs.writeFileSync(thumbDisk, th.getData()); console.log('  [thumb] Extracted from MSCZ.'); }
        } catch {}
      }
    }

    // metadata.json overlay
    const mdPath = path.join(folderPath, 'metadata.json');
    if (fs.existsSync(mdPath)) {
      try {
        const overlay = JSON.parse(fs.readFileSync(mdPath, 'utf8'));
        meta = { ...meta, ...overlay };
      } catch (err) {
        console.warn(`  [metadata] metadata.json parse failed: ${err.message}`);
      }
    }

    // Normalise key capitalisation
    if (meta.key) {
      meta.key = meta.key.replace(/Major/gi, 'major').replace(/Minor/gi, 'minor');
    }

    // Thumbnail URL
    const thumbUrl = fs.existsSync(path.join(folderPath, 'thumbnail.png'))
      ? `${urlPrefix}/thumbnail.png` : undefined;

    // ── 6. Assemble song record ───────────────────────────────────────────
    const song = {
      id:            songId,
      title:         meta.title,
      subtitle:      meta.subtitle || "",
      composer:      meta.composer,
      arranger:      meta.arranger,
      engraver:      meta.engraver,
      copyright:     meta.copyright,
      copyrightInfo: meta.copyrightInfo,
      key:           meta.key,
      mtime:         meta.mtime,
      files:         mainFiles,
      parts,
      hashes,
      ...(thumbUrl ? { thumbnail: thumbUrl } : {}),
    };

    songList.push(song);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(songList, null, 2));
  console.log(`\nGenerated manifest for ${songList.length} songs at ${OUTPUT_FILE}`);
}

generateManifest();
