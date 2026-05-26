import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const targetEnv = args[0] || 'dev';
const providedPsk = args[1];

let API_BASE = 'http://mvet-api.test';
let DEFAULT_PSK = '';

// Load .env.secrets if it exists
function loadEnvSecrets() {
  const secretsPath = path.resolve('.env.secrets');
  if (fs.existsSync(secretsPath)) {
    const content = fs.readFileSync(secretsPath, 'utf-8');
    const secrets = {};
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index === -1) return;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      secrets[key] = value;
    });
    return secrets;
  }
  return null;
}

const secrets = loadEnvSecrets();

if (targetEnv.toLowerCase() === 'prod' || targetEnv.toLowerCase() === 'production') {
  API_BASE = 'https://mvet-api.cminfosec.com';
  DEFAULT_PSK = providedPsk || '';
} else {
  // Local development
  if (providedPsk) {
    DEFAULT_PSK = providedPsk;
  } else if (secrets && secrets.ACTIVE_PSKS) {
    // Grab first active PSK from .env.secrets file
    const firstPsk = secrets.ACTIVE_PSKS.split(',')[0].trim();
    DEFAULT_PSK = firstPsk;
  } else {
    DEFAULT_PSK = 'mvet-local-key'; // Fallback
  }
}

const isHttps = API_BASE.startsWith('https');
const requestLib = isHttps ? https : http;

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      rejectUnauthorized: false // Skip certificate verification issues in local clusters if needed
    };

    if (options.body) {
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const req = requestLib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runTests() {
  console.log(`================================================================`);
  console.log(`🧪 MVET Songbook API Integration Test Runner`);
  console.log(`   Target Environment : ${targetEnv.toUpperCase()}`);
  console.log(`   Target Base URL    : ${API_BASE}`);
  console.log(`================================================================\n`);

  let jwtToken = '';

  // -------------------------------------------------------------
  // Test 1: GET /api/songs (Anonymous - Obfuscation Check)
  // -------------------------------------------------------------
  try {
    console.log('Step 1: Fetching songs catalog anonymously...');
    const res = await makeRequest(`${API_BASE}/api/songs`);
    
    if (res.statusCode !== 200) {
      throw new Error(`Expected 200 OK, got ${res.statusCode}. Body: ${res.body}`);
    }

    const catalog = JSON.parse(res.body);
    const medley = catalog.find(s => s.id === 'Armed_Forces_Medley_72');
    
    if (!medley) {
      throw new Error('Could not find Armed_Forces_Medley_72 in catalog.');
    }

    console.log('  - medley files property:', JSON.stringify(medley.files));
    console.log('  - medley hashes property:', JSON.stringify(medley.hashes));
    
    const filesObfuscated = medley.files && medley.files.protected === true;
    const hashesObfuscated = medley.hashes && medley.hashes.protected === true;

    if (filesObfuscated && hashesObfuscated) {
      console.log('  ✅ PASS: Copyrighted song files and hashes are successfully obfuscated.');
    } else {
      throw new Error('FAIL: Obfuscation check failed. Medley was not securely masked.');
    }
  } catch (err) {
    console.error('  ❌ Test 1 Failed:', err.message);
    process.exit(1);
  }

  // -------------------------------------------------------------
  // Test 2: GET Copyrighted File (Anonymous - Block Check)
  // -------------------------------------------------------------
  try {
    console.log('\nStep 2: Accessing copyrighted score file anonymously...');
    const res = await makeRequest(`${API_BASE}/api/songs/Armed_Forces_Medley_72/files/osmd`);
    
    if (res.statusCode === 401) {
      console.log('  ✅ PASS: Access blocked with 401 Unauthorized.');
    } else {
      throw new Error(`FAIL: Access was not blocked. Got status code ${res.statusCode}`);
    }
  } catch (err) {
    console.error('  ❌ Test 2 Failed:', err.message);
    process.exit(1);
  }

  // Check if we have a PSK to proceed with authenticated testing
  if (!DEFAULT_PSK) {
    console.log('\n⚠️  No preshared key (PSK) provided. Skipping authenticated tests.');
    console.log('To run authenticated tests against this environment, run:');
    console.log(`  node scripts/test-api.js ${targetEnv} <your-psk>`);
    console.log('\n✨ Anonymous validation checks PASSED for this environment!');
    process.exit(0);
  }

  // -------------------------------------------------------------
  // Test 3: POST /api/auth/token (PSK to JWT Exchange)
  // -------------------------------------------------------------
  try {
    console.log(`\nStep 3: Exchanging preshared key "${DEFAULT_PSK.replace(/./g, '*')}" for JWT...`);
    const res = await makeRequest(`${API_BASE}/api/auth/token`, {
      method: 'POST',
      body: JSON.stringify({ psk: DEFAULT_PSK })
    });

    if (res.statusCode !== 200) {
      throw new Error(`Expected 200 OK, got ${res.statusCode}. Body: ${res.body}`);
    }

    const payload = JSON.parse(res.body);
    if (!payload.token) {
      throw new Error('Token was missing from response payload.');
    }

    jwtToken = payload.token;
    console.log('  ✅ PASS: Token successfully generated. JWT acquired.');
  } catch (err) {
    console.error('  ❌ Test 3 Failed:', err.message);
    process.exit(1);
  }

  // -------------------------------------------------------------
  // Test 4: GET /api/songs (Authenticated - Reveal Check)
  // -------------------------------------------------------------
  try {
    console.log('\nStep 4: Fetching catalog as an authenticated user...');
    const res = await makeRequest(`${API_BASE}/api/songs`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });

    if (res.statusCode !== 200) {
      throw new Error(`Expected 200 OK, got ${res.statusCode}`);
    }

    const catalog = JSON.parse(res.body);
    const medley = catalog.find(s => s.id === 'Armed_Forces_Medley_72');
    
    if (!medley) {
      throw new Error('Could not find Armed_Forces_Medley_72 in catalog.');
    }

    const filesObfuscated = medley.files && medley.files.protected === true;
    
    if (!filesObfuscated && medley.files.osmd) {
      console.log('  - medley revealed files:', JSON.stringify(medley.files));
      console.log('  ✅ PASS: Copyrighted song files successfully revealed to token holder.');
    } else {
      throw new Error('FAIL: Files remained obfuscated after authenticating.');
    }
  } catch (err) {
    console.error('  ❌ Test 4 Failed:', err.message);
    process.exit(1);
  }

  // -------------------------------------------------------------
  // Test 5: GET Copyrighted File (Authenticated - Download Check)
  // -------------------------------------------------------------
  try {
    console.log('\nStep 5: Downloading copyrighted score file with valid JWT...');
    const res = await makeRequest(`${API_BASE}/api/songs/Armed_Forces_Medley_72/files/osmd`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });

    if (res.statusCode === 200) {
      console.log('  - Content-Type:', res.headers['content-type']);
      console.log('  - Content-Length:', res.headers['content-length']);
      console.log('  ✅ PASS: Score file successfully streamed.');
    } else {
      throw new Error(`FAIL: Request failed with status ${res.statusCode}. Body: ${res.body}`);
    }
  } catch (err) {
    console.error('  ❌ Test 5 Failed:', err.message);
    process.exit(1);
  }

  console.log('\n✨ All automated tests PASSED. The API is robustly secured and fully operational!');
}

runTests();
