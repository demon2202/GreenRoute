import React, { useEffect, useRef, useState } from 'react';
import { createTerraMap, showTrack, fitRoute } from './terraMap';

const dotStyle = (bg, size, ring) => ({
  width: size,
  height: size,
  borderRadius: '50%',
  background: bg,
  border: `${ring}px solid rgba(255,255,255,0.95)`,
  boxShadow: '0 1px 6px rgba(0,0,0,.5)',
});

/**
 * Interactive TERRA map (Mapbox GL if a token exists, free MapLibre
 * otherwise). Renders the real recorded track with a pulsing "you are
 * here" dot while recording (follow), or fits the whole route when
 * viewing a finished activity.
 */
export default function TerraMapView({ points, center, zoom, follow = false, fit = false, onReady }) {
  const hostRef = useRef(null);
  const wrapRef = useRef({ map: null, Lib: null, userDot: null, startMarker: null });
  const pointsRef = useRef([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    pointsRef.current = points || [];
    const wrap = wrapRef.current;
    if (!wrap.map || !wrap.Lib) return; // map still loading
    applyTrack(wrap, pointsRef.current);
    if (!follow && fit && (pointsRef.current?.length || 0) >= 2) {
      fitRoute(wrap.map, pointsRef.current, 80);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  function applyTrack(wrap, pts) {
    try {
      if (!wrap.map) return;
      if (!wrap.Lib) return;
      const coords = showTrack(wrap.map, pts);
      // set position BEFORE addTo — MapLibre crashes on addTo without lngLat
      const ensureDot = (field, bg, pos) => {
        if (wrap[field]) {
          try { wrap[field].setLngLat(pos); } catch { /* noop */ }
          return;
        }
        if (!pos) return;
        const el = document.createElement('div');
        el.style.cssText = `position:relative;${Object.entries(dotStyle(bg, 16, 3)).map(([k, v]) => `${k}:${v}`).join(';')}`;
        const m = new wrap.Lib.Marker({ element: el }).setLngLat(pos);
        m.addTo(wrap.map);
        wrap[field] = m;
      };

      if (follow && coords.length) {
        const last = coords[coords.length - 1];
        ensureDot('userDot', '#3ee082', last);
        if (last) {
          try { wrap.map.easeTo({ center: last, duration: 500 }); } catch { /* noop */ }
        }
      }
      if (pts.length >= 2) {
        ensureDot('startMarker', '#ffffff', [pts[0].lng, pts[0].lat]);
      }
    } catch (e) {
      // never let marker/track cosmetics break recording
      console.warn('terra map render warning:', e && e.message);
    }
  }

  useEffect(() => {
    let disposed = false;
    const wrap = wrapRef.current;
    const host = hostRef.current;
    if (!host) return undefined;

    createTerraMap(host, { center, zoom })
      .then(({ map, Lib }) => {
        if (disposed) {
          try { map.remove(); } catch { /* noop */ }
          return;
        }
        wrap.map = map;
        wrap.Lib = Lib;
        applyTrack(wrap, pointsRef.current);
        if (onReady) onReady({ map, Lib });
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    </div>
  );
}
