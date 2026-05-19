/**
 * Dynamically resolves an absolute asset path relative to the configured base URL.
 * 
 * In local development and root-level deployments (like Netlify or custom domains), 
 * import.meta.env.BASE_URL is '/'. In subdirectory hosting (like GitHub Pages default
 * URL https://<user>.github.io/<repo>/), import.meta.env.BASE_URL is '/<repo>/'.
 * 
 * This resolver prepends the base path cleanly without double-slashing or breaking paths.
 * 
 * @param path - Absolute asset path (starting with '/')
 * @returns The resolved path relative to the base URL
 */
export function resolvePath(path?: string): string {
  if (!path) return '';
  
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
