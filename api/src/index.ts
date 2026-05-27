import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi.js';
import { Song, PSKRequest, TokenResponse, JWTPayload } from './types.js';

// Extend Request interface to support custom auth properties safely
interface AuthenticatedRequest extends Request {
  authorized?: boolean;
}

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());

// CORS Config
const allowedOrigins = (process.env.CORS_ORIGINS || '*').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));

// Config
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ALGORITHM = (process.env.JWT_ALGORITHM || 'HS256') as jwt.Algorithm;
const JWT_EXPIRATION_DAYS = parseInt(process.env.JWT_EXPIRATION_DAYS || '90', 10);
const DATA_DIR = process.env.DATA_DIR || '/app/data';
const SONGS_JSON_PATH = path.join(DATA_DIR, 'songs.json');

// Memory Cache
let catalogCache: Song[] | null = null;

function loadCatalog(): Song[] {
  if (!fs.existsSync(SONGS_JSON_PATH)) {
    throw new Error(`songs.json catalog not found at: ${SONGS_JSON_PATH}`);
  }
  const rawData = fs.readFileSync(SONGS_JSON_PATH, 'utf-8');
  catalogCache = JSON.parse(rawData) as Song[];
  return catalogCache;
}

function getActivePsks(): string[] {
  const rawPsks = process.env.ACTIVE_PSKS || '';
  return rawPsks.split(',').map(k => k.trim()).filter(Boolean);
}

function generateJwt(): TokenResponse {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured on the server.');
  }
  const expiresInSeconds = JWT_EXPIRATION_DAYS * 24 * 60 * 60;
  const payload: JWTPayload = { authorized: true };
  const token = jwt.sign(payload, JWT_SECRET, { 
    algorithm: JWT_ALGORITHM,
    expiresIn: expiresInSeconds 
  });
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + JWT_EXPIRATION_DAYS);
  
  return { token, expires_at: expiresAt.toISOString() };
}

// Authentication Middleware
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header or token query parameter.' });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET is not configured on the server.' });
  }

  jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] }, (err, decoded) => {
    if (err) {
      const msg = err.name === 'TokenExpiredError' ? 'Authorization token expired.' : 'Invalid token.';
      return res.status(401).json({ error: msg });
    }
    const payload = decoded as JWTPayload;
    if (!payload || !payload.authorized) {
      return res.status(403).json({ error: 'Token does not contain valid claims.' });
    }
    req.authorized = true;
    next();
  });
}

// Silent Token verification for Catalog obfuscation
function checkTokenSilent(req: Request): boolean {
  let token: string | undefined;
  
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (!token || !JWT_SECRET) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] }) as JWTPayload;
    return !!(decoded && decoded.authorized);
  } catch (e) {
    return false;
  }
}

