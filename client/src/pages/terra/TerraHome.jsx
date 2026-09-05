import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { TerraIcon, ModeGlyph, ModePill } from './Icons';
import { fmtDist, fmtDuration, weekdayShort, co2SavedKg, MODE_META } from './geo';
import { MODES } from './constants';

/* ────────────────────────────────────────────────────────────
   TERRA home — hero + "Recent journeys" gallery.
   Each journey is a big story card: the artwork is drawn on a
   canvas using the SAME background language as the story card
   (map style dark/normal or photo — solid colour was removed
   from TERRA entirely), so what you set in the story editor is
   what you see here.
   ──────────────────────────────────────────────────────────── */
export default function TerraHome({ goRecord, goDetail, goEdit }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('cycling');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/terra/activities');
      if (Array.isArray(data)) setList(data);
    } catch (e) {
      console.warn('terra list error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    let km = 0, co2 = 0;
    for (const a of list) {
      km += Number(a.distanceKm) || 0;
      co2 += Number(a.co2SavedKg) || 0;
    }
    return { km, co2, n: list.length };
  }, [list]);

  return (
    <div className="terra-page">
      <section className="terra-hero">
        <div className="terra-hero-glow" aria-hidden="true" />
        <div className="terra-hero-copy">
          <div className="terra-hero-kicker"><TerraIcon name="leaf" size={14} /> TERRA · GREENROUTE</div>
          <h1>Turn your ride into a story.</h1>
          <p>Record real GPS, then make a shareable 9:16 card — your route drawn over the actual map, in black or standard colours, or over your own photo.</p>
          <div className="terra-hero-actions">
            <button className="terra-btn primary big" onClick={() => goRecord(mode)}>
              <TerraIcon name="crosshair" size={18} /> Start Activity
            </button>
            <div className="mode-picker" style={{ margin: 0 }}>
              {MODES.map((m) => <ModePill key={m.id} mode={m.id} active={mode === m.id} onClick={setMode} />)}
            </div>
          </div>
        </div>
        <div className="terra-hero-stats">
          <div><b>{list.length}</b><span>Journeys</span></div>
          <div><b>{fmtDist(totals.km)}</b><span>Distance</span></div>
          <div><b>{totals.co2.toFixed(2)} kg</b><span>CO₂ avoided</span></div>
        </div>
      </section>

      <div className="terra-section-title">
        <h2>Recent journeys</h2>
        {list.length > 0 && <span className="terra-section-note">Tap a card to open it full-screen</span>}
      </div>

      {loading && <div className="terra-empty"><b>Loading journeys…</b></div>}
      {!loading && list.length === 0 && (
        <div className="terra-empty">
          <b>No journeys yet</b>
          Tap <b style={{ color: 'var(--green-600)' }}>Start Activity</b>, move around, then finish to create your first TERRA story.
        </div>
      )}

      <div className="terra-journeys">
        {list.map((a) => (
          <JourneyCard
            key={a._id}
            activity={a}
            onOpen={() => goDetail(a._id)}
            onEdit={() => goEdit(a._id)}
          />
        ))}
      </div>
    </div>
  );
}

const THUMB_W = 264;
const THUMB_H = 330;

