import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { TerraIcon, ModeGlyph, ModePill } from './Icons';
import { fmtDist, fmtDuration, weekdayShort, co2SavedKg } from './geo';
import { MODES } from './constants';

export default function TerraHome({ goRecord, goDetail }) {
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
        <div className="terra-hero-kicker"><TerraIcon name="leaf" size={14} /> TERRA · GREENROUTE</div>
        <h1>Your journeys.<br />Your movement. Your impact.</h1>
        <p>Record a ride, walk or run with live GPS. Finish, and TERRA turns your real track into a beautiful 9:16 story you can save or share.</p>
        <div className="mode-picker" style={{ marginBottom: 16 }}>
          {MODES.map((m) => <ModePill key={m.id} mode={m.id} active={mode === m.id} onClick={setMode} />)}
        </div>
        <div className="terra-hero-actions">
          <button className="terra-btn primary big" onClick={() => goRecord(mode)}>
            <TerraIcon name="crosshair" size={17} /> Start Activity
          </button>
        </div>
        <div className="terra-hero-stats">
          <div><b>{list.length}</b><span>Journeys</span></div>
          <div><b>{fmtDist(totals.km)} km</b><span>Distance</span></div>
          <div><b>{totals.co2.toFixed(2)} kg</b><span>CO₂ avoided</span></div>
        </div>
      </section>

      <div className="terra-section-title">
        <h2>Recent journeys</h2>
      </div>

      {loading && <div className="terra-empty"><b>Loading journeys…</b></div>}
      {!loading && list.length === 0 && (
        <div className="terra-empty">
          <b>No journeys yet</b>
          Tap <b style={{ color: 'var(--terra-green-2)' }}>Start Activity</b>, move around, then finish to create your first TERRA story.
        </div>
      )}

      <div className="terra-journeys">
        {list.map((a) => <JourneyCard key={a._id} activity={a} onClick={() => goDetail(a._id)} />)}
      </div>
    </div>
  );
}

function JourneyCard({ activity, onClick }) {
  const thumbRef = useRef(null);
  useEffect(() => {
    if (thumbRef.current && activity?.route?.length >= 2) drawThumb(thumbRef.current, activity);
  }, [activity]);

  return (
    <button className="terra-journey" onClick={onClick} type="button">
      <div className="journey-thumb"><canvas ref={thumbRef} width="148" height="148" /></div>
      <div className="journey-body">
        <div className="j-title">
          <ModeGlyph mode={activity.mode} />
          {activity.title || 'My Journey'}
        </div>
        <div className="j-meta">
          <span>{weekdayShort(activity.startTime || activity.createdAt)}</span>
          <span><b>{fmtDist(activity.distanceKm)} km</b></span>
          <span><b>{fmtDuration(activity.durationSec)}</b></span>
        </div>
        <div className="journey-foot">
          {activity.bg === 'map' && <span className="tag">Map</span>}
          {activity.bg === 'photo' && <span className="tag">Photo</span>}
          {activity.bg === 'black' && <span className="tag">Minimal</span>}
          {activity.mode !== 'driving' && (
            <span className="tag">🌱 {Number(activity.co2SavedKg || co2SavedKg(activity.mode, activity.distanceKm)).toFixed(2)} kg CO₂</span>
          )}
          <span className="tag" style={{ color: 'var(--terra-green-2)' }}>ECO {Math.round(activity.ecoScore || 0)}</span>
        </div>
      </div>
      <div style={{ alignSelf: 'center', color: 'var(--terra-muted)' }}><TerraIcon name="back" size={18} style={{ transform: 'rotate(180deg)' }} /></div>
    </button>
  );
}

/** Tiny canvas route preview (pure vector — fast, no tiles needed). */
export function drawThumb(canvas, a) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1a241d');
  g.addColorStop(1, '#0b0f0c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // faint grid
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const x = (w / 4) * i;
    const y = (h / 4) * i;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  const pts = project(activityRoute(a.route), 8, w - 8, 8, h - 8);
  if (pts.length < 2) return;
  ctx.lineJoin = ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.strokeStyle = 'rgba(62,224,130,0.25)';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  const lg = ctx.createLinearGradient(0, 8, 0, h - 8);
  lg.addColorStop(0, '#a2ffbe');
  lg.addColorStop(1, '#18b981');
  ctx.strokeStyle = lg;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  const end = pts[pts.length - 1];
  ctx.beginPath(); ctx.arc(end[0], end[1], 5, 0, Math.PI * 2); ctx.fillStyle = '#35e082'; ctx.fill();
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
