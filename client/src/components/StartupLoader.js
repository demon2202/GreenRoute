import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const MESSAGES = [
  'Starting GreenRoute',
  'Waking up the server',
  'Server is warming up',
  'Connecting to backend',
  'Loading route engine',
  'Almost there',
];

export default function StartupLoader({ onReady }) {
  const doneRef      = useRef(false);
  const [msgIdx, setMsgIdx]   = useState(0);
  const [visible, setVisible] = useState(true); // for fade transition

  /* ── Cycle messages with cross-fade ── */
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);                          // fade out
      setTimeout(() => {
        setMsgIdx(i => (i + 1) % MESSAGES.length);
        setVisible(true);                         // fade in next
      }, 350);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  /* ── Backend wake-up logic ── */
  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      if (doneRef.current || cancelled) return;
      doneRef.current = true;
      setTimeout(() => onReady(), 300);
    };



    /* In production: ping /health via axios (same baseURL as app).
       Give up and let the app load anyway after 60 s max. */
    const maxTimer = setTimeout(finish, 60000);

    const ping = async () => {
      if (doneRef.current || cancelled) return;
      try {
        await axios.get('/health', { timeout: 10000, withCredentials: false });
        finish();
      } catch {
        if (!doneRef.current && !cancelled) setTimeout(ping, 4000);
      }
    };
    ping();

    return () => { cancelled = true; clearTimeout(maxTimer); };
  }, [onReady]);

  const msg = MESSAGES[msgIdx];

  return (
    <div style={S.page}>

      {/* Banter-loader (scaled up) */}
      <div className="bl-wrap">
        <div className="banter-loader">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="banter-loader__box" />
          ))}
        </div>
      </div>

      {/* Animated message — text only, no emoji */}
      <div style={{ ...S.msgRow, opacity: visible ? 1 : 0 }}>
        <span style={S.msgText}>{msg}<span className="dots" /></span>
      </div>

      <style>{`
        /* ── Layout ── */
        .bl-wrap {
          animation: blBounce 2.4s ease-in-out infinite;
        }
        @keyframes blBounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }

        /* ── Message row ── */
        div[style*="opacity"] {
          transition: opacity 0.35s ease;
        }

        /* ── Animated dots ── */
        .dots::after {
          content: '';
          animation: dotCycle 1.5s steps(4, end) infinite;
        }
        @keyframes dotCycle {
          0%   { content: '';    }
          25%  { content: '.';   }
          50%  { content: '..';  }
          75%  { content: '...'; }
          100% { content: '';    }
        }

        /* ══════════════════════════════════════════════
           BANTER-LOADER  —  scaled up (34 px boxes)
        ══════════════════════════════════════════════ */
        .banter-loader {
          position: relative;
          width: 120px;
          height: 120px;
        }
        .banter-loader__box {
          float: left;
          position: relative;
          width: 34px;
          height: 34px;
          margin-right: 9px;
        }
        .banter-loader__box::before {
          content: "";
          position: absolute;
          left: 0; top: 0;
          width: 100%; height: 100%;
          background: linear-gradient(135deg, #059669, #34d399);
          border-radius: 4px;
        }
        .banter-loader__box:nth-child(3n)           { margin-right: 0; margin-bottom: 9px; }
        .banter-loader__box:nth-child(1)::before,
        .banter-loader__box:nth-child(4)::before    { margin-left: 43px; }
        .banter-loader__box:nth-child(3)::before    { margin-top: 86px; }
        .banter-loader__box:last-child              { margin-bottom: 0; }

        @keyframes moveBox-1 {
          9.0909090909%  { transform: translate(-43px, 0); }
          18.1818181818% { transform: translate(0px, 0); }
          27.2727272727% { transform: translate(0px, 0); }
          36.3636363636% { transform: translate(43px, 0); }
          45.4545454545% { transform: translate(43px, 43px); }
          54.5454545455% { transform: translate(43px, 43px); }
          63.6363636364% { transform: translate(43px, 43px); }
          72.7272727273% { transform: translate(43px, 0px); }
          81.8181818182% { transform: translate(0px, 0px); }
          90.9090909091% { transform: translate(-43px, 0px); }
          100%           { transform: translate(0px, 0px); }
        }
        .banter-loader__box:nth-child(1) { animation: moveBox-1 4s infinite; }

        @keyframes moveBox-2 {
          9.0909090909%  { transform: translate(0, 0); }
          18.1818181818% { transform: translate(43px, 0); }
          27.2727272727% { transform: translate(0px, 0); }
          36.3636363636% { transform: translate(43px, 0); }
          45.4545454545% { transform: translate(43px, 43px); }
          54.5454545455% { transform: translate(43px, 43px); }
          63.6363636364% { transform: translate(43px, 43px); }
          72.7272727273% { transform: translate(43px, 43px); }
          81.8181818182% { transform: translate(0px, 43px); }
          90.9090909091% { transform: translate(0px, 43px); }
          100%           { transform: translate(0px, 0px); }
        }
        .banter-loader__box:nth-child(2) { animation: moveBox-2 4s infinite; }

        @keyframes moveBox-3 {
          9.0909090909%  { transform: translate(-43px, 0); }
          18.1818181818% { transform: translate(-43px, 0); }
          27.2727272727% { transform: translate(0px, 0); }
          36.3636363636% { transform: translate(-43px, 0); }
          45.4545454545% { transform: translate(-43px, 0); }
          54.5454545455% { transform: translate(-43px, 0); }
          63.6363636364% { transform: translate(-43px, 0); }
          72.7272727273% { transform: translate(-43px, 0); }
          81.8181818182% { transform: translate(-43px, -43px); }
          90.9090909091% { transform: translate(0px, -43px); }
          100%           { transform: translate(0px, 0px); }
        }
        .banter-loader__box:nth-child(3) { animation: moveBox-3 4s infinite; }

        @keyframes moveBox-4 {
          9.0909090909%  { transform: translate(-43px, 0); }
          18.1818181818% { transform: translate(-43px, 0); }
          27.2727272727% { transform: translate(-43px, -43px); }
          36.3636363636% { transform: translate(0px, -43px); }
          45.4545454545% { transform: translate(0px, 0px); }
          54.5454545455% { transform: translate(0px, -43px); }
          63.6363636364% { transform: translate(0px, -43px); }
          72.7272727273% { transform: translate(0px, -43px); }
          81.8181818182% { transform: translate(-43px, -43px); }
          90.9090909091% { transform: translate(-43px, 0px); }
          100%           { transform: translate(0px, 0px); }
        }
        .banter-loader__box:nth-child(4) { animation: moveBox-4 4s infinite; }

        @keyframes moveBox-5 {
          9.0909090909%  { transform: translate(0, 0); }
          18.1818181818% { transform: translate(0, 0); }
          27.2727272727% { transform: translate(0, 0); }
          36.3636363636% { transform: translate(43px, 0); }
          45.4545454545% { transform: translate(43px, 0); }
          54.5454545455% { transform: translate(43px, 0); }
          63.6363636364% { transform: translate(43px, 0); }
          72.7272727273% { transform: translate(43px, 0); }
          81.8181818182% { transform: translate(43px, -43px); }
          90.9090909091% { transform: translate(0px, -43px); }
          100%           { transform: translate(0px, 0px); }
        }
        .banter-loader__box:nth-child(5) { animation: moveBox-5 4s infinite; }

        @keyframes moveBox-6 {
          9.0909090909%  { transform: translate(0, 0); }
          18.1818181818% { transform: translate(-43px, 0); }
          27.2727272727% { transform: translate(-43px, 0); }
          36.3636363636% { transform: translate(0px, 0); }
          45.4545454545% { transform: translate(0px, 0); }
          54.5454545455% { transform: translate(0px, 0); }
          63.6363636364% { transform: translate(0px, 0); }
          72.7272727273% { transform: translate(0px, 43px); }
          81.8181818182% { transform: translate(-43px, 43px); }
          90.9090909091% { transform: translate(-43px, 0px); }
          100%           { transform: translate(0px, 0px); }
        }
        .banter-loader__box:nth-child(6) { animation: moveBox-6 4s infinite; }

        @keyframes moveBox-7 {
          9.0909090909%  { transform: translate(43px, 0); }
          18.1818181818% { transform: translate(43px, 0); }
          27.2727272727% { transform: translate(43px, 0); }
          36.3636363636% { transform: translate(0px, 0); }
          45.4545454545% { transform: translate(0px, -43px); }
          54.5454545455% { transform: translate(43px, -43px); }
          63.6363636364% { transform: translate(0px, -43px); }
          72.7272727273% { transform: translate(0px, -43px); }
          81.8181818182% { transform: translate(0px, 0px); }
          90.9090909091% { transform: translate(43px, 0px); }
          100%           { transform: translate(0px, 0px); }
        }
        .banter-loader__box:nth-child(7) { animation: moveBox-7 4s infinite; }

        @keyframes moveBox-8 {
          9.0909090909%  { transform: translate(0, 0); }
          18.1818181818% { transform: translate(-43px, 0); }
          27.2727272727% { transform: translate(-43px, -43px); }
          36.3636363636% { transform: translate(0px, -43px); }
          45.4545454545% { transform: translate(0px, -43px); }
          54.5454545455% { transform: translate(0px, -43px); }
          63.6363636364% { transform: translate(0px, -43px); }
          72.7272727273% { transform: translate(0px, -43px); }
          81.8181818182% { transform: translate(43px, -43px); }
          90.9090909091% { transform: translate(43px, 0px); }
          100%           { transform: translate(0px, 0px); }
        }
        .banter-loader__box:nth-child(8) { animation: moveBox-8 4s infinite; }

        @keyframes moveBox-9 {
          9.0909090909%  { transform: translate(-43px, 0); }
          18.1818181818% { transform: translate(-43px, 0); }
          27.2727272727% { transform: translate(0px, 0); }
          36.3636363636% { transform: translate(-43px, 0); }
          45.4545454545% { transform: translate(0px, 0); }
          54.5454545455% { transform: translate(0px, 0); }
          63.6363636364% { transform: translate(-43px, 0); }
          72.7272727273% { transform: translate(-43px, 0); }
          81.8181818182% { transform: translate(-86px, 0); }
          90.9090909091% { transform: translate(-43px, 0); }
          100%           { transform: translate(0px, 0); }
        }
        .banter-loader__box:nth-child(9) { animation: moveBox-9 4s infinite; }
      `}</style>
    </div>
  );
}

const S = {
  page: {
    position: 'fixed',
    inset: 0,
    background: 'var(--bg-primary, #ffffff)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2.5rem',
    zIndex: 9998,
  },
  msgRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    transition: 'opacity 0.35s ease',
  },
  emoji: {
    fontSize: '1.4rem',
    lineHeight: 1,
  },
  msgText: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--text-secondary, #6b7280)',
    letterSpacing: '0.01em',
    fontFamily: "'Be Vietnam Pro', -apple-system, sans-serif",
  },
};
