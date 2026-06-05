/**
 * MVET Songbook Service Worker Authorization Sync Helper
 * 
 * Intercepts protected static/streaming file requests and dynamically 
 * injects JWT Bearer credentials into headers, preventing URL token leaks.
 * Resilient against service worker termination by restoring the token from IndexedDB.
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

// Helper function to get token from in-memory cache or IndexedDB backup
async function getOrRestoreToken() {
  if (activeJwtToken) {
    return activeJwtToken;
  }

  try {
    const token = await new Promise((resolve, reject) => {
      const request = indexedDB.open('mvet-auth-db', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('auth-store')) {
          resolve(null);
          return;
        }
        const transaction = db.transaction('auth-store', 'readonly');
        const store = transaction.objectStore('auth-store');
        const getRequest = store.get('credentials');
        getRequest.onerror = () => reject(getRequest.error);
        getRequest.onsuccess = () => {
          const res = getRequest.result;
          if (res && res.token) {
            // Check expiry
            const now = new Date();
            const expiry = new Date(res.expiresAt);
            if (now < expiry) {
              resolve(res.token);
              return;
            }
          }
          resolve(null);
        };
      };
    });

    if (token) {
      activeJwtToken = token;
      console.log('🔑 [SW-AuthSync] Restored authentication token from IndexedDB');
    }
  } catch (err) {
    console.warn('🔑 [SW-AuthSync] Failed to restore token from IndexedDB:', err);
  }

  return activeJwtToken;
}

// 2. Fetch interceptor to inject Authorization headers for versioned API assets
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Match only requests destined for our gated API v1 files endpoint
  if (requestUrl.pathname.includes('/api/v1/songs/') && requestUrl.pathname.includes('/files/')) {
    
    event.respondWith(
      (async () => {
        const token = await getOrRestoreToken();
        const isNavigation = event.request.mode === 'navigate' || 
                             event.request.destination === 'iframe' || 
                             event.request.destination === 'document';

        if (!token) {
          console.log(`🔑 [SW-AuthSync] Bypassing header injection for secure path (no token found): ${requestUrl.pathname}`);
          if (isNavigation) {
            return createFriendlyErrorResponse("Your choir access key is missing. Please close this viewer and unlock the songbook in the Settings panel.");
          }
          return fetch(event.request);
        }

        console.log(`🔑 [SW-AuthSync] Intercepting secure asset fetch: ${requestUrl.pathname}`);

        // Create a new Headers object cloning existing request headers
        const secureHeaders = new Headers(event.request.headers);
        
        // Inject secure Bearer credentials
        secureHeaders.set('Authorization', `Bearer ${token}`);

        // Reconstruct the request with secure headers
        const requestInit = {
          headers: secureHeaders
        };

        let secureRequest;
        if (event.request.mode === 'navigate') {
          // Construct from URL string to prevent navigate-mode TypeError in browsers
          secureRequest = new Request(event.request.url, requestInit);
        } else {
          requestInit.mode = 'cors';
          requestInit.credentials = 'omit';
          secureRequest = new Request(event.request, requestInit);
        }

        try {
          const response = await fetch(secureRequest);
          if (response.status === 401 || response.status === 403) {
            console.warn(`🔑 [SW-AuthSync] Gated asset fetch returned ${response.status} (invalid/expired JWT)`);
            if (isNavigation) {
              return createFriendlyErrorResponse("Your choir access key has expired or is invalid. Please close this viewer and re-authenticate in the Settings panel.");
            }
          }
          return response;
        } catch (err) {
          console.error('🔑 [SW-AuthSync] Secure fetch network query failed:', err);
          // Fallback to caching layer dynamically if network is offline
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            console.log('🔑 [SW-AuthSync] Successfully resolved asset from offline cache backup');
            return cachedResponse;
          }
          if (isNavigation) {
            return createFriendlyErrorResponse("Network offline. This score has not been cached for offline use yet. Please connect to the internet or enable offline sync in settings.");
          }
          throw err;
        }
      })()
    );
  }
});

/**
 * Creates a premium, branded HTML response explaining the authorization error
 * and offering a button to auto-trigger re-authentication.
 */
function createFriendlyErrorResponse(message) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Access Restricted</title>
  <style>
    body {
      background-color: #0f172a;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      padding: 1.5rem;
      box-sizing: border-box;
      text-align: center;
    }
    .container {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 2.5rem 2rem;
      border-radius: 16px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
    }
    .icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    h2 {
      margin: 0 0 0.75rem 0;
      color: #f43f5e;
      font-size: 1.5rem;
      font-weight: 700;
    }
    p {
      color: #94a3b8;
      font-size: 0.95rem;
      line-height: 1.6;
      margin: 0 0 1.5rem 0;
    }
    .btn {
      background: #3b82f6;
      color: #ffffff;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
      transition: all 0.2s ease;
    }
    .btn:hover {
      background: #2563eb;
      transform: translateY(-1px);
      box-shadow: 0 6px 8px -1px rgba(59, 130, 246, 0.4);
    }
    .btn:active {
      transform: translateY(0);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🔒</div>
    <h2>Access Restricted</h2>
    <p>${message}</p>
    <button class="btn" onclick="requestReauth()">Unlock Songbook</button>
  </div>

  <script>
    function requestReauth() {
      // Signal parent PWA window that re-authentication is required
      window.parent.postMessage({ type: 'REAUTH_REQUIRED' }, '*');
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
}
