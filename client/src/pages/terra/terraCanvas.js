// ─────────────────────────────────────────────────────────────
// TERRA card renderer — "Strava-style share card".
// The SAME functions draw the on-screen preview and the exported
// 1080x1920 PNG, so the download always matches the preview.
//
// Composition:
//   kicker  CYCLING · WED SEP 3           } white text only
//   big activity title                    } straight & centered
//   optional caption                      }
//   hero stats (user-togglable) Distance · Speed · Time
//   ── REAL map of the user's route ── start (A) & finish (B)
//      marked, optional pins for max-speed / highest point
//      (extra stat chips ride the map's top edge)
//   TERRA (brand bottom centre)
//
// Backgrounds: map (real map tiles — black OR standard colours) or
//              photo (user image). Solid-colour backgrounds were
//              removed from TERRA entirely — a colour is never painted
//              on or behind the card. The route is always the user's
//              own recorded GPS track — nothing is ever faked.
// ─────────────────────────────────────────────────────────────

import axios from 'axios';
import { MODE_META } from './geo';

export const CARD_W = 1080;
export const CARD_H = 1920;

/* Where the story card shows its route map. */
export const BAND = { x: 110, y: 1470, w: 860, h: 300, y1: 1770 }; // photo rounded box
const BAND_FIT = { x: 138, y: 1524, w: 804, h: 216 }; // route fits inside the band (below the chips)
/* Full "map" background: the map is ZOOMED onto the travelled route so the
   path is big and clear — it fills most of the card's height, centred around
   the middle-lower area (text overlays on top). */
const MAP_FRAME = { x: 96, y: 900, w: 888, h: 860, y1: 1760 };

const FF = '"Plus Jakarta Sans", system-ui, sans-serif';
const FS = '"Newsreader", Georgia, serif';

/* ── origin / api ───────────────────────────────────────────
   Map tiles + uploaded photos must hit the SAME host the app talks to for
   every other API call (axios.defaults.baseURL). In local dev that is
   http://localhost:5000; behind a same-origin gateway/proxy it is ''.
   Resolved lazily at call time — App.js sets axios.defaults.baseURL only
   after these modules finish loading. */
function mediaOrigin() {
  const raw = (process.env.REACT_APP_API_URL || '').trim();
  if (raw && raw !== '/') return raw.replace(/\/+$/, '');
  let b = '';
  try { b = (axios.defaults && axios.defaults.baseURL) || ''; } catch { /* noop */ }
  b = String(b).trim();
  if (!b || b === '/') return ''; // same-origin (gateway / dev proxy)
  if (!/^https?:/i.test(b)) return ''; // only absolute http(s) bases
  return b.replace(/\/+$/, '');
}

export function absoluteUrl(u) {
  if (!u) return '';
  if (/^(https?:)?\/\//.test(u)) return u;
  const o = mediaOrigin();
  if (!o) return new URL(u, window.location.origin + '/').href;
  return `${o}${u.startsWith('/') ? '' : '/'}${u}`;
}

// Persistence helper — always store the RELATIVE server path (the API only
// accepts /uploads/terra/... on its own host). Display uses absoluteUrl().
export function serverPath(u) {
  if (!u) return '';
  const s = String(u).trim();
  if (/^https?:\/\//i.test(s)) {
    try { return new URL(s).pathname; } catch { return ''; }
  }
  return s.startsWith('/') ? s : '';
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image_load_failed'));
    img.src = src;
  });
}

