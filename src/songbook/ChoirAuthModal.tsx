import React, { useState } from 'react';
import { useAuth } from './AuthContext';

interface ChoirAuthModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  songTitle?: string;
}

export const ChoirAuthModal: React.FC<ChoirAuthModalProps> = ({ onClose, onSuccess, songTitle }) => {
  const { submitPSK, isVerifying, error } = useAuth();
  const [accessKey, setAccessKey] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!accessKey.trim()) {
      setLocalError('Please enter a valid access key.');
      return;
    }

    const success = await submitPSK(accessKey.trim());
    if (success) {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <div 
        className="modal-content glass-panel" 
        style={{ maxWidth: '420px', padding: '2rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          ✕
        </button>
        
        <div className="modal-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>🔐</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Choir Access Key Required</h2>
          {songTitle && (
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.25rem' }}>
              To rehearse <strong>“{songTitle}”</strong>, please enter your Military Voices Access Key.
            </p>
          )}
        </div>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="psk-input" style={{ fontSize: '0.85rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>
              Preshared Key (PSK)
            </label>
            <input
              id="psk-input"
              type="password"
              placeholder="••••••••••••"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              disabled={isVerifying}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(0, 0, 0, 0.25)',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                width: '100%'
              }}
            />
          </div>

          {(localError || error) && (
            <div style={{
              padding: '0.75rem',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.85rem',
              textAlign: 'center'
            }}>
              {localError || error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isVerifying}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
              cursor: isVerifying ? 'not-allowed' : 'pointer'
            }}
          >
            {isVerifying ? (
              <>
                <span className="spinner" style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></span>
                Verifying...
              </>
            ) : (
              'Unlock Rehearsal Library'
            )}
          </button>
        </form>

        <div style={{ 
          fontSize: '0.75rem', 
          color: 'rgba(255,255,255,0.5)', 
          textAlign: 'center', 
          marginTop: '1.5rem',
          lineHeight: '1.4'
        }}>
          All patriotic and military arrangements are cleared under license. Unlocks are bound securely to your browser cache.
        </div>
      </div>
    </div>
  );
};
