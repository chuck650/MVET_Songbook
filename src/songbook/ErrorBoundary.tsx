import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      this.setState({ hasError: false, error: null });
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  private handleClearStorage = () => {
    try {
      localStorage.removeItem('mvet_settings');
      localStorage.removeItem('mvet_cached_songs');
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0b1120 0%, #0f172a 100%)',
          color: '#f8fafc',
          padding: '24px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '560px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 12px 0', color: '#fca5a5' }}>
              Something Went Wrong
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#94a3b8', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              The application encountered an unexpected error while initializing. You can try refreshing or resetting your cached settings.
            </p>
            {this.state.error && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: '#f87171',
                fontFamily: 'monospace',
                marginBottom: '24px',
                textAlign: 'left',
                overflowX: 'auto',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReset}
                style={{
                  background: 'var(--color-primary, #38bdf8)',
                  color: '#0f172a',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Reload Page
              </button>
              <button
                onClick={this.handleClearStorage}
                style={{
                  background: 'transparent',
                  color: '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Reset Settings Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