function authHeaders() {
  try {
    const t = localStorage.getItem('gr_token');
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch { return {}; }
}

/* ── tile fetching ──────────────────────────────────────────
   Small worker pool + progressive paint: each tile is drawn the
   moment it arrives, so a map appears quickly instead of only
   after the slowest tile of the batch. */
const POOL = 7;
let inFlight = 0;
const waiters = [];
function acquire() {
  if (inFlight < POOL) { inFlight += 1; return Promise.resolve(); }
  return new Promise((res) => waiters.push(res));
}
function release() {
  inFlight -= 1;
  const w = waiters.shift();
  if (w) w();
}

async function fetchTileOnce(z, x, y, style) {
  const url = `${mediaOrigin()}/api/terra/tile/${z}/${x}/${y}?style=${style || 'dark'}`;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const to = setTimeout(() => { try { ctrl && ctrl.abort(); } catch { /* noop */ } }, 15000);
  try {
    const resp = await fetch(url, { headers: authHeaders(), signal: ctrl ? ctrl.signal : undefined });
    if (!resp.ok) throw new Error('tile_fetch_failed');
    const blob = await resp.blob();
    if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
    return loadImage(URL.createObjectURL(blob));
  } finally {
    clearTimeout(to);
  }
}

export async function fetchTile(z, x, y, style) {
  await acquire();
  try {
    try {
      return await fetchTileOnce(z, x, y, style);
    } catch {
      await new Promise((r) => setTimeout(r, 250));
      return await fetchTileOnce(z, x, y, style);
    }
  } finally {
    release();
  }
}

/* ── mercator helpers ─────────────────────────────────────── */
const MAXLAT = 85.05112878;
function lng2x(lng, z) { return ((lng + 180) / 360) * 256 * Math.pow(2, z); }
function lat2y(lat, z) {
  const c = Math.max(-MAXLAT, Math.min(MAXLAT, lat));
  const s = Math.sin((c * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256 * Math.pow(2, z);
}
function validRoute(r) { return (r || []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng)); }
function routeBounds(pts) {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const p of pts) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/* Per-point speed + elevation profile of the REAL track. Used only to place
   pins; every label still uses the server's authoritative metric values. */
function buildProfile(pts) {
  const speeds = new Array(pts.length).fill(0);
  let maxIdx = 0, maxV = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const dt = (Number(b.ts) - Number(a.ts)) / 1000;
    if (dt <= 0) continue;
    const d = haversineKm(a.lat, a.lng, b.lat, b.lng);
    if (d <= 0.5) speeds[i] = (d / dt) * 3600;
  }
  for (let i = 1; i < speeds.length; i++) if (speeds[i] > maxV) { maxV = speeds[i]; maxIdx = i; }

  let eleMaxIdx = -1, eleMax = -Infinity, hasEle = false;
  for (let i = 0; i < pts.length; i++) {
    const e = Number(pts[i] && pts[i].ele);
    if (pts[i] && pts[i].ele !== null && pts[i].ele !== undefined && Number.isFinite(e) && !Number.isNaN(e)) {
      hasEle = true;
      if (e > eleMax) { eleMax = e; eleMaxIdx = i; }
    }
  }
  return { speeds, maxIdx: maxV > 0 ? maxIdx : -1, eleMaxIdx, hasEle };
}

/* Continuous-zoom fitter: pick a (possibly fractional) zoom so the route's
   bounds fit its frame, then render by down-scaling the next integer zoom's
   tiles (standard slippy-map continuous-zoom). */
function fitZoomInfo(pts, box, padFrac = 0.14) {
  const b = routeBounds(pts);
  const cy = (b.minLat + b.maxLat) / 2;
  const mlng = 111320 * Math.cos((cy * Math.PI) / 180);
  const spanMx = Math.max((b.maxLng - b.minLng) * mlng, 0.001);
  const spanMy = Math.max((b.maxLat - b.minLat) * 111320, 0.001);
  const availW = Math.max(box.w * (1 - padFrac), 10);
  const availH = Math.max(box.h * (1 - padFrac), 10);
  const c = 156543.03392 * Math.cos((cy * Math.PI) / 180);
  const need = Math.max(spanMx / availW, spanMy / availH);
  const Z = Math.max(3, Math.min(19, Math.log2(c / need)));
  return { Z, center: { lng: (b.minLng + b.maxLng) / 2, lat: (b.minLat + b.maxLat) / 2 } };
}

const SURF = {
  // Route-track casing colours only — the card surface itself is painted
  // purely by real map tiles (no base colour is ever filled on the canvas).
  dark: { trackCase: 'rgba(24,12,4,0.8)' },
  normal: { trackCase: 'rgba(40,20,8,0.6)' },
};

/* Does this browser support canvas filters? (Chrome/FF yes.) When supported the
   'black' card map is OSM tiles inverted to grayscale-black, so the card keeps
   visible street structure instead of collapsing to a flat void. Older browsers
   fall back to a CARTO dark-matter source. */
function canvasFilterSupport() {
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    return typeof ctx.filter === 'string';
  } catch { return false; }
}

