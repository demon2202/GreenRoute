// ─────────────────────────────────────────────────────────────
// TERRA card renderer v2 — "Strava-style share card".
// The SAME functions draw the on-screen preview and the exported
// 1080x1920 PNG, so the download always matches the preview.
//
// Composition (matches the reference card):
//   kicker  CYCLING · WED SEP 3         } white text only
//   big activity title                  } straight & centered
//   optional caption                    }
//   Distance · Pace · Time              } big white stacked values
//   ── route layout panel ── subtle grid + the user's REAL route
//   TERRA (brand bottom centre)
//
// Backgrounds: black | map (real tiles) | photo (user image).
// All typography is white.
// ─────────────────────────────────────────────────────────────

import { MODE_META } from './geo';

export const CARD_W = 1080;
export const CARD_H = 1920;

/* route "layout" panel on the card (full map bg draws across the card;
   black/photo draw a rounded Strava-style route-map box in this band) */
export const PANEL = { x: 74, y0: 1460, w: 932, h: 330, y1: 1790 };
const PANEL_CY = (PANEL.y0 + PANEL.y1) / 2;
/* rounded route-map box (used by black & photo backgrounds) */
const MAPBOX_R = { x: 100, y: 1462, w: 880, h: 298, y1: 1760 };
const ACCENT = '#8ef5a4';

const FF = '"Plus Jakarta Sans", system-ui, sans-serif';
const FS = '"Newsreader", Georgia, serif';

