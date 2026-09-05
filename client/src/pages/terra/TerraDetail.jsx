import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import TerraMapView from './TerraMapView';
import { ModeGlyph, TerraIcon } from './Icons';
import { fmtDist, fmtDuration, weekdayShort, fmtSpeed } from './geo';
import { resolveMapStyle, setMapStyle } from '../../mapTheme';

/**
 * TERRA journey detail — immersive: the user's real route map fills the whole
 * screen (map colours follow the user's preference) and the journey text is
 * laid over the map, exactly like the full-bleed recorder.
 */
export default function TerraDetail({ activityId, goHome, onEditStory }) {
  const [a, setA] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(true);
  const [mapColour, setMapColour] = useState(() => resolveMapStyle('terra'));
  const mapApi = useRef(null);

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

  const applyMapColour = async (v) => {
    setMapColour(v);
    setMapStyle(v); // persist preference (local + account)
    if (mapApi.current && mapApi.current.applyTheme) mapApi.current.applyTheme(v);
  };

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

  const stats = [
    { label: 'Distance', value: fmtDist(a.distanceKm), unit: 'km' },
    { label: 'Time', value: fmtDuration(a.durationSec), unit: '' },
    { label: 'Speed', value: fmtSpeed(a.avgSpeedKmh), unit: 'km/h' },
    { label: 'CO₂ saved', value: Number(a.co2SavedKg).toFixed(2), unit: 'kg' },
  ];
  if (a.hasElevation) stats.push({ label: 'Elev gain', value: `${Math.round(a.elevationGainM || 0)}`, unit: 'm' });
  stats.push({ label: 'Eco', value: `${a.ecoScore}`, unit: '/100' });

  return (
    <div className="terra-page terra-detail-immersive">
      <TerraMapView
        points={a.route || []}
        fit
        center={[a.route?.[0]?.lng || 0, a.route?.[0]?.lat || 0]}
        onReady={(h) => { mapApi.current = h; }}
      />

      {/* top-left heading — back button + title */}
      <div className="td-top">
        <div className="td-heading">
          <button className="td-pill" onClick={goHome}><TerraIcon name="back" size={15} /> TERRA</button>
          <h1>{a.title || 'My Journey'}</h1>
          <div className="td-sub">
            <ModeGlyph mode={a.mode} /> {weekdayShort(a.startTime)} · real GPS track
          </div>
        </div>
        <div className="td-actions">
          <div className="map-theme-toggle static" role="group" aria-label="Map colours">
            <button className={mapColour === 'normal' ? 'active' : ''} onClick={() => applyMapColour('normal')} title="Standard map colours">
              <span className="mt-dot normal" />Colour
            </button>
            <button className={mapColour === 'dark' ? 'active' : ''} onClick={() => applyMapColour('dark')} title="Black map">
              <span className="mt-dot dark" />Black
            </button>
          </div>
          <button className="td-pill danger" onClick={del} disabled={deleting}>{deleting ? '…' : <><TerraIcon name="trash" size={14} /> Delete</>}</button>
        </div>
      </div>

      {/* bottom overlay: action buttons → divider → stat tiles */}
      <div className="td-bottom">
        {/* action row — centered above the stats */}
        <div className="td-bottom-actions">
          <button className="td-action-btn edit" onClick={() => onEditStory(a._id)} disabled={deleting}>
            <TerraIcon name="pen" size={14} /> Edit story
          </button>
        </div>

        {/* thin divider */}
        <div className="td-bottom-divider" />

        {/* stat tiles */}
        <div className="td-stats-row">
          {stats.map((s) => (
            <div className="td-stat" key={s.label}>
              <span className="td-stat-label">{s.label}</span>
              <span className="td-stat-value">{s.value}{s.unit ? <small> {s.unit}</small> : null}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
