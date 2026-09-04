import React, { useEffect, useState } from 'react';
import axios from 'axios';
import TerraMapView from './TerraMapView';
import { ModeGlyph } from './Icons';
import { TerraIcon } from './Icons';
import { fmtDist, fmtDuration, weekdayShort, fmtSpeed } from './geo';
import { absoluteUrl } from './terraCanvas';

export default function TerraDetail({ activityId, goHome, onEditStory }) {
  const [a, setA] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setBusy(true);
      try {
        const { data } = await axios.get(`/api/terra/activities/${activityId}`);
        if (alive) setA(data);
      } catch {
        if (alive) setNotFound(true);
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => { alive = false; };
  }, [activityId]);

  if (notFound) {
    return (
      <div className="terra-page">
        <div className="terra-empty"><b>Journey not found</b>It may have been deleted.<div style={{ marginTop: 12 }}><button className="terra-btn primary" onClick={goHome}>Back to TERRA</button></div></div>
      </div>
    );
  }
  if (!a) {
    return <div className="terra-page"><div className="terra-empty"><b>{busy ? 'Loading journey…' : 'Nothing here'}</b></div></div>;
  }

  const del = async () => {
    if (!window.confirm('Delete this journey permanently?')) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/terra/activities/${a._id}`);
      goHome();
    } catch (e) {
      window.alert(e?.response?.data?.error || 'Delete failed.');
      setDeleting(false);
    }
  };

  const cover = a.photo && a.bg === 'photo' ? absoluteUrl(a.photo) : '';

  return (
    <div className="terra-page" style={{ maxWidth: 1000 }}>
      <div className="terra-detail-head">
        <div>
          <button className="terra-btn ghost" onClick={goHome} style={{ marginBottom: 10 }}><TerraIcon name="back" size={15} /> TERRA</button>
          <h1>{a.title || 'My Journey'}</h1>
          <div className="terra-chip" style={{ marginTop: 8 }}><ModeGlyph mode={a.mode} /> {weekdayShort(a.startTime)}</div>
        </div>
        <div className="detail-actions">
          <button className="terra-btn" onClick={() => onEditStory(a._id)} disabled={deleting}><TerraIcon name="pen" size={15} /> Make a story</button>
          <button className="terra-btn danger" onClick={del} disabled={deleting}>{deleting ? '…' : <><TerraIcon name="trash" size={15} /> Delete</>}</button>
        </div>
      </div>

      <div className="terra-detail-map" style={{ marginTop: 16 }}>
        {cover && <img src={cover} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25, zIndex: 0 }} />}
        <TerraMapView points={a.route || []} fit center={[a.route?.[0]?.lng || 0, a.route?.[0]?.lat || 0]} />
      </div>

      <div className="terra-detail-grid">
        <div className="terra-stat"><div className="s-label">Distance</div><div className="s-value">{fmtDist(a.distanceKm)} <span style={{ fontSize: 15 }}>km</span></div></div>
        <div className="terra-stat"><div className="s-label">Time</div><div className="s-value">{fmtDuration(a.durationSec)}</div></div>
        <div className="terra-stat"><div className="s-label">Avg speed</div><div className="s-value">{fmtSpeed(a.avgSpeedKmh)}</div><div className="s-sub">km/h</div></div>
        <div className="terra-stat"><div className="s-label">Max speed</div><div className="s-value">{a.maxSpeedKmh > 0 ? a.maxSpeedKmh.toFixed(1) : '–'}</div><div className="s-sub">km/h</div></div>
        <div className="terra-stat"><div className="s-label">CO₂ saved</div><div className="s-value">{Number(a.co2SavedKg).toFixed(2)} <span style={{ fontSize: 15 }}>kg</span></div></div>
        <div className="terra-stat"><div className="s-label">Eco score</div><div className="s-value">{a.ecoScore}</div><div className="s-sub">/100</div></div>
        {a.hasElevation && (
          <div className="terra-stat"><div className="s-label">Elev gain</div><div className="s-value">{a.elevationGainM} <span style={{ fontSize: 15 }}>m</span></div><div className="s-sub">loss {a.elevationLossM} m</div></div>
        )}
        <div className="terra-stat"><div className="s-label">Calories</div><div className="s-value">{a.caloriesKcal || 0}</div><div className="s-sub">kcal est.</div></div>
        <div className="terra-stat"><div className="s-label">GPS points</div><div className="s-value">{(a.route || []).length}</div><div className="s-sub">recorded</div></div>
      </div>

      <div className="terra-list-notes">
        <span className="terra-chip">Map background · {a.bg}</span>
        <span className="terra-chip">Route stored from your real GPS track</span>
        {!a.hasElevation && <span className="terra-chip">Elevation unavailable for this ride (GPS altitude missing) — not shown</span>}
      </div>
    </div>
  );
}
