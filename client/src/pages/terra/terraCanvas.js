// ─────────────────────────────────────────────────────────────
// TERRA card renderer — premium Strava-style share card.
// The SAME functions draw the on-screen preview and the exported
// 1080x1920 PNG, so the download always matches the preview.
//
// Composition (modelled on real Strava story cards):
//   top-left   mode dot + CYCLING · WED, SEP 3 kicker
//   top-right  TERRA brand mark (leaf + wordmark)
//   top-left   big bold SANS activity title + optional caption
//   middle     full-bleed REAL map of the user's route — start (A)
//              & finish (B) marked, optional max-speed / summit pins
//   bottom     left-aligned stat grid (small bold label over a big
//              bold value, 3 columns) + micro footer line
//
// Backgrounds: map (real map tiles — black OR standard colours) or
//              photo (user image with the real route traced over it
//              as a white line, exactly like Strava's story route
//              overlay). Solid-colour backgrounds were removed from
//              TERRA entirely — a flat colour is never painted on or
//              behind the card. Soft edge scrims (top/bottom only)
//              keep the text legible; the middle of the map/photo
//              stays untouched. The route is always the user's own
//              recorded GPS track — nothing is ever faked.
// ─────────────────────────────────────────────────────────────

import axios from 'axios';
import { MODE_META } from './geo';

export const CARD_W = 1080;
export const CARD_H = 1920;

/* Where the travelled route sits on the card: the middle band between the
   header text (top) and the stat grid (bottom), so the path is big and clear. */
const MAP_FRAME = { x: 70, y: 640, w: 940, h: 880 };

const FF = '"Plus Jakarta Sans", system-ui, sans-serif';

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
 *   kind 'full'  → CARD-size canvas, real map tiles fill the whole card
 *   kind 'route' → transparent CARD-size canvas with just the white route
 *                  line + markers, traced over a photo background
 * The route is zoomed to its frame; start/finish (A/B) and optional stat
 * pins are painted over real roads. Missing tiles leave that spot clear and
 * the route is still drawn on top — no colour is ever filled as a base.
 */
export async function buildMapLayer(route, { style = 'dark', kind = 'full', pins = {} } = {}) {
  const pts = validRoute(route);
  const key0 = style === 'light' ? 'normal' : style;
  const styleKey = key0 === 'normal' ? 'normal' : 'dark';
  const isDark = styleKey === 'dark';
  const invert = isDark && canvasFilterSupport();
  // 'dark' with canvas filters → OSM tiles inverted to a rich black map.
  // 'dark' without filters → server CARTO dark-matter ('carto_dark') fallback.
  const reqStyle = isDark && !invert ? 'carto_dark' : styleKey;
  const W = CARD_W;
  const H = CARD_H;
  const box = { ...MAP_FRAME };

  const cnv = document.createElement('canvas');
  cnv.width = W;
  cnv.height = H;
  const ctx = cnv.getContext('2d');

  /* kind 'route' → transparent overlay: the real track as a white Strava-style
     line + A/B markers, drawn over a photo background. No tiles fetched. */
  if (kind === 'route') {
    if (pts.length >= 2) {
      const { Z, center } = fitZoomInfo(pts, box);
      const Px = box.x + box.w / 2;
      const Py = box.y + box.h / 2;
      const toPx = (p) => [
        lng2x(p.lng, Z) - lng2x(center.lng, Z) + Px,
        lat2y(p.lat, Z) - lat2y(center.lat, Z) + Py,
      ];
      paintTrack(ctx, pts.map(toPx), WHITE_TRACK);
      paintMarkers(ctx, pts, toPx, pins);
    }
    cnv.tileCount = 0;
    return cnv;
  }

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
  paintTrack(ctx, pts.map(toPx), GREEN_TRACK);
  paintMarkers(ctx, pts, toPx, pins);
  return cnv;
}

/* Route-line schemes: the green brand track over real map tiles, and the
   white Strava-style line traced over photo backgrounds. */
const GREEN_TRACK = {
  casing: 'rgba(6, 16, 10, 0.78)', casingW: 38, // dark casing (reads on light tiles)
  glow: 'rgba(62, 224, 130, 0.40)', glowW: 30,  // soft green glow
  main: '#3ee082', mainW: 16,                   // the app's bright track green
  inner: '#c2f6d8', innerW: 5,                  // inner highlight keeps it crisp
};
const WHITE_TRACK = {
  casing: 'rgba(0, 0, 0, 0.55)', casingW: 26,
  glow: 'rgba(255, 255, 255, 0.30)', glowW: 18,
  main: '#ffffff', mainW: 9,
  inner: null,
};

