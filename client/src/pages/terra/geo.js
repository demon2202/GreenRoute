// ─────────────────────────────────────────────────────────────
// Shared geo + formatting helpers for the TERRA experience.
// Mirrors server/utils/terraMath.js so live numbers match the
// authoritative values the server stores.
// ─────────────────────────────────────────────────────────────

const EARTH_R = 6371;

export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** haversine over consecutive points (optionally skip spikes > maxKm). */
export function trackDistanceKm(pts, maxSegKm = 2) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (!a || !b) continue;
    const seg = haversineKm(a.lat, a.lng, b.lat, b.lng);
    if (seg <= maxSegKm) d += seg;
  }
  return d;
}

export const MODE_META = {
  cycling: { label: 'Cycling', color: '#57d06b', glyph: 'ride' },
  running: { label: 'Running', color: '#f2773a', glyph: 'run' },
  walking: { label: 'Walking', color: '#3aa6f2', glyph: 'walk' },
  driving: { label: 'Driving', color: '#b07cf0', glyph: 'drive' },
};

export function defaultTitle(mode, when = new Date()) {
  const h = when.getHours();
  const part = h < 5 ? 'Night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night';
  const label = { cycling: 'Ride', running: 'Run', walking: 'Walk', driving: 'Drive' }[mode] || 'Activity';
  return `${part} ${label}`;
}

export function fmtDuration(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0m';
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export function fmtDurationShort(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0m';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}`;
  return `${m}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

export function fmtDist(km) {
  if (!Number.isFinite(km)) return '0.0';
  if (km < 10) return km.toFixed(2);
  if (km < 100) return km.toFixed(1);
  return Math.round(km).toString();
}

export function fmtSpeed(kmh) {
  if (!Number.isFinite(kmh) || kmh <= 0) return '—';
  return kmh.toFixed(1);
}

export function fmtClock(ms) {
  // count-up mm:ss / hh:mm:ss for the live recorder
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function weekdayDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return d.toLocaleDateString('en-US', opts);
}

export function weekdayShort(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function fmtPace(kmh) {
  // min per km, e.g. 5'21"
  if (!Number.isFinite(kmh) || kmh <= 0.2) return '—';
  const secPerKm = 3600 / kmh;
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

/** Rough CO₂ saved (kg) vs a car baseline of 0.21 kg/km (same as backend). */
export function co2SavedKg(mode, distKm) {
  return mode === 'driving' ? 0 : Math.round(distKm * 0.21 * 100) / 100;
}

export function clipRoute(pts, max = 3000) {
  if (!Array.isArray(pts)) return [];
  const out = [];
  let last = null;
  for (const p of pts) {
    if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    if (last && last.lat === p.lat && last.lng === p.lng) continue;
    out.push({ lat: p.lat, lng: p.lng, ele: p.ele, ts: p.ts });
    last = out[out.length - 1];
    if (out.length >= max) break;
  }
  return out;
}