/**
 * Build a real-map tile canvas for the story card.
 *   kind 'full' → CARD-size canvas, map fills the whole card (bg "map")
 *   kind 'band' → canvas sized to the photo rounded band area
 * The route is zoomed to its frame; start/finish (A/B) and optional stat
 * pins are painted over real roads. Missing tiles leave that spot clear and
 * the route is still drawn on top — no colour is ever filled as a base.
 */
export async function buildMapLayer(route, { style = 'dark', kind = 'full', pins = {} } = {}) {
  const pts = validRoute(route);
  const key0 = style === 'light' ? 'normal' : style;
  const styleKey = SURF[key0] ? key0 : 'dark';
  const isDark = styleKey === 'dark';
  const invert = isDark && canvasFilterSupport();
  // 'dark' with canvas filters → OSM tiles inverted to a rich black map.
  // 'dark' without filters → server CARTO dark-matter ('carto_dark') fallback.
  const reqStyle = isDark && !invert ? 'carto_dark' : styleKey;
  let W, H, box;
  if (kind === 'band') {
    W = BAND.w + 40;
    H = BAND.h + 40; // +20 px overscan each side for the glow
    box = { x: BAND_FIT.x - (BAND.x - 20), y: BAND_FIT.y - (BAND.y - 20), w: BAND_FIT.w, h: BAND_FIT.h };
  } else {
    W = CARD_W;
    H = CARD_H;
    box = { ...MAP_FRAME };
  }

  const cnv = document.createElement('canvas');
  cnv.width = W;
  cnv.height = H;
  const ctx = cnv.getContext('2d');

  const sfc = SURF[styleKey] || SURF.dark;
  // NOTE: no colour is painted on this canvas before the tiles — the map is
  // drawn purely from real map tiles (the user's request: nothing dyed black
  // behind/over the map). If a tile is missing that spot stays clear and the
  // route is still drawn on top.
  if (invert) ctx.filter = 'grayscale(1) invert(1)'; // OSM tiles below become the black map
  if (pts.length < 2) { ctx.filter = 'none'; return cnv; }

  const { Z, center } = fitZoomInfo(pts, box);
  const zc = Math.min(19, Math.ceil(Z));
  const zs = Math.pow(2, Z - zc); // <=1 — how much of a zc-tile fits one zoom-Z pixel
  const Px = box.x + box.w / 2;
  const Py = box.y + box.h / 2;

  const toPx = (p) => [
    lng2x(p.lng, Z) - lng2x(center.lng, Z) + Px,
    lat2y(p.lat, Z) - lat2y(center.lat, Z) + Py,
  ];

  // Fetch every zc-tile the canvas touches, drawing each as it arrives.
  const tw = 256 * zs; // drawn tile size (px)
  const colZc = lng2x(center.lng, zc) / 256;
  const rowZc = lat2y(center.lat, zc) / 256;
  const halfCols = W / tw / 2 + 1;
  const halfRows = H / tw / 2 + 1;
  const col0 = Math.max(0, Math.floor(colZc - halfCols));
  const col1 = Math.min((1 << zc) - 1, Math.ceil(colZc + halfCols));
  const row0 = Math.max(0, Math.floor(rowZc - halfRows));
  const row1 = Math.min((1 << zc) - 1, Math.ceil(rowZc + halfRows));

  const started = Date.now();
  const paint = [];
  let painted = 0; // how many tiles actually painted (0 ⇒ tiles unreachable)
  let sealed = false; // set once we move on to the route — late tiles skip
  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) {
      paint.push(
        fetchTile(zc, col, row, reqStyle)
          .then((img) => {
            if (sealed) return;
            const tx = col * tw - lng2x(center.lng, Z) + Px;
            const ty = row * tw - lat2y(center.lat, Z) + Py;
            ctx.drawImage(img, tx, ty, tw, tw);
            painted += 1;
          })
          .catch(() => { /* tile optional — never throw a whole map for one tile */ })
      );
    }
  }
  // Wait for all tiles, but never more than ~7s: paint the card (with whatever
  // tiles arrived + the route) so the story preview always appears promptly.
  await Promise.race([Promise.all(paint), new Promise((r) => setTimeout(r, 7000))]);
  sealed = true;
  cnv.tileCount = painted; // exposed so the editor can warn when tiles failed
  // stop inverting before we draw the route & markers (they must keep their colours)
  if (invert) ctx.filter = 'none';
  if (typeof console !== 'undefined' && Date.now() - started > 1200) {
    console.log(`[terra] ${kind}/${style} map: ${paint.length} tiles in ${Date.now() - started}ms`);
  }

  // The user's real route over the real roads.
  paintTrack(ctx, pts.map(toPx), sfc);
  paintMarkers(ctx, pts, toPx, pins);
  return cnv;
}

