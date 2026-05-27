import { useState, useEffect, useCallback, useRef } from 'react';
import { saveAuthData, getAuthData, clearAuthData } from '../utils/authStorage';
import { syncTokenToServiceWorker } from '../utils/authSync';


const API_BASE = import.meta.env.VITE_API_URL || '';

interface TokenLifespan {
  issuedAt: number;
  expiresAt: number;
  totalDuration: number;
}

function parseTokenLifespan(token: string): TokenLifespan | null {
  try {
    const payloadStr = atob(token.split('.')[1]);
    const payload = JSON.parse(payloadStr);
    if (payload && payload.exp && payload.iat) {
      const issuedAt = payload.iat * 1000; // to ms
      const expiresAt = payload.exp * 1000; // to ms
      return {
        issuedAt,
        expiresAt,
        totalDuration: expiresAt - issuedAt
      };
    }
  } catch (e) {
    console.warn('Failed to parse JWT token lifespans', e);
  }
  return null;
}

export function useSongbookAuth() {
  const [psk, setPsk] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs to access active states in the background timer without re-triggering the effect
  const activePskRef = useRef<string>('');
  const activeTokenRef = useRef<string>('');

  useEffect(() => {
    activePskRef.current = psk;
  }, [psk]);

  useEffect(() => {
    activeTokenRef.current = token;
  }, [token]);

  // Background refresh method
  const refreshJWT = useCallback(async (currentPsk: string): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ psk: currentPsk })
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          const err = new Error('REVOKED');
          (err as any).status = response.status;
          throw err;
        }
        throw new Error(`Refresh failed with status ${response.status}`);
      }

      const data = await response.json();
      await saveAuthData(currentPsk, data.token, data.expires_at);
      
      setPsk(currentPsk);
      setToken(data.token);
      setIsAuthenticated(true);
      return data.token;
    } catch (e: any) {
      if (e.message === 'REVOKED' || e.status === 401 || e.status === 403) {
        console.warn('Background refresh rejected by server (revoked PSK), clearing auth');
        await clearAuthData();
        setPsk('');
        setToken('');
        setIsAuthenticated(false);
      } else {
        console.warn('Background refresh encountered a transient error (offline or server issue), keeping existing credentials:', e);
      }
      throw e;
    }
  }, []);

  // DHCP-like dynamic lease renewal engine
  useEffect(() => {
    let active = true;
    let timerId: any = null;

    async function checkAndScheduleRenewal() {
      if (timerId) clearTimeout(timerId);

      const auth = await getAuthData();
      if (!auth || !auth.token || !auth.psk) {
        if (active) {
          setIsAuthenticated(false);
          setToken('');
          setPsk('');
        }
        return;
      }

      if (active) {
        setPsk(auth.psk);
        setToken(auth.token);
      }

      const lifespan = parseTokenLifespan(auth.token);
      const now = Date.now();
      const expiresTime = lifespan ? lifespan.expiresAt : new Date(auth.expiresAt).getTime();
      const issuedTime = lifespan ? lifespan.issuedAt : (expiresTime - 7 * 24 * 60 * 60 * 1000);
      const totalDuration = expiresTime - issuedTime;

      const remaining = expiresTime - now;

      // If token is completely expired, clear it
      if (remaining <= 0) {
        console.log('🔴 Choir Access Token has expired. Manual key submission required.');
        if (active) {
          setIsAuthenticated(false);
          setToken('');
          setPsk('');
        }
        await clearAuthData();
        return;
      }

      if (active) {
        setIsAuthenticated(true);
      }

      const halfLifeTime = issuedTime + (totalDuration / 2);
      
      if (now >= halfLifeTime) {
        // T1 lease half-life reached! Attempt automatic renewal.
        const elapsedPct = ((now - issuedTime) / totalDuration * 100).toFixed(1);
        console.log(`🔄 Past T1 Half-Life (Elapsed: ${elapsedPct}%). Triggering transparent DHCP token renewal...`);
        try {
          const newToken = await refreshJWT(auth.psk);
          console.log('✅ Transparent DHCP lease renewal succeeded.');
          
          // Re-schedule based on the fresh lease
          const freshLifespan = parseTokenLifespan(newToken);
          if (freshLifespan) {
            const nextDelay = freshLifespan.totalDuration / 2;
            console.log(`⏰ Scheduled next T1 renewal in ${(nextDelay / 3600000).toFixed(2)} hours.`);
            if (active) {
              timerId = setTimeout(checkAndScheduleRenewal, nextDelay);
            }
          }
          return;
        } catch (e) {
          console.warn('⚠️ Transparent DHCP renewal failed (offline?). Retrying at half of remaining lease time.');
        }
      }

      // Renewal failed or not at T1 yet: calculate next check interval
      let nextAttemptDelay = 0;
      if (now < halfLifeTime) {
        // Not past T1 yet: schedule check exactly at T1
        nextAttemptDelay = halfLifeTime - now;
      } else {
        // T1 attempt failed: retry at remaining half-life (DHCP exponential approach towards exp)
        nextAttemptDelay = remaining / 2;
      }

      // Safety standard: minimum attempt window must not fall below 1 minute (60,000 ms) to prevent API spamming
      const finalDelay = Math.max(60000, nextAttemptDelay);
      
      console.log(`⏰ Scheduled next renewal check in ${(finalDelay / 1000).toFixed(1)} seconds. (Expires in: ${(remaining / 3600000).toFixed(2)} hours)`);
      
      if (active) {
        timerId = setTimeout(checkAndScheduleRenewal, finalDelay);
      }
    }

    void checkAndScheduleRenewal();

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [refreshJWT]);

  // Perform active login / change PSK
  const submitPSK = useCallback(async (inputPsk: string): Promise<boolean> => {
    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ psk: inputPsk })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify your Access Key.');
      }

      await saveAuthData(inputPsk, data.token, data.expires_at);
      setPsk(inputPsk);
      setToken(data.token);
      setIsAuthenticated(true);
      setIsVerifying(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
      setIsVerifying(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await clearAuthData();
    setPsk('');
    setToken('');
    setIsAuthenticated(false);
    setError(null);
  }, []);

  // Automatically sync credentials to Service Worker fetch thread upon state updates
  useEffect(() => {
    syncTokenToServiceWorker(token || null);
  }, [token]);

  return {
    psk,
    token,
    isAuthenticated,
    isVerifying,
    error,
    submitPSK,
    logout
  };
}
