/**
 * bump-version.cjs
 * 
 * Increments major, minor, or build (patch) version in package.json.
 */

const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '../package.json');
const bumpType = (process.argv[2] || 'build').toLowerCase();

try {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const versionParts = pkg.version.split('.').map(Number);
  
  if (versionParts.length === 3) {
    if (bumpType === 'major') {
      versionParts[0] += 1;
      versionParts[1] = 0;
      versionParts[2] = 0;
    } else if (bumpType === 'minor') {
      versionParts[1] += 1;
      versionParts[2] = 0;
    } else if (bumpType === 'build' || bumpType === 'patch') {
      versionParts[2] += 1;
    } else {
      console.error(`[Version] Invalid bump type "${bumpType}". Use "major", "minor", or "build".`);
      process.exit(1);
    }
    
    pkg.version = versionParts.join('.');
    
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
    
    // Also update a lightweight version file for the frontend
    const versionTsPath = path.join(__dirname, '../src/version.ts');
    fs.writeFileSync(versionTsPath, `export const VERSION = '${pkg.version}';\n`);
    
    console.log(`[Version] Bumped (${bumpType}) to ${pkg.version}`);
  } else {
    console.warn('[Version] Could not parse version format. Skipping bump.');
  }
} catch (err) {
  console.error('[Version] Bump failed:', err.message);
}
