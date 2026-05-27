/**
 * MVET Songbook Service Worker Authorization Sync Helper
 * 
 * Intercepts protected static/streaming file requests and dynamically 
 * injects JWT Bearer credentials into headers, preventing URL token leaks.
 */

// In-memory active credential storage
let activeJwtToken = null;

// 1. Message listener to receive token updates from PWA client thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_AUTH_TOKEN') {
    activeJwtToken = event.data.token;
    console.log(`🔑 [SW-AuthSync] In-memory authentication state updated (hasToken: ${!!activeJwtToken})`);
  }
});

// 2. Fetch interceptor to inject Authorization headers for versioned API assets
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Match only requests destined for our gated API v1 files endpoint
  if (requestUrl.pathname.includes('/api/v1/songs/') && requestUrl.pathname.includes('/files/')) {
    
    // Skip injecting header if no token is currently set in memory
    if (!activeJwtToken) {
      console.log(`🔑 [SW-AuthSync] Bypassing header injection for secure path (no token synchronized): ${requestUrl.pathname}`);
      return;
    }

    console.log(`🔑 [SW-AuthSync] Intercepting secure asset fetch: ${requestUrl.pathname}`);

    // Create a new Headers object cloning existing request headers
    const secureHeaders = new Headers(event.request.headers);
    
    // Inject secure Bearer credentials
    secureHeaders.set('Authorization', `Bearer ${activeJwtToken}`);

    // Reconstruct the request with secure headers
    const secureRequest = new Request(event.request, {
      headers: secureHeaders,
      mode: 'cors',
      credentials: 'omit' // Keep credential exchanges confined to standard Bearer token header
    });

    event.respondWith(
      fetch(secureRequest).then((response) => {
        if (response.status === 401 || response.status === 403) {
          console.warn(`🔑 [SW-AuthSync] Gated asset fetch returned ${response.status} (invalid/expired JWT)`);
        }
        return response;
      }).catch((err) => {
        console.error('🔑 [SW-AuthSync] Secure fetch network query failed:', err);
        // Fallback to caching layer dynamically if network is offline
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('🔑 [SW-AuthSync] Successfully resolved asset from offline cache backup');
            return cachedResponse;
          }
          // Propagate error if no cache is matched
          throw err;
        });
      })
    );
  }
});