/* ── origin / api ─────────────────────────────────────────── */
function resolveApiOrigin() {
  const raw = (process.env.REACT_APP_API_URL || '').trim();
  if (raw === '' || raw === '/') return '';
  if (/^https?:\/\//.test(raw)) return raw;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:5000';
  return 'https://greenroute-backend-syxi.onrender.com';
}
export const API = (() => {
  const o = resolveApiOrigin();
  return /^https?:/.test(o) ? '' : o;
})();
const MEDIA_ORIGIN = resolveApiOrigin();

export function absoluteUrl(u) {
  if (!u) return '';
  if (/^(https?:)?\/\//.test(u)) return u;
  if (!MEDIA_ORIGIN) return new URL(u, window.location.origin + '/').href;
  return `${MEDIA_ORIGIN}${u.startsWith('/') ? '' : '/'}${u}`;
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

// Worker-pool (concurrency 3) + single retry for tile requests so bursts
// don't get throttled by the tile server (keeps the map background reliable).
let inFlight = 0;
const waiters = [];
function acquire() {
  if (inFlight < 3) { inFlight += 1; return Promise.resolve(); }
  return new Promise((res) => waiters.push(res));
}
function release() {
  inFlight -= 1;
  const w = waiters.shift();
  if (w) w();
}

async function fetchTileOnce(z, x, y) {
  const url = `${MEDIA_ORIGIN}/api/terra/tile/${z}/${x}/${y}`;
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

export async function fetchTile(z, x, y) {
  await acquire();
  try {
    try {
      return await fetchTileOnce(z, x, y);
    } catch {
      await new Promise((r) => setTimeout(r, 400));
      return await fetchTileOnce(z, x, y);
    }
  } finally {
    release();
  }
}

/* ── mercator helpers (map background) ────────────────────── */
const MAXLAT = 85.05112878;
function lng2x(lng, z) { return ((lng + 180) / 360) * 256 * Math.pow(2, z); }
function lat2y(lat, z) {
  const c = Math.max(-MAXLAT, Math.min(MAXLAT, lat));
  const s = Math.sin((c * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256 * Math.pow(2, z);
}
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
const validRoute = (r) => (r || []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));

/* project GPS route into the route-layout panel (aspect preserved) */
function projectToPanel(route, inset = 60) {
  const R = { x: PANEL.x + inset, y: PANEL.y0 + inset, w: PANEL.w - inset * 2, h: PANEL.h - inset * 2 };
  const { minLat, maxLat, minLng, maxLng } = routeBounds(route);
  const bw = Math.max(maxLng - minLng, 1e-9);
  const bh = Math.max(maxLat - minLat, 1e-9);
  const cx = (minLng + maxLng) / 2;
  const cy = (minLat + maxLat) / 2;
  const k = Math.cos((cy * Math.PI) / 180) || 1;
  const s = Math.min(R.w / (bw * k), R.h / bh);
  return route.map((p) => [R.x + R.w / 2 + (p.lng - cx) * k * s, R.y + R.h / 2 + (cy - p.lat) * s]);
}

function tracePath(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
}

/* ORANGE activity route (Strava-style) — used on every card background.
   Warm dark casing keeps it legible over maps/photos; the glow makes it
   read as the "circuit" of roads the user traveled. */
const ROUTE_GLOW = 'rgba(255,90,30,0.32)';
const ROUTE_CORE = '#ff5a1c';
const ROUTE_HI = '#ffb27a';

/** Route line + start/end markers (shared by every bg). */
function paintRoute(ctx, pts, S) {
  if (!pts || pts.length < 2) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // outer glow (nicest on black)
  tracePath(ctx, pts);
  ctx.strokeStyle = ROUTE_GLOW;
  ctx.lineWidth = 42 * S;
  ctx.stroke();
  // dark warm casing (keeps it visible on light maps / photos)
  tracePath(ctx, pts);
  ctx.strokeStyle = 'rgba(46,20,4,0.75)';
  ctx.lineWidth = 25 * S;
  ctx.stroke();
  // main orange line
  tracePath(ctx, pts);
  ctx.strokeStyle = ROUTE_CORE;
  ctx.lineWidth = 14 * S;
  ctx.stroke();
  // hot highlight
  tracePath(ctx, pts);
  ctx.strokeStyle = ROUTE_HI;
  ctx.lineWidth = 4.5 * S;
  ctx.stroke();

  const ring = (p, fill, stroke) => {
    ctx.beginPath();
    ctx.arc(p[0], p[1], 16 * S, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20,8,2,0.6)';
    ctx.fill();
    ctx.lineWidth = 4 * S;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p[0], p[1], 9 * S, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  };
  ring(pts[0], '#ffffff', 'rgba(255,255,255,0.9)');
  ring(pts[pts.length - 1], ROUTE_CORE, 'rgba(255,255,255,0.9)');
  ctx.restore();
}

/* blueprint-style subtle grid behind the route (black & photo) */
function drawRouteGrid(ctx, W, H, S) {
  const x0 = PANEL.x * S, x1 = (PANEL.x + PANEL.w) * S;
  const y0 = PANEL.y0 * S, y1 = PANEL.y1 * S;
  ctx.save();
  const step = 43 * S;
  ctx.lineWidth = Math.max(1, 1 * S);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let y = y0; y <= y1; y += step) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
  for (let x = x0; x <= x1; x += step) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = Math.max(1.2, 1.6 * S);
  for (let y = y0 + step * 2; y <= y1; y += step * 2) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
  for (let x = x0 + step * 2; x <= x1; x += step * 2) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = Math.max(1.5, 2 * S);
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
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

/**
 * Draw a rounded "route map" box (Strava-style activity map) inside the
 * route band. The passed `mapLayer` is a full-card map canvas whose route
 * is centred on the band; we simply expose that region through the clip.
 */
function drawBandMap(ctx, mapLayer, W, H, S) {
  const b = MAPBOX_R;
  const pad = 12 * S;
  const x = (b.x - pad) * S;
  const y = (b.y - pad) * S;
  const w = (b.w + pad * 2) * S;
  const h = (b.h + pad * 2) * S;
  const r = 30 * S;

  ctx.save();
  // soft drop shadow behind the box so it lifts off black/photo
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 26 * S;
  ctx.shadowOffsetY = 10 * S;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = '#0a0d0b';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // map inside
  roundRectPath(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(mapLayer, 0, 0, W, H);
  ctx.restore();

  // hairline frame
  ctx.save();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 3 * S;
  ctx.stroke();
  ctx.restore();
}

/** Draw the grid + white projected-route fallback (used when no tiles). */
function drawGridRouteFallback(ctx, route, S) {
  drawRouteGrid(ctx, CARD_W, CARD_H, S);
  if (route && route.length >= 2) paintRoute(ctx, projectToPanel(route), S);
}

/* ── map background: real tiles with the route over real roads ──
   Works in tile-pixel space (native scale): world coord → px = (lng2x - bx) + W/2.
   Choose the highest zoom where the route still fits the route band, so the
   map stays crisp and the white route overlays the actual roads. */
function chooseZoom(route) {
  const { minLat, maxLat, minLng, maxLng } = routeBounds(route);
  const wpx = (z) => Math.abs(lng2x(maxLng, z) - lng2x(minLng, z));
  const hpx = (z) => Math.abs(lat2y(maxLat, z) - lat2y(minLat, z));
  const fits = (z) => wpx(z) <= CARD_W * 0.8 && hpx(z) <= PANEL.h * 0.6;
  let z = 6;
  while (z < 18 && fits(z + 1)) z += 1;
  if (!fits(z)) z = 6;
  return z;
}

export async function buildMapLayer(route) {
  const W = CARD_W;
  const H = CARD_H;
  const pts = validRoute(route);
  const zoom = chooseZoom(pts);
  const { minLat, maxLat, minLng, maxLng } = routeBounds(pts);
  const bx = (lng2x(minLng, zoom) + lng2x(maxLng, zoom)) / 2;
  const by = (lat2y(minLat, zoom) + lat2y(maxLat, zoom)) / 2;
  // centre the visible window so the route band sits at PANEL_CY
  const offsetY = PANEL_CY - H / 2; // in canvas px
  const bcy = by - offsetY;

  const cnv = document.createElement('canvas');
  cnv.width = W;
  cnv.height = H;
  const ctx = cnv.getContext('2d');

  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#1b231f');
  base.addColorStop(1, '#0c110e');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  const halfW = W / 2;
  const halfH = H / 2;
  const col0 = Math.max(0, Math.floor((bx - halfW) / 256));
  const col1 = Math.min((1 << zoom) - 1, Math.ceil((bx + halfW) / 256));
  const row0 = Math.max(0, Math.floor((bcy - halfH) / 256));
  const row1 = Math.min((1 << zoom) - 1, Math.ceil((bcy + halfH) / 256));

  const jobs = [];
  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) {
      jobs.push(fetchTile(zoom, col, row).then((img) => ({ img, col, row })).catch(() => null));
    }
  }
  const results = (await Promise.all(jobs)).filter(Boolean);
  for (const { img, col, row } of results) {
    const dx = col * 256 - bx + W / 2;
    const dy = row * 256 - bcy + H / 2;
    ctx.drawImage(img, dx, dy, 256, 256);
  }

  // tints + readability scrims (stronger at top where text lives)
  ctx.fillStyle = 'rgba(8,14,10,0.10)';
  ctx.fillRect(0, 0, W, H);
  const sc = ctx.createLinearGradient(0, 0, 0, H);
  sc.addColorStop(0, 'rgba(0,0,0,0.48)');
  sc.addColorStop(0.22, 'rgba(0,0,0,0.14)');
  sc.addColorStop(0.7, 'rgba(0,0,0,0.06)');
  sc.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = sc;
  ctx.fillRect(0, 0, W, H);

  // route (band area) in real coordinates — crisp over actual roads
  const mapPts = pts.map((p) => [
    lng2x(p.lng, zoom) - bx + W / 2,
    lat2y(p.lat, zoom) - bcy + H / 2,
  ]);
  paintRoute(ctx, mapPts, 1);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(PANEL.x, PANEL.y0, PANEL.w, PANEL.h);
  return cnv;
}

/* ── typography helpers ───────────────────────────────────── */
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

/* formatting that matches the reference numbers */
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
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/* ── MAIN renderer ────────────────────────────────────────── */
export async function renderStory(canvas, activity, view) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const S = W / CARD_W;

  const bg = view.bg || 'black';
  const title = (view.title ?? activity.title ?? '').trim() || 'My Journey';
  const caption = (view.caption ?? activity.caption ?? '').trim();
  const mode = MODE_META[activity.mode] || MODE_META.cycling;
  const route = validRoute(activity.route);
  const mapOK = !!view.mapLayer && route.length >= 2;

  /* background */
  if (bg === 'map' && mapOK) {
    ctx.drawImage(view.mapLayer, 0, 0, W, H);
  } else if (bg === 'photo' && view.img) {
    drawCover(ctx, view.img, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0.5)');
    g.addColorStop(0.3, 'rgba(0,0,0,0.18)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.16)');
    g.addColorStop(1, 'rgba(0,0,0,0.82)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (!mapOK) drawGridRouteFallback(ctx, route, S);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#111512');
    g.addColorStop(0.42, '#0a0d0b');
    g.addColorStop(1, '#050706');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (!mapOK) drawGridRouteFallback(ctx, route, S);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const shadow = (on) => { ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = on ? 26 * S : 0; };

  /* kicker */
  const kicker = `${(activity.mode || mode.label).toUpperCase()} · ${dayLabel(activity.startTime)}`;
  ctx.font = `700 ${Math.round(30 * S)}px ${FF}`;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  shadow(true);
  drawSpaced(ctx, kicker, W / 2, 196 * S, 6 * S);
  shadow(false);

  /* title */
  ctx.font = `800 ${Math.round(98 * S)}px ${FS}`;
  const tLines = wrapLines(ctx, title, W - 240 * S, 2);
  let headerEnd = 336 * S + (tLines.length - 1) * 120 * S;
  shadow(true);
  tLines.forEach((ln, i) => ctx.fillText(ln, W / 2, 336 * S + i * 120 * S));
  shadow(false);

  /* caption */
  if (caption) {
    ctx.font = `500 ${Math.round(48 * S)}px ${FS}`;
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    const cLines = wrapLines(ctx, caption, W - 280 * S, 2);
    const c0 = headerEnd + 150 * S;
    shadow(true);
    cLines.forEach((ln, i) => ctx.fillText(ln, W / 2, c0 + i * 70 * S));
    shadow(false);
    headerEnd = c0 + (cLines.length - 1) * 70 * S;
  }

  /* values — Distance · Speed · Time (matching the reference layout) */
  const distKm = Number(activity.distanceKm) || 0;
  const durSec = Number(activity.durationSec) || 0;
  const avgSpd = Number(activity.avgSpeedKmh) || 0;

  const rows = [
    { label: 'DISTANCE', value: `${distValue(distKm)} km` },
    { label: 'SPEED', value: avgSpd > 0 ? `${avgSpd.toFixed(1)} km/h` : '—' },
    { label: 'TIME', value: durationWord(durSec) },
  ];

  // centre the stacked stat block in the free space between the header
  // and the route panel (keeps every line straight).
  const rowPitch = 205 * S;
  const valueGap = 152 * S;
  const totalH = 2 * rowPitch + valueGap; // offset of last value baseline
  const availTop = headerEnd + 150 * S;
  const blockBottomMax = PANEL.y0 * S - 40 * S;
  let startY;
  if (blockBottomMax - availTop >= totalH + 80 * S) {
    startY = availTop + (blockBottomMax - totalH - availTop) / 2;
  } else {
    startY = Math.max(availTop, blockBottomMax - totalH);
  }

  shadow(true);
  rows.forEach((r, i) => {
    const y0 = startY + i * rowPitch;
    // label
    ctx.font = `700 ${Math.round(31 * S)}px ${FF}`;
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    drawSpaced(ctx, r.label, W / 2, y0, 8 * S);
    // value (fit if long)
    let size = 128 * S;
    ctx.font = `800 ${Math.round(size)}px ${FS}`;
    let vw = ctx.measureText(r.value).width;
    const cap = W - 360 * S;
    if (vw > cap) {
      size = (size * cap) / vw;
      ctx.font = `800 ${Math.round(size)}px ${FS}`;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(r.value, W / 2, y0 + valueGap);
  });
  shadow(false);

  /* Strava-style route map box — black & photo backgrounds reveal the real
     route map (tiles) in a rounded box; full "map" background already shows
     the route over the map. When tiles aren't available the fallback grid +
     real-route drawing above is used instead. */
  if (mapOK && bg !== 'map') {
    drawBandMap(ctx, view.mapLayer, W, H, S);
  }

  /* TERRA brand — single clean white wordmark, bottom centre */
  ctx.font = `800 ${Math.round(58 * S)}px ${FF}`;
  ctx.fillStyle = '#ffffff';
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
  } catch { /* fonts optional */ }
}
