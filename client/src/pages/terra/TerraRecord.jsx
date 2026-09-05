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
  const [pts, setPts] = useState(0); // re-render trigger for point count

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
  }, [elapsed, distKm, pts]);

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
    setPts(arr.length);
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
    const ptsArr = DEMO.route();
    let i = 0;
    const base = Date.now();
    setGps('tracking');
    setGpsMsg('DEMO ride — simulated GPS points (QA only)');
    setSimOn(true);
    const step = () => {
      if (finishedRef.current) return;
      if (i >= ptsArr.length) { clearInterval(simTimerRef.current); simTimerRef.current = null; setGps('waiting'); setGpsMsg('Demo route finished — tap FINISH'); return; }
      const pt = ptsArr[i];
      // 1.3 s per point, slight jitter
      const j = i % 3 === 0 ? 0.00002 * Math.sin(i) : 0;
      acceptPoint({ lat: pt.lat + j, lng: pt.lng + j * 1.2, ele: pt.ele, accuracy: 6, ts: base + i * 1300 });
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
        bg: 'map', // route-map card is the default TERRA background
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

  const livePts = trackRef.current.length;
  const gpsTone = paused ? 'paused' : gps === 'tracking' ? 'tracking' : gps === 'denied' || gps === 'error' ? 'warn' : 'wait';

  return (
    <div className="terra-page terra-record-page">
      <div className="terra-record rec-stage">
        {/* the dark map fills the entire record plane */}
        <div className="rec-map-bg">
          <TerraMapView points={mapPts} follow={!paused} center={DEMO.center} zoom={14} showTheme themeTogglePos="br" />
        </div>

        {/* legibility fades */}
        <div className="rec-fade rec-fade-top" />
        <div className="rec-fade rec-fade-bottom" />

        {/* white-on-map UI */}
        <div className="rec-ui">
          <header className="rec-header">
            <div className="rec-left">
              <button className="rec-close" title="Discard recording" onClick={() => { stopWatch(); stopSim(); onCancel(); }}>
                <TerraIcon name="back" size={17} />
              </button>
              <div className="rec-meta">
                <div className="rec-mode">
                  <i style={{ width: 9, height: 9, borderRadius: '50%', background: modeMeta.color, display: 'inline-block', marginRight: 8 }} />
                  {modeMeta.label}
                  <span className={`rec-state ${paused ? 'paused' : 'live'}`}>{paused ? 'PAUSED' : 'RECORDING'}</span>
                </div>
                <div className={`rec-status ${gpsTone}`}>{gpsMsg}</div>
              </div>
            </div>
            <div className="rec-pill" data-pts={livePts}>
              <i className={`rec-dot ${paused ? 'off' : gps === 'tracking' ? 'on' : 'wait'}`} />
              <span className="rec-pts">{livePts} pts</span>
              {simOn && <span className="rec-sim-tag">SIM</span>}
            </div>
          </header>

          <div className="rec-clock-wrap">
            <div className="rec-clock record-clock">
              {paused ? <span style={{ opacity: 0.4 }}>{fmtClock(elapsed)}</span> : fmtClock(elapsed)}
            </div>
            {simOn && <div className="rec-sim-note">Demo ride is simulating GPS fixes</div>}
          </div>

          <div className="rec-bottom">
            {DEMO.enabled() && !simOn && gps !== 'tracking' && (
              <button className="rec-demo-btn" onClick={startSim}>
                <TerraIcon name="play" size={12} /> Use demo ride (no GPS)
              </button>
            )}

            <div className="record-stats">
              <div className="terra-stat rec-stat">
                <div className="s-label">Distance</div>
                <div className="s-value">{fmtDist(distKm)} <span style={{ fontSize: 15 }}>km</span></div>
              </div>
              <div className="terra-stat rec-stat">
                <div className="s-label">Avg speed</div>
                <div className="s-value">{avgKmh > 0 ? avgKmh.toFixed(1) : '–'}</div>
                <div className="s-sub">{avgKmh > 0 ? 'km/h' : '\u00A0'}</div>
              </div>
              <div className="terra-stat rec-stat">
                <div className="s-label">Now</div>
                <div className="s-value" style={{ color: modeMeta.color }}>{speedKmh > 0 ? speedKmh.toFixed(1) : '–'}</div>
                <div className="s-sub">km/h</div>
              </div>
            </div>

            <div className="record-controls">
              <button
                className={`round-btn pause ${paused ? 'resume' : ''}`}
                onClick={togglePause}
                title={paused ? 'Resume' : 'Pause'}
              >
                {paused ? <TerraIcon name="play" size={22} /> : <><span className="pause-bar" /><span style={{ fontSize: 10 }}>PAUSE</span></>}
              </button>
              <button className="round-btn finish" onClick={finish} disabled={saving} title="Finish trip">
                {saving ? 'SAVING' : <><TerraIcon name="stop" size={22} /><span style={{ fontSize: 11 }}>FINISH</span></>}
              </button>
            </div>
            <div className="rec-hint">Finish saves this journey and opens your TERRA story.</div>
            <div className="rec-map-credit">Map data © OpenStreetMap contributors</div>
          </div>
        </div>
      </div>
    </div>
  );
}