// OpenAPI / Swagger Documentation endpoints
app.get('/openapi.json', (req: Request, res: Response) => {
  res.json(openApiSpec);
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Unified Express API Router (serving legacy /api and versioned /api/v1)
const apiRouter = express.Router();

// Auth Post
apiRouter.post('/auth/token', (req: Request, res: Response) => {
  const { psk } = req.body as PSKRequest;
  if (!psk) {
    return res.status(400).json({ error: 'Preshared Key (psk) is required in the body.' });
  }

  const activeKeys = getActivePsks();
  if (activeKeys.length === 0) {
    return res.status(500).json({ error: 'Active PSKs are not configured on the server.' });
  }

  if (!activeKeys.includes(psk.trim())) {
    return res.status(401).json({ error: 'Invalid Preshared Key.' });
  }

  try {
    const credentials = generateJwt();
    res.json(credentials);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch full or obfuscated catalog
apiRouter.get('/songs', (req: Request, res: Response) => {
  try {
    const catalog = loadCatalog();
    const isAuthorized = checkTokenSilent(req);
    
    const sanitizedCatalog = catalog.map(song => {
      const songCopy = JSON.parse(JSON.stringify(song)) as Song;
      const isCopyrighted = songCopy.copyrightInfo?.type === 'copyrighted';
      
      if (isCopyrighted && !isAuthorized) {
        if (songCopy.files) {
          songCopy.files = {
            protected: true,
            mtime: songCopy.files.mtime || ''
          };
        }
        if (songCopy.parts) {
          for (const key of Object.keys(songCopy.parts)) {
            if (songCopy.parts[key].files) {
              songCopy.parts[key].files = { protected: true };
            }
          }
        }
        if (songCopy.hashes) {
          songCopy.hashes = { protected: true };
        }
      }
      return songCopy;
    });

    res.json(sanitizedCatalog);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve actual file payload safely with query-driven content disposition (ADR-057)
function serveFilePayload(req: Request, res: Response, song: Song, file_type: string) {
  let fileRelPath: string | undefined = undefined;

  const partParam = req.query.part as string;
  if (partParam && song.parts && song.parts[partParam]) {
    const part = song.parts[partParam];
    if (part && part.files && (part.files as any)[file_type]) {
      fileRelPath = (part.files as any)[file_type];
    }
  }

  if (!fileRelPath) {
    if (song.files && (song.files as any)[file_type]) {
      fileRelPath = (song.files as any)[file_type];
    } else if (song.parts) {
      for (const part of Object.values(song.parts)) {
        if (part.files && (part.files as any)[file_type]) {
          fileRelPath = (part.files as any)[file_type];
          break;
        }
      }
    }
  }

  if (!fileRelPath) {
    if (file_type === 'png' || file_type === 'jpg' || file_type === 'jpeg' || file_type === 'gif' || file_type === 'svg' || file_type === 'thumbnail') {
      fileRelPath = song.thumbnail;
    }
  }

  if (!fileRelPath) {
    return res.status(404).json({ error: `File type '${file_type}' not available for this song.` });
  }

  const cleanRelPath = fileRelPath.replace(/^\//, '');
  const fullPath = path.resolve(DATA_DIR, cleanRelPath);

  // Security Traversal Guard
  if (!fullPath.startsWith(path.resolve(DATA_DIR))) {
    return res.status(403).json({ error: 'Directory traversal access denied.' });
  }

  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    return res.status(404).json({ error: `Asset file not found on disk: ${cleanRelPath}` });
  }

  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  
  const filename = path.basename(fullPath);
  let dispositionType = 'attachment'; // default fallback for other types

  // Determine disposition based on query parameter, otherwise use sensible RESTful defaults
  const reqDisposition = req.query.disposition as string;
  if (reqDisposition === 'inline' || reqDisposition === 'attachment') {
    dispositionType = reqDisposition;
  } else {
    // Default behaviors: inline for PDF/images, attachment for other binaries (MSCZ, MXL)
    if (file_type === 'pdf' || file_type === 'png' || file_type === 'jpg' || file_type === 'jpeg' || file_type === 'gif' || file_type === 'svg') {
      dispositionType = 'inline';
    } else {
      dispositionType = 'attachment';
    }
  }

  res.setHeader('Content-Disposition', `${dispositionType}; filename="${filename}"`);
  res.sendFile(fullPath);
}

// Serve secure or public song file route
apiRouter.get('/songs/:song_id/files/:file_type', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { song_id, file_type } = req.params;
    const catalog = loadCatalog();
    const song = catalog.find(s => s.id === song_id);

    if (!song) {
      return res.status(404).json({ error: 'Song not found in metadata.' });
    }

    const isThumbnail = file_type === 'png' || file_type === 'jpg' || file_type === 'jpeg' || file_type === 'gif' || file_type === 'svg';
    const isCopyrighted = song.copyrightInfo?.type === 'copyrighted';

    if (isCopyrighted && !isThumbnail) {
      return authenticateToken(req, res, () => serveFilePayload(req, res, song, file_type));
    }
    
    serveFilePayload(req, res, song, file_type);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mount the unified router under /api and /api/v1 (ADR-057 routing versioning compliant)
app.use('/api', apiRouter);
app.use('/api/v1', apiRouter);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`🚀 MVET TypeScript Songbook Express Gateway running on port ${port}`);
  console.log(`📚 Swagger UI documentation active at http://localhost:${port}/docs`);
});