function paintTrack(ctx, mapPts, sfc) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const trace = () => {
    ctx.beginPath();
    mapPts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  };
  // Same visual language as the "Open full journey" map: a bright GREEN route
  // line over a dark casing + soft green glow so it pops on both the black map
  // and the light standard map, exactly like the track in the full journey.
  trace();
  ctx.strokeStyle = 'rgba(6, 16, 10, 0.78)'; // dark casing (reads on light tiles)
  ctx.lineWidth = 38;
  ctx.stroke();
  trace();
  ctx.strokeStyle = 'rgba(62, 224, 130, 0.40)'; // soft green glow
  ctx.lineWidth = 30;
  ctx.stroke();
  trace();
  ctx.strokeStyle = '#3ee082'; // the app's bright track green
  ctx.lineWidth = 16;
  ctx.stroke();
  trace();
  ctx.strokeStyle = '#c2f6d8'; // inner highlight keeps the path crisp
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
}

/* Start (A) and finish (B) discs plus optional max-speed / summit pins. */
function paintMarkers(ctx, routePts, toPx, pins) {
  const n = routePts.length;
  const profile = buildProfile(routePts);
  const disc = (i, fill, letter) => {
    if (i < 0 || i >= n) return;
    const [x, y] = toPx(routePts[i]);
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6,12,8,0.78)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.96)';
    ctx.stroke();
    if (letter) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, x, y + 1.5);
    }
  };
  const dot = (i, color) => {
    if (i < 0 || i >= n) return;
    const [x, y] = toPx(routePts[i]);
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,10,8,0.7)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  };
  disc(0, '#16a34a', 'A');
  disc(n - 1, '#ff5a1c', 'B');
  if (pins.enableMax && Number(pins.maxSpeedKmh) > 0 && profile.maxIdx >= 0) dot(profile.maxIdx, '#e11d48');
  if (pins.enableElev && pins.hasElevation && profile.hasEle && profile.eleMaxIdx >= 0) dot(profile.eleMaxIdx, '#0ea5e9');
}

/* ── text helpers ─────────────────────────────────────────── */
function drawSpaced(ctx, text, cx, y, letterPx) {
  ctx.textAlign = 'center';
  let total = 0;
  for (const ch of text) total += ctx.measureText(ch).width + letterPx;
  total -= letterPx;
  let x = cx - total / 2;
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + letterPx;
  }
}
function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length >= maxLines) break;
    } else line = test;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}
