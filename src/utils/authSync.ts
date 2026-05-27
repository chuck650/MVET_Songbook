/**
 * Secure Authentication Token Synchronization Bridge
 * 
 * Synchronizes authorization credentials from the PWA client application thread
 * down to the active Workbox Service Worker background process via postMessage.
 */
export async function syncTokenToServiceWorker(token: string | null): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker interface is not supported on this platform.');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if the service worker is active and controlling the page
    if (registration.active) {
      registration.active.postMessage({
        type: 'SET_AUTH_TOKEN',
        token
      });
      console.log(`🔑 [AuthSync] Broadcasted token update to Service Worker background thread (authenticated: ${!!token})`);
    } else if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_AUTH_TOKEN',
        token
      });
      console.log(`🔑 [AuthSync] Broadcasted token update to active Service Worker controller (authenticated: ${!!token})`);
    } else {
      console.warn('🔑 [AuthSync] Service worker is registered but active execution context is not established yet.');
    }
  } catch (err) {
    console.error('🔑 [AuthSync] Failed to post token synchronization message to Service Worker:', err);
  }
}
