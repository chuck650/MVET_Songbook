const DB_NAME = 'mvet-auth-db';
const STORE_NAME = 'auth-store';
const DB_VERSION = 1;

export interface AuthData {
  psk: string;
  token: string;
  expiresAt: string; // ISO String
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveAuthData(psk: string, token: string, expiresAt: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const data: AuthData = { psk, token, expiresAt };
    
    const request = store.put(data, 'credentials');

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAuthData(): Promise<AuthData | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('credentials');

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to access IndexedDB for auth data:', err);
    return null;
  }
}

export async function clearAuthData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete('credentials');

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getTokenOnly(): Promise<string | null> {
  const auth = await getAuthData();
  if (!auth) return null;
  
  // Check if token is expired
  const now = new Date();
  const expiry = new Date(auth.expiresAt);
  if (now >= expiry) {
    return null;
  }
  
  return auth.token;
}
