import React, { useEffect, useRef } from 'react';
import axios from 'axios';

export default function StartupLoader({ onComplete }) {
  const finishedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const runInit = async () => {
      // Set safety timeout of 10s max
      const maxTimer = setTimeout(() => {
        if (!finishedRef.current && !cancelled) {
          finishedRef.current = true;
          onComplete(null);
        }
      }, 10000);

      try {
        // Step 1: Health check ping (fast timeout)
        try {
          await axios.get('/health', { timeout: 3500, withCredentials: false });
        } catch {
          // If health check fails or in local dev, proceed to try auth check
        }

        // Step 2: Auth session & token check
        if (!cancelled && !finishedRef.current) {
          try {
            const token = localStorage.getItem('gr_token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const { data } = await axios.get('/api/auth/current_user', { timeout: 3500, headers });
            if (!cancelled && !finishedRef.current) {
              finishedRef.current = true;
              clearTimeout(maxTimer);
              onComplete(data);
              return;
            }
          } catch {
            // Not authenticated
          }
        }
      } finally {
        if (!cancelled && !finishedRef.current) {
          finishedRef.current = true;
          clearTimeout(maxTimer);
          onComplete(null);
        }
      }
    };

    runInit();

    return () => {
      cancelled = true;
    };
  }, [onComplete]);

  return (
    <div style={S.container}>
      <div style={S.card}>
        <div style={S.logoWrap}>
          <div style={S.ring} />
          <div style={S.emblem}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffffff' }}>
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          </div>
        </div>

        <div style={S.textCol}>
          <div style={S.brandTitle}>Green<span style={S.brandGreen}>Route</span></div>
          <div style={S.brandSub}>Sustainable Navigation</div>
        </div>
      </div>

      <style>{`
        @keyframes emblemPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes ringPulse {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.18); opacity: 0.15; }
          100% { transform: scale(1.35); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

const S = {
  container: {
    position: 'fixed',
    inset: 0,
    background: 'var(--bg-primary, #FBF9F4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.25rem',
    textAlign: 'center',
  },
  logoWrap: {
    position: 'relative',
    width: 64,
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    inset: -6,
    borderRadius: '50%',
    background: 'rgba(74, 124, 89, 0.25)',
    animation: 'ringPulse 2s cubic-bezier(0.16, 1, 0.3, 1) infinite',
  },
  emblem: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4A7C59 0%, #3B6647 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(74, 124, 89, 0.35)',
    animation: 'emblemPulse 2.4s ease-in-out infinite',
    zIndex: 2,
  },
  textCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
  },
  brandTitle: {
    fontFamily: "'Newsreader', Georgia, serif",
    fontSize: '1.5rem',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    color: 'var(--text-primary, #1C281F)',
  },
  brandGreen: {
    color: 'var(--primary, #4A7C59)',
    fontStyle: 'italic',
    fontWeight: 600,
  },
  brandSub: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--text-secondary, #5F7163)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
};