function drawCover(ctx, img, W, H) {
  const ir = img.width / img.height;
  const cr = W / H;
  let sw, sh;
  if (ir > cr) { sh = H; sw = H * ir; } else { sw = W; sh = W / ir; }
  ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
}
function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* value formatting */
function distValue(km) {
  if (!Number.isFinite(km)) return '0.00';
  return km >= 10 ? km.toFixed(1) : km.toFixed(2);
}
function durationWord(sec) {
  sec = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

/* Which stats are switched on for a card, in fixed order. Older activities
   without a stored choice default to everything on. */
const STAT_ORDER = ['distance', 'time', 'avgSpeed', 'maxSpeed', 'elevation', 'eco'];
export function enabledStats(activity) {
  const stored = Array.isArray(activity && activity.cardStats) ? activity.cardStats : null;
  const set = stored ? new Set(stored) : new Set(STAT_ORDER);
  return STAT_ORDER.filter((k) => set.has(k));
}

/**
 * MAIN renderer. view: { bg, mapStyle, title, caption, mapLayer, bandLayer,
 * img, stats } — draws the card at `canvas` resolution.
 */
export async function renderStory(canvas, activity, view) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const S = W / CARD_W;

  // Solid-colour cards were removed from TERRA entirely: any legacy 'black' or
  // 'color' background reads as the plain map card, so a solid colour can never
  // be painted on (or behind) the card again. Only 'map' and 'photo' remain.
  const rawBg = view.bg || activity.bg || 'map';
  const bg = rawBg === 'photo' ? 'photo' : 'map';
  const title = (view.title ?? activity.title ?? '').trim() || 'My Journey';
  const caption = (view.caption ?? activity.caption ?? '').trim();
  const mode = MODE_META[activity.mode] || MODE_META.cycling;
  const stats = (view.stats && view.stats.length ? view.stats : enabledStats(activity));
  const hasMax = Number(activity.maxSpeedKmh) > 0;
  const hasEle = !!activity.hasElevation;
  // Card map colour: 'dark' (black) or 'normal' (standard colours). Legacy
  // 'light' values (a near-white experiment) read as 'normal' — never white.
  const rawStyle = (view.mapStyle || activity.mapStyle) || 'dark';
  const cardMapStyle = rawStyle === 'light' ? 'normal' : (rawStyle === 'dark' ? 'dark' : 'normal');
  const mapIsColourful = bg === 'map' && cardMapStyle === 'normal';
  const DARK_INK = { main: '#0b1a11', soft: 'rgba(10,24,14,0.94)', softer: 'rgba(10,24,14,0.72)', shadow: 'rgba(255,255,255,0.6)' };
  const WHITE_INK = { main: '#ffffff', soft: 'rgba(255,255,255,0.97)', softer: 'rgba(255,255,255,0.75)', shadow: 'rgba(0,0,0,0.85)' };
  let ink = mapIsColourful ? DARK_INK : WHITE_INK;

  /* ── background ── */
  if (bg === 'map' && view.mapLayer) {
    // Pure map — no colour wash/scrim is painted over the tiles (the map must
    // not be dyed black or white). Text stays readable via its own shadow + the
    // small chips/frame below.
    ctx.drawImage(view.mapLayer, 0, 0, W, H);
    // subtle frame so the full-bleed map reads as a designed card
    ctx.save();
    ctx.strokeStyle = mapIsColourful ? 'rgba(10,24,14,0.14)' : 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2 * S;
    ctx.strokeRect(22 * S, 22 * S, W - 44 * S, H - 44 * S);
    ctx.restore();
  } else if (bg === 'photo' && view.img) {
    drawCover(ctx, view.img, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0.52)');
    g.addColorStop(0.3, 'rgba(0,0,0,0.18)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.16)');
    g.addColorStop(1, 'rgba(0,0,0,0.86)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // No colour fallback is painted behind a missing map/photo — the card may
  // never be dyed a flat colour. Until tiles/photo arrive the canvas simply
  // stays as-is; text and chips keep their own legibility.

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const shadow = (on) => { ctx.shadowColor = ink.shadow; ctx.shadowBlur = on ? 24 * S : 0; };

  /* kicker */
  const kicker = `${(activity.mode || mode.label).toUpperCase()} · ${dayLabel(activity.startTime)}`;
  ctx.font = `700 ${Math.round(28 * S)}px ${FF}`;
  ctx.fillStyle = ink.soft;
  shadow(true);
  drawSpaced(ctx, kicker, W / 2, 164 * S, 6 * S);
  shadow(false);

  /* title */
  ctx.font = `800 ${Math.round(94 * S)}px ${FS}`;
  const tLines = wrapLines(ctx, title, W - 220 * S, 2);
  let headerEnd = 296 * S + (tLines.length - 1) * 112 * S;
  ctx.fillStyle = ink.main;
  shadow(true);
  tLines.forEach((ln, i) => ctx.fillText(ln, W / 2, 296 * S + i * 112 * S));
  shadow(false);

  /* caption */
  if (caption) {
    ctx.font = `500 ${Math.round(44 * S)}px ${FS}`;
    ctx.fillStyle = ink.soft;
    const cLines = wrapLines(ctx, caption, W - 280 * S, 2);
    const c0 = headerEnd + 126 * S;
    shadow(true);
    cLines.forEach((ln, i) => ctx.fillText(ln, W / 2, c0 + i * 62 * S));
    shadow(false);
    headerEnd = c0 + (cLines.length - 1) * 62 * S;
  }

  /* Where text may go before the map content:
       map bg  → hero rows must end by ~1150 (chips + frame below)
       photo   → everything ends above the rounded band */
  const heroBottomCard = bg === 'map' ? 1146 : BAND.y - 152;

  /* ── hero stat rows (Distance · Speed · Time — user-togglable) ── */
  const HERO = {
    distance: { label: 'DISTANCE', value: `${distValue(Number(activity.distanceKm) || 0)} km` },
    time: { label: 'TIME', value: durationWord(Number(activity.durationSec) || 0) },
    avgSpeed: { label: 'SPEED', value: Number(activity.avgSpeedKmh) > 0 ? `${Number(activity.avgSpeedKmh).toFixed(1)} km/h` : '—' },
  };
  const heroRows = stats.filter((k) => HERO[k]).map((k) => ({ key: k, ...HERO[k] }));

  if (heroRows.length) {
    const availTop = headerEnd + 88 * S;
    const maxBottom = heroBottomCard * S - 20 * S;
    // fit block height if the title/caption pushed text low
    const basePitch = 150 * S;
    const valGap = 100 * S;
    const total0 = (heroRows.length - 1) * basePitch + valGap;
    const free = maxBottom - availTop;
    let scale = 1;
    if (free < total0 + 90 * S && free > 150 * S) scale = Math.max(0.7, (free - 40 * S) / (total0 + 40 * S));
    const pitch = basePitch * scale;
    let startY;
    if (free >= total0 * scale + 100 * S) {
      startY = availTop + (free - total0 * scale) / 2;
    } else {
      startY = Math.max(availTop, maxBottom - total0 * scale);
    }
    shadow(true);
    heroRows.forEach((r, i) => {
      const y0 = startY + i * pitch;
      ctx.font = `700 ${Math.round(30 * S * scale)}px ${FF}`;
      ctx.fillStyle = ink.softer;
      drawSpaced(ctx, r.label, W / 2, y0, 7 * S * scale);
      let size = 104 * S * scale;
      ctx.font = `800 ${Math.round(size)}px ${FS}`;
      const cap = W - 300 * S;
      const vw = ctx.measureText(r.value).width;
      if (vw > cap) { size = (size * cap) / vw; ctx.font = `800 ${Math.round(size)}px ${FS}`; }
      ctx.fillStyle = ink.main;
      ctx.fillText(r.value, W / 2, y0 + valGap * scale);
    });
    shadow(false);
  }

  /* ── extra chips (MAX / ELEV / ECO) ride the top edge of the map ── */
  const chips = [];
  if (stats.includes('maxSpeed') && hasMax) chips.push(`MAX ${Number(activity.maxSpeedKmh).toFixed(1)} km/h`);
  if (stats.includes('elevation') && hasEle) chips.push(`ELEV ▲ ${Math.round(Number(activity.elevationGainM) || 0)} m`);
  if (stats.includes('eco')) chips.push(`ECO ${Math.round(Number(activity.ecoScore) || 0)} · ${Number(activity.co2SavedKg || 0).toFixed(2)} kg CO₂`);

  const chipTopCard = bg === 'map' ? 1172 : BAND.y - 6;
  if (chips.length) {
    ctx.font = `700 ${Math.round(24 * S)}px ${FF}`;
    const gap = 12 * S;
    const parts = chips.map((t) => ({ t, w: ctx.measureText(t).width + 40 * S }));
    const total = parts.reduce((s, p) => s + p.w, 0) + gap * (parts.length - 1);
    const pillH = 44 * S;
    let x = W / 2 - total / 2;
    const top = chipTopCard * S;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 12 * S;
    for (const p of parts) {
      roundRectPath(ctx, x, top, p.w, pillH, pillH / 2);
      ctx.fillStyle = 'rgba(6,9,7,0.66)';
      ctx.fill();
      ctx.lineWidth = 1.4 * S;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(p.t, x + p.w / 2, top + pillH / 2 + 8 * S);
      x += p.w + gap;
    }
    ctx.restore();
  }

  /* ── rounded route-map band (photo background) ── */
  if (bg === 'photo' && view.bandLayer) {
    const pad = 16 * S;
    const bx = (BAND.x - pad) * S;
    const by = (BAND.y - pad) * S;
    const bw = (BAND.w + pad * 2) * S;
    const bh = (BAND.h + pad * 2) * S;
    const r = 34 * S;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 24 * S;
    ctx.shadowOffsetY = 8 * S;
    roundRectPath(ctx, bx, by, bw, bh, r);
    ctx.fillStyle = '#050706';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    roundRectPath(ctx, bx, by, bw, bh, r);
    ctx.clip();
    const lw = view.bandLayer.width;
    const lh = view.bandLayer.height;
    ctx.drawImage(view.bandLayer, 0, 0, lw, lh,
      (BAND.x - 20) * S, (BAND.y - 20) * S, lw * S, lh * S);
    ctx.restore();
    ctx.save();
    roundRectPath(ctx, bx, by, bw, bh, r);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3 * S;
    ctx.stroke();
    ctx.restore();
  }

  /* bottom caption + TERRA brand */
  ctx.font = `600 ${Math.round(15 * S)}px ${FF}`;
  ctx.fillStyle = mapIsColourful ? 'rgba(10,24,14,0.55)' : 'rgba(255,255,255,0.55)';
  drawSpaced(ctx, 'REAL GPS TRACK', W / 2, 1812 * S, 2 * S);
  ctx.font = `800 ${Math.round(54 * S)}px ${FF}`;
  ctx.fillStyle = ink.main;
  shadow(true);
  drawSpaced(ctx, 'TERRA', W / 2, 1880 * S, 26 * S);
  shadow(false);
}

function dayLabel(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
  } catch { return ''; }
}

export function createCardCanvas(w = CARD_W, h = CARD_H) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export async function ensureFonts() {
  try {
    if (!document.fonts || typeof document.fonts.load !== 'function') return;
    const probe = 'TERRA 0123456789 Morning Ride km/h';
    await Promise.all([
      document.fonts.load('800 60px "Plus Jakarta Sans"', probe),
      document.fonts.load('800 60px "Newsreader"', probe),
      document.fonts.load('700 30px "Plus Jakarta Sans"', probe),
    ]);
    await document.fonts.ready;
  } catch { /* fonts are optional */ }
}
