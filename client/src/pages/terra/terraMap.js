// ─────────────────────────────────────────────────────────────
// TERRA interactive map factory.
// Primary : Mapbox GL (uses REACT_APP_MAPBOX_API_KEY if present).
//           mapbox-gl is a regular GreenRoute dependency, bundled.
// Fallback: MapLibre GL + free vector styles, loaded from a CDN at
//           runtime ONLY when no Mapbox token is set. MapLibre is NOT a
//           package dependency, so the build never breaks when it's
//           missing — the code below only needs the browser + network.
// Both expose the same Mapbox-like API used by TerraMapView.
// ─────────────────────────────────────────────────────────────

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_API_KEY || '';

const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11';
const FREE_STYLES = [
  'https://tiles.openfreemap.org/styles/liberty',
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
];
const MAPLIBRE_CDN = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js';
const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';

export function hasMapboxToken() {
  return Boolean(MAPBOX_TOKEN);
}

function loadMapbox() {
  return import('mapbox-gl').then((m) => {
    const L = m.default || m;
    L.accessToken = MAPBOX_TOKEN;
    return L;
  });
}

let maplibrePromise = null;
/** Load MapLibre GL from CDN once. Resolves to the global `maplibregl`. */
function loadMapLibreFromCDN() {
  if (typeof window !== 'undefined' && window.maplibregl) return Promise.resolve(window.maplibregl);
  if (maplibrePromise) return maplibrePromise;

  maplibrePromise = new Promise((resolve, reject) => {
    try {
      // css
      if (!document.getElementById('terra-maplibre-css')) {
        const link = document.createElement('link');
        link.id = 'terra-maplibre-css';
        link.rel = 'stylesheet';
        link.href = MAPLIBRE_CSS;
        document.head.appendChild(link);
      }
      // js
      const s = document.createElement('script');
      s.src = MAPLIBRE_CDN;
      s.async = true;
      s.onload = () => resolve(window.maplibregl);
      s.onerror = () => { maplibrePromise = null; reject(new Error('maplibre_cdn_failed')); };
      document.head.appendChild(s);
    } catch (e) {
      maplibrePromise = null;
      reject(e);
    }
  });
  return maplibrePromise;
}

/**
 * @returns Promise<{ map, Lib }> — resolves once the map style is loaded.
 * On hard failure rejects with an Error.
 */
export async function createTerraMap(container, opts = {}) {
  const { center, zoom = 13 } = opts;

  let Lib;
  let styles;
  if (MAPBOX_TOKEN) {
    Lib = await loadMapbox();
    styles = [MAPBOX_STYLE];
  } else {
    Lib = await loadMapLibreFromCDN();
    styles = FREE_STYLES;
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let attempt = 0;
    let map;

    const build = () => {
      const style = styles[attempt] || styles[styles.length - 1];
      const cleanup = (m) => {
        try {
          m.remove();
        } catch { /* noop */ }
      };
      if (map) cleanup(map);

      map = new Lib.Map({
        container,
        style,
        center: center || [77.5946, 12.9716],
        zoom: zoom || 13,
        attributionControl: true,
      });
      map.addControl(new Lib.NavigationControl({ showCompass: false }), 'bottom-right');

      const onErr = (e) => {
        const msg = e && e.error ? `${e.error.message || ''} ${e.error.status || ''}` : '';
        const styleIssue = /style|tile|403|401|failed|Error/i.test(msg) || !msg;
        if (styleIssue && attempt < styles.length - 1) {
          attempt += 1;
          if (map) {
            map.off('error', onErr);
            map.off('load', onLoad);
            map.setStyle(styles[attempt]);
            map.once('load', onLoad);
            map.once('error', onErr);
          }
          return;
        }
        if (!settled) {
          settled = true;
          reject(new Error('map_failed'));
        }
      };
      const onLoad = () => {
        if (!settled) {
          settled = true;
          resolve({ map, Lib });
        }
      };
      map.on('load', onLoad);
      map.on('error', onErr);
      // safety net for network-stalled style loads
      setTimeout(() => {
        if (!settled) {
          try {
            if (map.isStyleLoaded()) onLoad();
          } catch { /* ignore */ }
        }
      }, 14000);
    };

    build();
  });
}

/** Add (or update) a GeoJSON line + position markers on a map. */
export function showTrack(map, route, opts = {}) {
  const coords = (route || []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng)).map((p) => [p.lng, p.lat]);
  const srcId = 'terra-track-src';
  const lineId = 'terra-track-line';
  try {
    if (!map.getSource(srcId)) {
      map.addSource(srcId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } } });
    } else {
      map.getSource(srcId).setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
    }
    if (!map.getLayer(lineId)) {
      map.addLayer({
        id: lineId,
        type: 'line',
        source: srcId,
        paint: {
          'line-color': '#3ee082',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3.5, 16, 7],
          'line-opacity': 0.95,
        },
      });
    }
  } catch { /* map may not be ready yet — caller retries */ }

  const cur = coords[coords.length - 1];
  if (cur && map && typeof map.flyTo === 'function') {
    try {
      map.easeTo({ center: cur, zoom: Math.max(map.getZoom() || 14, 15), duration: 700 });
    } catch { /* noop */ }
  }
  return coords;
}

export function fitRoute(map, route, padPx = 80) {
  if (!map || !route || !route.length || typeof map.fitBounds !== 'function') return;
  try {
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const p of route) {
      if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }
    if (!Number.isFinite(minLat)) return;
    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: padPx, maxZoom: 16, duration: 900 });
  } catch { /* noop */ }
}
