function getFileTypeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('-satb.mxl')) return 'osmd';
  if (lower.endsWith('.mxl')) return 'mxl';
  if (lower.endsWith('.mp3')) return 'mp3';
  if (lower.endsWith('.flac')) return 'flac';
  if (lower.endsWith('.mp4')) return 'mp4';
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.mscz')) return 'mscz';
  
  // Fallback to extension if no special match
  const ext = lower.split('.').pop() || '';
  return ext;
}

function getPartKeyFromPath(path: string): string | null {
  const lower = path.toLowerCase();
  const parts = ['soprano', 'alto', 'tenor', 'bass', 'women', 'men', 'instrumental'];
  for (const part of parts) {
    // Look for parts as standalone segments or extensions to prevent partial word matching
    const matchesPattern = new RegExp(`[-_]${part}\\.`, 'i').test(lower) || 
                           new RegExp(`[-_]${part}$`, 'i').test(lower);
    if (matchesPattern) {
      return part;
    }
  }
  return null;
}

/**
 * Dynamically resolves an absolute asset path relative to the configured base URL.
 * 
 * In local development and root-level deployments (like Netlify or custom domains), 
 * import.meta.env.BASE_URL is '/'. In subdirectory hosting (like GitHub Pages default
 * URL https://<user>.github.io/<repo>/), import.meta.env.BASE_URL is '/<repo>/'.
 * 
 * If VITE_API_URL is configured, all song library requests (/songs/...) are routed 
 * to the secure backend REST API.
 * 
 * @param path - Absolute asset path (starting with '/')
 * @returns The resolved path relative to the base URL
 */
interface MvetConfig {
  VITE_API_URL?: string;
}

declare global {
  interface Window {
    __MVET_CONFIG__?: MvetConfig;
  }
}

let cachedApiUrl: string | null = null;

export async function loadRuntimeConfig(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    const configUrl = resolvePath('/api-config.json');
    const res = await fetch(`${configUrl}?v=${Date.now()}`);
    if (res.ok) {
      const config: MvetConfig = await res.json();
      window.__MVET_CONFIG__ = config;
      if (config.VITE_API_URL) {
        cachedApiUrl = config.VITE_API_URL;
        console.log(`⚙️ [Config] Loaded runtime API configuration: ${cachedApiUrl}`);
      }
    }
  } catch (e) {
    console.error('⚙️ [Config] Failed to load runtime configuration, falling back to compile-time env:', e);
  }
}

export function getApiUrl(): string {
  if (cachedApiUrl) return cachedApiUrl;
  
  if (typeof window !== 'undefined' && window.__MVET_CONFIG__?.VITE_API_URL) {
    return window.__MVET_CONFIG__.VITE_API_URL;
  }
  
  return import.meta.env.VITE_API_URL || '';
}

export function resolvePath(path?: string): string {
  if (!path) return '';
  
  // If VITE_API_URL is configured and the path is a song asset (/songs/...)
  const apiBase = getApiUrl();
  
  if (apiBase && path.startsWith('/songs/')) {
    const cleanApiBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    const parts = path.split('/');
    if (parts.length >= 3) {
      const songId = parts[2];
      const fileType = getFileTypeFromPath(path);
      const partKey = getPartKeyFromPath(path);
      const queryParam = partKey ? `?part=${partKey}` : '';
      return `${cleanApiBase}/api/v1/songs/${songId}/files/${fileType}${queryParam}`;
    }
  }
  
  let base = '/';
  if (typeof window !== 'undefined') {
    const isGitHubPagesHost = window.location.hostname.endsWith('github.io');
    const hasSubdirectory = window.location.pathname.startsWith('/MVET_Songbook');
    
    if (isGitHubPagesHost || hasSubdirectory) {
      base = '/MVET_Songbook/';
    }
  } else {
    base = import.meta.env.BASE_URL || '/';
  }
  
  if (path.startsWith('/')) {
    // Slice off trailing slash from base if present (e.g. '/MVET_Songbook/' -> '/MVET_Songbook')
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${cleanBase}${path}`;
  }
  
  return path;
}
