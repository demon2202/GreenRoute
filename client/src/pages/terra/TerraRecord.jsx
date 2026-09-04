import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import TerraMapView from './TerraMapView';
import { MODE_META, haversineKm, fmtClock, fmtDist, defaultTitle } from './geo';
import { DEMO } from './constants';
import { TerraIcon } from './Icons';

const TOP_SPEED = { cycling: 75, running: 30, walking: 18, driving: 240 };
const MIN_MOVE_KM = 0.004;
const MAX_ACC = 140; // metres — ignore obviously bad fixes
const WATCH_OPTS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

export default function TerraRecord({ initialMode, onSaved, onCancel }) {
  const [mode] = useState(initialMode || 'cycling');
  const [paused, setPaused] = useState(false);
  const [gps, setGps] = useState('starting'); // starting|tracking|waiting|denied|error|off
  const [gpsMsg, setGpsMsg] = useState('Waiting for GPS…');
  const [elapsed, setElapsed] = useState(0);
  const [distKm, setDistKm] = useState(0);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [avgKmh, setAvgKmh] = useState(0);
  const [saving, setSaving] = useState(false);
  const [simOn, setSimOn] = useState(DEMO.enabled());

  const trackRef = useRef([]);
  const watchRef = useRef(null);
  const simTimerRef = useRef(null);
  const tickRef = useRef(null);
  const startAtRef = useRef(null);
  const lastRef = useRef(null); // last accepted raw point
  const distRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const pausedAtRef = useRef(null);
  const speedRef = useRef(0);
  const finishedRef = useRef(false);

  const modeMeta = MODE_META[mode];
  // Refresh the on-map track (down-sampled) as recording progresses.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mapPts = useMemo(() => {
    const t = trackRef.current;
    if (t.length < 250) return t.slice();
    const step = Math.ceil(t.length / 500);
    return t.filter((_, i) => i % step === 0 || i === t.length - 1);
  }, [elapsed, distKm]);

  const stopWatch = useCallback(() => {
    if (watchRef.current !== null && watchRef.current !== undefined) {
      try { navigator.geolocation.clearWatch(watchRef.current); } catch { /* noop */ }
      watchRef.current = null;
    }
  }, []);

  const stopSim = useCallback(() => {
    if (simTimerRef.current) { clearInterval(simTimerRef.current); simTimerRef.current = null; }
  }, []);

  const acceptPoint = useCallback((p) => {
    const lat = Number(p.lat), lng = Number(p.lng);
    const ts = Number(p.ts) || Date.now();
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
    if (p.accuracy != null && Number(p.accuracy) > MAX_ACC) return;
    const ele = Number.isFinite(Number(p.ele)) ? Number(p.ele) : null;
    const now = ts;

    if (!startAtRef.current) {
      startAtRef.current = now;
      setGps('tracking');
      setGpsMsg('Recording — move to draw your route');
    }

    const last = lastRef.current;
    if (last) {
      const dtSec = Math.max(0, (now - (last.ts || now)) / 1000);
      const seg = haversineKm(last.lat, last.lng, lat, lng);
      const dtHours = dtSec / 3600;
      const plausible = dtHours * (TOP_SPEED[mode] || 75) + 0.25;
      if (seg > plausible && dtSec > 0) return; // teleport spike — ignore fix
      if (seg >= MIN_MOVE_KM) {
        distRef.current += seg;
        // live speed estimate (fallback when hardware speed missing)
        const instant = (seg / dtSec) * 3600;
        if (dtSec >= 0.6 && instant <= (TOP_SPEED[mode] || 75) && instant > 0) {
          speedRef.current = instant;
        }
      }
    }
    if (p.speed != null && Number.isFinite(Number(p.speed))) {
      const s = Number(p.speed) * 3.6; // m/s -> km/h
      if (s <= (TOP_SPEED[mode] || 75)) speedRef.current = s;
    }
    lastRef.current = { lat, lng, ts, ele };
    const arr = trackRef.current;
    const lastPt = arr[arr.length - 1];
    if (!lastPt || lastPt.lat !== lat || lastPt.lng !== lng) arr.push({ lat, lng, ele, ts });

    setSpeedKmh(Math.round(speedRef.current * 10) / 10);
    setDistKm(Math.round(distRef.current * 1000) / 1000);
  }, [mode]);

  const onPos = useCallback((pos) => {
    setGps('tracking');
    setGpsMsg('Recording — move to draw your route');
    acceptPoint({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      ele: pos.coords.altitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed,
      ts: pos.timestamp || Date.now(),
    });
  }, [acceptPoint]);

  const onErr = useCallback((err) => {
    if (err && err.code === 1) { setGps('denied'); setGpsMsg('Location permission denied. Enable GPS in your browser to record.'); }
    else if (err && err.code === 2) { setGps('error'); setGpsMsg('GPS unavailable on this device.'); }
    else { setGps('waiting'); setGpsMsg('Waiting for a GPS fix…'); }
  }, []);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) { setGps('error'); setGpsMsg('Geolocation is not supported by this browser.'); return; }
    setGps('starting');
    setGpsMsg('Waiting for GPS…');
    stopSim();
    watchRef.current = navigator.geolocation.watchPosition(onPos, onErr, WATCH_OPTS);
  }, [onPos, onErr, stopSim]);

  // start recording on mount
  useEffect(() => {
    startWatch();
    return () => {
      finishedRef.current = true;
      stopWatch();
      stopSim();
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // demo sim (only when enabled via ?sim=1 / localStorage)
  const startSim = useCallback(() => {
    stopWatch();
    const pts = DEMO.route();
    let i = 0;
    const base = Date.now();
    setGps('tracking');
    setGpsMsg('DEMO ride — simulated GPS points (QA only)');
    setSimOn(true);
    const step = () => {
      if (finishedRef.current) return;
      if (i >= pts.length) { clearInterval(simTimerRef.current); simTimerRef.current = null; setGps('waiting'); setGpsMsg('Demo route finished — tap FINISH'); return; }
      const p = pts[i];
      // 1.3 s per point, slight jitter
      const j = i % 3 === 0 ? 0.00002 * Math.sin(i) : 0;
      acceptPoint({ lat: p.lat + j, lng: p.lng + j * 1.2, ele: p.ele, accuracy: 6, ts: base + i * 1300 });
      i += 1;
    };
    simTimerRef.current = setInterval(step, 1300);
    step();
  }, [acceptPoint, stopWatch]);

  // UI clock + avg tick
  useEffect(() => {
    tickRef.current = setInterval(() => {
      if (!startAtRef.current) return;
      const now = Date.now();
      const totalPaused = pausedTotalRef.current + (pausedAtRef.current ? now - pausedAtRef.current : 0);
      const eMs = now - startAtRef.current - totalPaused;
      setElapsed(eMs);
      const hours = eMs / 3600000;
      const cap = TOP_SPEED[mode] || 75;
      setAvgKmh(hours > 0 ? Math.min(Math.round((distRef.current / hours) * 10) / 10, cap) : 0);
    }, 500);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [paused]);

  const togglePause = () => {
    if (paused) {
      // resume
      pausedTotalRef.current += Date.now() - (pausedAtRef.current || Date.now());
      pausedAtRef.current = null;
      setPaused(false);
      if (simOn) startSim(); else startWatch();
    } else {
      stopWatch(); stopSim();
      pausedAtRef.current = Date.now();
      setPaused(true);
      setGpsMsg('Paused — route & timer are frozen');
    }
  };

  const finish = async () => {
    if (saving) return;
    const track = trackRef.current;
    if (track.length < 2) {
      setGpsMsg('Move a little first — at least two GPS points are needed.');
      return;
    }
    setSaving(true);
    try {
      stopWatch(); stopSim();
      if (tickRef.current) clearInterval(tickRef.current);
      const totalPaused = pausedTotalRef.current + (pausedAtRef.current ? Date.now() - pausedAtRef.current : 0);
      const first = track[0];
      const last = track[track.length - 1];
      const started = startAtRef.current || first.ts;
      const officialDurMs = Math.max(1000, (last.ts - started) - totalPaused);
      const startISO = new Date(started).toISOString();
      const endISO = new Date(started + officialDurMs).toISOString();
      const payload = {
        mode,
        title: defaultTitle(mode, new Date(started)),
        caption: '',
        bg: 'black',
        startTime: startISO,
        endTime: endISO,
        route: track.map((p) => ({ lat: Number(p.lat.toFixed(7)), lng: Number(p.lng.toFixed(7)), ele: p.ele, ts: p.ts })),
      };
      const { data } = await axios.post('/api/terra/activities', payload);
      finishedRef.current = true;
      onSaved(data);
    } catch (e) {
      console.error(e);
      setSaving(false);
      setGpsMsg(e?.response?.data?.error || 'Could not save the activity. Try again.');
    }
  };

  return (
    <div className="terra-page" style={{ maxWidth: 1100 }}>
      <div className="terra-record">
        <div className="record-top">
          <div>
            <div className="record-title"><span style={{ color: modeMeta.color }}>●</span> {modeMeta.label} — Recording</div>
            <div className="record-note" style={{ textAlign: 'left', marginTop: 3, color: gps === 'tracking' ? 'var(--terra-green-2)' : gps === 'denied' || gps === 'error' ? 'var(--terra-amber)' : 'var(--terra-muted)' }}>{gpsMsg}</div>
          </div>
          <button className="record-close" title="Discard recording" onClick={() => { stopWatch(); stopSim(); onCancel(); }}>✕</button>
        </div>

        <div className="record-clock" style={{ fontSize: 'clamp(44px, 12vw, 96px)', textAlign: 'center', lineHeight: 1, letterSpacing: '.02em' }}>
          {paused ? <span style={{ opacity: .35 }}>{fmtClock(elapsed)}</span> : fmtClock(elapsed)}
        </div>

        <div className="record-stats">
          <div className="terra-stat"><div className="s-label">Distance</div><div className="s-value">{fmtDist(distKm)} <span style={{ fontSize: 16 }}>km</span></div></div>
          <div className="terra-stat"><div className="s-label">Avg speed</div><div className="s-value">{avgKmh > 0 ? avgKmh.toFixed(1) : '–'}</div><div className="s-sub">{avgKmh > 0 ? 'km/h' : '&nbsp;'}</div></div>
          <div className="terra-stat"><div className="s-label">Now</div><div className="s-value" style={{ color: modeMeta.color }}>{speedKmh > 0 ? speedKmh.toFixed(1) : '–'}</div><div className="s-sub">km/h</div></div>
        </div>

        <div className="record-map">
          <TerraMapView points={mapPts} follow={!paused} center={DEMO.center} zoom={14} />
          <span className="map-float top-left"><i style={{ width: 9, height: 9, borderRadius: '50%', background: '#3ee082', display: paused ? 'none' : 'inline-block' }} /> {paused ? 'Paused' : 'REC'} · {trackRef.current.length} pts</span>
          <span className="map-float top-right">{modeMeta.label}</span>
        </div>

        {DEMO.enabled() && !simOn && gps !== 'tracking' && (
          <button className="terra-btn" style={{ alignSelf: 'center' }} onClick={startSim}>
            <TerraIcon name="play" size={14} /> Use demo ride (no GPS)
          </button>
        )}
        {simOn && (
          <div className="terra-chip" style={{ alignSelf: 'center' }}>Demo ride is simulating GPS fixes</div>
        )}

        <div className="record-controls" style={{ marginTop: 10 }}>
          <button className={`round-btn pause ${paused ? 'resume' : ''}`} onClick={togglePause} title={paused ? 'Resume' : 'Pause'}>
            {paused ? <TerraIcon name="play" size={22} /> : <><span style={{ width: 16, height: 16, background: '#fff', borderRadius: 3 }} /><span style={{ fontSize: 10 }}>PAUSE</span></>}
          </button>
          <button className="round-btn finish" onClick={finish} disabled={saving} title="Finish trip">
            {saving ? 'SAVING' : <><TerraIcon name="stop" size={22} /><span style={{ fontSize: 11 }}>FINISH</span></>}
          </button>
        </div>
        <div className="record-note" style={{ textAlign: 'center', marginTop: 8 }}>
          Finish saves this journey and opens your TERRA story.
        </div>
      </div>
    </div>
  );
}