function paintTrack(ctx, mapPts, scheme) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const trace = () => {
    ctx.beginPath();
    mapPts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  };
  // Same visual language as the "Open full journey" map: a bright route line
  // over a dark casing + soft glow so it pops on both the black map and the
  // light standard map, exactly like the track in the full journey.
  trace(); ctx.strokeStyle = scheme.casing; ctx.lineWidth = scheme.casingW; ctx.stroke();
  trace(); ctx.strokeStyle = scheme.glow; ctx.lineWidth = scheme.glowW; ctx.stroke();
  trace(); ctx.strokeStyle = scheme.main; ctx.lineWidth = scheme.mainW; ctx.stroke();
  if (scheme.inner) { trace(); ctx.strokeStyle = scheme.inner; ctx.lineWidth = scheme.innerW; ctx.stroke(); }
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
/* TERRA brand mark, top-right: green leaf + spaced wordmark (the Strava
   logo slot on their story cards). */
function drawBrand(ctx, W, S) {
  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 ${Math.round(30 * S)}px ${FF}`;
  try { ctx.letterSpacing = `${8 * S}px`; } catch { /* noop */ }
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 12 * S;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('TERRA', W - 84 * S, 170 * S);
  const tw = ctx.measureText('TERRA').width;
  try { ctx.letterSpacing = '0px'; } catch { /* noop */ }
  // leaf sits left of the wordmark
  const lx = W - 84 * S - tw - 14 * S;
  const ly = 160 * S;
  ctx.fillStyle = '#3ee082';
  ctx.beginPath();
  ctx.moveTo(lx - 13 * S, ly + 13 * S);
  ctx.quadraticCurveTo(lx - 13 * S, ly - 13 * S, lx + 13 * S, ly - 13 * S);
  ctx.quadraticCurveTo(lx + 13 * S, ly + 13 * S, lx - 13 * S, ly + 13 * S);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  let overflow = false;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length >= maxLines) { overflow = true; break; }
    } else line = test;
  }
  if (line && lines.length < maxLines) lines.push(line);
  else if (overflow && lines.length) lines[lines.length - 1] += '…';
  return lines;
}
function drawCover(ctx, img, W, H) {
  const ir = img.width / img.height;
  const cr = W / H;
  let sw, sh;
  if (ir > cr) { sh = H; sw = H * ir; } else { sw = W; sh = W / ir; }
  ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
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
 * MAIN renderer. view: { bg, mapStyle, title, caption, mapLayer, routeLayer,
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

  const setTracking = (px) => { try { ctx.letterSpacing = `${px}px`; } catch { /* older browsers */ } };

  /* ── background: full-bleed map or photo + soft edge scrims ── */
  if (bg === 'map' && view.mapLayer) {
    // Pure real tiles — never dyed a flat colour; the green route track is
    // already part of this layer.
    ctx.drawImage(view.mapLayer, 0, 0, W, H);
  } else if (bg === 'photo' && view.img) {
    drawCover(ctx, view.img, W, H);
  }
  // Strava-style: over a photo the REAL route is traced on the image itself
  // as a white line (no rounded band, no fake map).
  if (bg === 'photo' && view.routeLayer) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 12 * S;
    ctx.drawImage(view.routeLayer, 0, 0, W, H);
    ctx.restore();
  }
  // Legibility scrims on the top & bottom edges ONLY — the middle of the
  // map/photo stays fully real. No flat colour is ever painted on the card.
  let grad = ctx.createLinearGradient(0, 0, 0, 780 * S);
  grad.addColorStop(0, 'rgba(4,8,5,0.80)');
  grad.addColorStop(0.55, 'rgba(4,8,5,0.32)');
  grad.addColorStop(1, 'rgba(4,8,5,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 780 * S);
  grad = ctx.createLinearGradient(0, 1180 * S, 0, H);
  grad.addColorStop(0, 'rgba(4,8,5,0)');
  grad.addColorStop(0.5, 'rgba(4,8,5,0.58)');
  grad.addColorStop(1, 'rgba(4,8,5,0.94)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 1180 * S, W, H - 1180 * S);

  ctx.textBaseline = 'alphabetic';

  /* ── kicker (left) + TERRA brand (right) ── */
  ctx.textAlign = 'left';
  ctx.font = `800 ${Math.round(27 * S)}px ${FF}`;
  setTracking(4 * S);
  const kicker = `${mode.label.toUpperCase()} · ${dayLabel(activity.startTime)}`;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10 * S;
  ctx.fillStyle = mode.color;
  ctx.beginPath();
  ctx.arc(94 * S, 158 * S, 9 * S, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(kicker, 120 * S, 168 * S);
  ctx.restore();
  setTracking(0);
  drawBrand(ctx, W, S);

  /* ── big bold sans title, left aligned (Strava premium look) ── */
  ctx.textAlign = 'left';
  setTracking(-1.5 * S);
  ctx.font = `800 ${Math.round(92 * S)}px ${FF}`;
  const tLines = wrapLines(ctx, title, W - 168 * S, 2);
  let y = 296 * S;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 26 * S;
  ctx.shadowOffsetY = 3 * S;
  ctx.fillStyle = '#ffffff';
  tLines.forEach((ln) => { ctx.fillText(ln, 84 * S, y); y += 104 * S; });
  ctx.restore();
  setTracking(0);

  /* ── caption ── */
  if (caption) {
    ctx.font = `500 ${Math.round(38 * S)}px ${FF}`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const cLines = wrapLines(ctx, caption, W - 200 * S, 2);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 14 * S;
    cLines.forEach((ln) => { ctx.fillText(ln, 84 * S, y + 6 * S); y += 54 * S; });
    ctx.restore();
  }

  /* ── bottom stat grid — Strava premium: small bold label over a big bold
       value, left-aligned 3-column grid, sitting on the bottom scrim ── */
  const GRID = {
    distance: { label: 'DISTANCE', value: `${distValue(Number(activity.distanceKm) || 0)} km` },
    time: { label: 'TIME', value: durationWord(Number(activity.durationSec) || 0) },
    avgSpeed: { label: 'SPEED', value: Number(activity.avgSpeedKmh) > 0 ? `${Number(activity.avgSpeedKmh).toFixed(1)} km/h` : '—' },
    maxSpeed: { label: 'MAX SPEED', value: Number(activity.maxSpeedKmh) > 0 ? `${Number(activity.maxSpeedKmh).toFixed(1)} km/h` : null },
    elevation: { label: 'ELEV GAIN', value: activity.hasElevation ? `${Math.round(Number(activity.elevationGainM) || 0)} m` : null },
    eco: { label: 'ECO SCORE', value: `${Math.round(Number(activity.ecoScore) || 0)} · ${Number(activity.co2SavedKg || 0).toFixed(2)} kg CO₂` },
  };
  const cells = stats.map((k) => GRID[k]).filter((c) => c && c.value);
  const colX = [84, 428, 772];
  const rowsN = Math.max(1, Math.ceil(cells.length / 3));
  const rowPitch = 170 * S;
  const lastValueY = H - 92 * S;
  const firstLabelY = lastValueY - (rowsN - 1) * rowPitch - 74 * S;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 12 * S;
  cells.forEach((c, i) => {
    const cx = colX[i % 3] * S;
    const ly = firstLabelY + Math.floor(i / 3) * rowPitch;
    ctx.textAlign = 'left';
    ctx.font = `800 ${Math.round(24 * S)}px ${FF}`;
    setTracking(3 * S);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillText(c.label, cx, ly);
    setTracking(0);
    let size = 64 * S;
    ctx.font = `800 ${Math.round(size)}px ${FF}`;
    // the last column keeps a right margin from the card edge
    const capW = (i % 3 === 2 ? 240 : 296) * S;
    const vw = ctx.measureText(c.value).width;
    if (vw > capW) { size = (size * capW) / vw; ctx.font = `800 ${Math.round(size)}px ${FF}`; }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(c.value, cx, ly + 72 * S);
  });
  ctx.restore();

  /* micro footer */
  ctx.textAlign = 'center';
  ctx.font = `700 ${Math.round(17 * S)}px ${FF}`;
  setTracking(5 * S);
  ctx.fillStyle = 'rgba(255,255,255,0.52)';
  ctx.fillText('REAL GPS TRACK · GREENROUTE TERRA', W / 2, H - 30 * S);
  setTracking(0);

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