function JourneyCard({ activity: a, onOpen, onEdit }) {
  const artRef = useRef(null);
  const photoRef = useRef(null);

  // Only Map (dark/standard) and Photo exist now — legacy 'color'/'black' cards
  // are read as Map so no solid colour can ever appear on the gallery.
  const isPhoto = a.bg === 'photo';
  const mapStyle = a.mapStyle === 'dark' ? 'dark' : 'normal'; // legacy 'light' → normal
  const badge = isPhoto ? 'Photo' : (mapStyle === 'dark' ? 'Black map' : 'Standard map');
  const meta = MODE_META[a.mode] || MODE_META.cycling;

  useEffect(() => {
    const c = artRef.current;
    if (!c) return;
    // photo art needs the actual file
    if (isPhoto && a.photo) {
      const img = new Image();
      img.onload = () => { photoRef.current = img; drawRideArt(c, a, img); };
      img.onerror = () => { photoRef.current = null; drawRideArt(c, a, null); };
      img.src = a.photo.startsWith('http') ? a.photo : a.photo; // same-origin /uploads path
    } else {
      photoRef.current = null;
      drawRideArt(c, a, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a._id, a.bg, a.mapStyle, a.photo]);

  return (
    <article className="terra-journey">
      <button type="button" className="tj-open" onClick={onOpen} aria-label={`Open ${a.title || 'journey'}`}>
        <canvas ref={artRef} width={THUMB_W} height={THUMB_H} />
        <span className="tj-scrim" aria-hidden="true" />
        <span className="tj-topline" aria-hidden="true">
          <span className="tj-chip mode" style={{ color: meta.color }}><ModeGlyph mode={a.mode} /> {meta.label}</span>
          <span className="tj-chip bg">{badge}</span>
        </span>
        <span className="tj-headline">
          <span className="tj-title">{a.title || 'My Journey'}</span>
          <span className="tj-date">{weekdayShort(a.startTime || a.createdAt)}</span>
        </span>
      </button>

      <div className="tj-body">
        <div className="tj-stats">
          <span className="tj-stat"><em>Distance</em><span className="tj-line"><b>{fmtDist(a.distanceKm)}</b><i>km</i></span></span>
          <span className="tj-stat"><em>Time</em><span className="tj-line"><b>{fmtDuration(a.durationSec)}</b></span></span>
          <span className="tj-stat"><em>Eco</em><span className="tj-line"><b>{Math.round(a.ecoScore || 0)}</b><i>/100</i></span></span>
        </div>
        <div className="tj-actions">
          <button type="button" className="tj-btn" onClick={onOpen}><TerraIcon name="eye" size={16} /> Open journey</button>
          <button type="button" className="tj-btn solid" onClick={onEdit}><TerraIcon name="pen" size={15} /> Edit story</button>
        </div>
        <div className="tj-co2">🌱 {Number(a.co2SavedKg || co2SavedKg(a.mode, a.distanceKm)).toFixed(2)} kg CO₂ avoided</div>
      </div>
    </article>
  );
}

/* ── Canvas artwork: same look-family as the story card ─── */
export function drawRideArt(canvas, a, img) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const mapStyle = a.mapStyle === 'dark' ? 'dark' : 'normal'; // legacy 'light' → normal
  const PAL = {
    dark: { c0: '#0c1210', c1: '#17231b', grid: 'rgba(255,255,255,0.05)', road: 'rgba(255,255,255,0.10)', water: 'rgba(90,140,255,0.10)', park: 'rgba(60,180,120,0.10)', route: '#4ade80', routeGlow: 'rgba(74,222,128,0.35)', ink: '#ffffff' },
    normal: { c0: '#e9efe6', c1: '#dbe6d5', grid: 'rgba(20,50,30,0.08)', road: 'rgba(120,100,70,0.20)', water: 'rgba(96,165,250,0.35)', park: 'rgba(134,200,130,0.55)', route: '#0d7a43', routeGlow: 'rgba(13,122,67,0.35)', ink: '#0c2a18' },
  };

  // A photo draws when the actual file is available. Everything else — map
  // cards AND any legacy colour/black card — draws as the map card, so a solid
  // colour can never appear on the gallery.
  if (a.bg === 'photo' && img) {
    cover(ctx, img, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0.05)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.05)');
    g.addColorStop(1, 'rgba(0,0,0,0.66)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    drawRoute(ctx, activityRoute(a.route), w, h, 'rgba(255,255,255,0.35)', '#ffffff', '#ffffff');
    return;
  }

  const p = PAL[mapStyle];
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, p.c0); g.addColorStop(1, p.c1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // stylised neighbourhood
  ctx.fillStyle = p.water;
  ctx.beginPath(); ctx.ellipse(w * 0.72, h * 0.2, w * 0.34, h * 0.16, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.park;
  ctx.beginPath(); ctx.ellipse(w * 0.22, h * 0.78, w * 0.3, h * 0.2, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = p.grid; ctx.lineWidth = 1;
  for (let i = 0; i <= 6; i++) {
    const x = (w / 6) * i, y = (h / 6) * i;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.strokeStyle = p.road; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-10, h * 0.52); ctx.bezierCurveTo(w * 0.3, h * 0.2, w * 0.55, h * 0.85, w + 10, h * 0.44); ctx.stroke();
  drawRoute(ctx, activityRoute(a.route), w, h, p.routeGlow, p.route, p.ink);
}

function drawRoute(ctx, route, w, h, glowCol, mainCol, dotCol) {
  if (route.length < 2) return;
  const pts = project(route, w * 0.1, w * 0.9, h * 0.16, h * 0.72);
  ctx.lineJoin = ctx.lineCap = 'round';
  const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))); };
  path(); ctx.strokeStyle = glowCol; ctx.lineWidth = 11; ctx.stroke();
  path(); ctx.strokeStyle = mainCol; ctx.lineWidth = 4.5; ctx.stroke();
  // start A, finish B
  const [ax, ay] = pts[0];
  const [bx, by] = pts[pts.length - 1];
  for (const [x, y, col] of [[ax, ay, '#22c55e'], [bx, by, '#fb923c']]) {
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }
}

function cover(ctx, img, w, h) {
  const ir = img.width / img.height;
  const cr = w / h;
  let dw, dh;
  if (ir > cr) { dh = h; dw = h * ir; } else { dw = w; dh = w / ir; }
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function activityRoute(route) {
  return (route || []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

function project(route, x0, x1, y0, y1) {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const p of route) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  const cy = (minLat + maxLat) / 2;
  const k = Math.cos((cy * Math.PI) / 180) || 1;
  const bw = Math.max((maxLng - minLng) * k, 1e-9);
  const bh = Math.max(maxLat - minLat, 1e-9);
  const s = Math.min((x1 - x0) / bw, (y1 - y0) / bh);
  const cx = (minLng + maxLng) / 2;
  return route.map((p) => [x0 + (x1 - x0) / 2 + (p.lng - cx) * k * s, y0 + (y1 - y0) / 2 + (cy - p.lat) * s]);
}
