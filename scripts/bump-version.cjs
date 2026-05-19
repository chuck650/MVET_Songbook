/**
 * bump-version.cjs
 * 
 * Automatically increments the patch version in package.json.
 * Called as part of the build process.
 */

const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '../package.json');

try {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const versionParts = pkg.version.split('.').map(Number);
  
  if (versionParts.length === 3) {
    versionParts[2] += 1; // Increment patch
    pkg.version = versionParts.join('.');
    
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
    
    // Also update a lightweight version file for the frontend
    const versionTsPath = path.join(__dirname, '../src/version.ts');
    fs.writeFileSync(versionTsPath, `export const VERSION = '${pkg.version}';\n`);
    
    console.log(`[Version] Bumped to ${pkg.version}`);
  } else {
    console.warn('[Version] Could not parse version format. Skipping bump.');
  }
} catch (err) {
  console.error('[Version] Bump failed:', err.message);
}
