import React, { useEffect, useRef, useState } from 'react';
import { createTerraMap, showTrack, fitRoute, setMapStyleTheme } from './terraMap';
import { resolveMapStyle, setMapStyle } from '../../mapTheme';

const DOT = (bg) => ({
  background: bg,
  border: '3px solid #ffffff',
  boxShadow: '0 0 0 2px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.45)',
});

/**
 * Interactive TERRA map (Mapbox GL if a token exists, free MapLibre
 * otherwise). Map colours follow the USER's map preference (normal vs
 * dark) — NOT the app light/dark chrome theme. TERRA defaults to the dark
 * (black) map until the user picks otherwise.
 *
 * While recording (follow) a green "you are here" dot tracks the fix;
 * finished routes fit the whole viewport with start (green) and finish
 * (orange) markers.
 */
export default function TerraMapView({ points, center, zoom, follow = false, fit = false, onReady, nav = false, showTheme = false, themeTogglePos = 'tr' }) {
  const hostRef = useRef(null);
  const wrapRef = useRef({ map: null, Lib: null, userDot: null, startMarker: null, finishMarker: null });
  const pointsRef = useRef([]);
  const [failed, setFailed] = useState(false);
  const [theme, setTheme] = useState(() => resolveMapStyle('terra'));

  useEffect(() => {
    pointsRef.current = points || [];
    const wrap = wrapRef.current;
    if (!wrap.map || !wrap.Lib) return; // map still loading
    applyTrack(wrap, pointsRef.current, follow);
    if (!follow && fit && (pointsRef.current?.length || 0) >= 2) {
      fitRoute(wrap.map, pointsRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, follow, fit]);

  function applyTrack(wrap, pts, isFollow) {
    try {
      if (!wrap.map || !wrap.Lib) return;
      const coords = showTrack(wrap.map, pts);

      const makeDot = (field, bg, pos) => {
        if (!pos) return;
        if (wrap[field]) {
          try { wrap[field].setLngLat(pos); } catch { /* noop */ }
          return;
        }
        const el = document.createElement('div');
        const d = DOT(bg);
        el.style.position = 'relative';
        el.style.width = '18px';
        el.style.height = '18px';
        el.style.borderRadius = '50%';
        el.style.background = d.background;
        el.style.border = d.border;
        el.style.boxShadow = d.boxShadow;
        const m = new wrap.Lib.Marker({ element: el }).setLngLat(pos);
        m.addTo(wrap.map);
        wrap[field] = m;
      };

      const last = coords.length ? coords[coords.length - 1] : null;
      if (isFollow && last) {
        makeDot('userDot', '#22c55e', last);
        try { wrap.map.easeTo({ center: last, duration: 500 }); } catch { /* noop */ }
        if (wrap.startMarker) { try { wrap.startMarker.remove(); } catch { /* noop */ } wrap.startMarker = null; }
        if (wrap.finishMarker) { try { wrap.finishMarker.remove(); } catch { /* noop */ } wrap.finishMarker = null; }
      }
      if (pts.length >= 2) {
        makeDot('startMarker', '#16a34a', [pts[0].lng, pts[0].lat]);
        if (!isFollow) makeDot('finishMarker', '#ff5a1c', last);
      }
    } catch (e) {
      // never let marker/track cosmetics break recording
      console.warn('terra map render warning:', e && e.message);
    }
  }

  // (Re)create the map when the theme preference changes.
  useEffect(() => {
    let disposed = false;
    const wrap = wrapRef.current;
    const host = hostRef.current;
    if (!host) return undefined;

    createTerraMap(host, { center, zoom, showNav: nav, theme })
      .then(({ map, Lib }) => {
        if (disposed) {
          try { map.remove(); } catch { /* noop */ }
          return;
        }
        wrap.map = map;
        wrap.Lib = Lib;
        applyTrack(wrap, pointsRef.current, follow);
        // applyTheme lets parents switch map colours; the map is re-created
        // so the real track + markers are always re-drawn on the new style.
        if (onReady) onReady({ map, Lib, applyTheme: (t) => { if (t === 'dark' || t === 'normal') setTheme(t); } });
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });

    return () => {
      disposed = true;
      if (wrap.map) {
        try { wrap.map.remove(); } catch { /* noop */ }
      }
      wrap.map = null;
      wrap.Lib = null;
      wrap.userDot = null;
      wrap.startMarker = null;
      wrap.finishMarker = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const flipTheme = async (next) => {
    setTheme((cur) => {
      const n = next || (cur === 'dark' ? 'normal' : 'dark');
      setMapStyle(n); // persist preference
      setMapStyleTheme(wrapRef.current.map, n);
      return n;
    });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="map-host" ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
      {failed && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,14,12,0.92)', display: 'grid', placeItems: 'center', padding: 20, textAlign: 'center' }}>
          <div style={{ maxWidth: 320 }}>
            <b style={{ color: '#fff' }}>Map could not load</b>
            <p style={{ color: '#9fb3a6', fontSize: 13, margin: '8px 0 0' }}>
              Check your connection{!process.env.REACT_APP_MAPBOX_API_KEY ? ' (no map token configured)' : ''}. Recording keeps working without tiles.
            </p>
          </div>
        </div>
      )}
      {showTheme && !failed && (
        <div className={`map-theme-toggle ${themeTogglePos === 'br' ? 'pos-br' : 'pos-tr'}`} role="group" aria-label="Map colours">
          <button className={theme === 'normal' ? 'active' : ''} onClick={() => flipTheme('normal')} title="Standard map colours">
            <span className="mt-dot normal" />Colour
          </button>
          <button className={theme === 'dark' ? 'active' : ''} onClick={() => flipTheme('dark')} title="Black map">
            <span className="mt-dot dark" />Black
          </button>
        </div>
      )}
    </div>
  );
}
