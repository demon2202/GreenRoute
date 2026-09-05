import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { renderStory, buildMapLayer, CARD_W, CARD_H, loadImage, absoluteUrl, serverPath, ensureFonts, enabledStats } from './terraCanvas';
import { fmtDist, fmtDuration, weekdayShort } from './geo';
import { resolveMapStyle } from '../../mapTheme';
import { TerraIcon } from './Icons';

const PREV_W = 324;
const PREV_H = 576;

const STAT_CARD_DEFS = [
  { key: 'distance', label: 'Distance', format: (a) => `${fmtDist(a.distanceKm)} km` },
  { key: 'time', label: 'Time', format: (a) => fmtDuration(a.durationSec) },
  { key: 'avgSpeed', label: 'Speed', format: (a) => (Number(a.avgSpeedKmh) > 0 ? `${Number(a.avgSpeedKmh).toFixed(1)} km/h` : '—') },
  { key: 'maxSpeed', label: 'Max speed', format: (a) => (Number(a.maxSpeedKmh) > 0 ? `${Number(a.maxSpeedKmh).toFixed(1)} km/h` : '—'), only: (a) => Number(a.maxSpeedKmh) > 0 },
  { key: 'elevation', label: 'Elevation', format: (a) => (a.hasElevation ? `${Math.round(a.elevationGainM || 0)} m` : '—'), only: (a) => !!a.hasElevation },
  { key: 'eco', label: 'Eco score', format: (a) => `${a.ecoScore} · ${Number(a.co2SavedKg).toFixed(2)} kg CO₂` },
];

// Solid-colour backgrounds were removed from TERRA entirely (user directive) —
// a card is only ever a real map or a photo. Legacy 'black'/'color' values on
// older saved journeys read as the plain map card, so no solid colour can show.
function normBg(bg) {
  return bg === 'photo' ? 'photo' : 'map';
}

export default function TerraStory({ activityId, onDone, onOpenDetail, goHome }) {
  const [activity, setActivity] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [bg, setBg] = useState('map');
  const [mapStyle, setMapStyle] = useState('dark');
  const [stats, setStats] = useState(null); // ordered enabled keys
  const [photoUrl, setPhotoUrl] = useState(''); // persisted server path
  const [photoImg, setPhotoImg] = useState(null);
  const [mapLayer, setMapLayer] = useState(null); // full-card map (bg 'map')
  const [bandLayer, setBandLayer] = useState(null); // rounded band map
  const [mapBusy, setMapBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState('');
  const [mapFail, setMapFail] = useState(false);

  const prevRef = useRef(null);
  const fileRef = useRef(null);
  const cacheRef = useRef(new Map()); // layer key -> canvas
  const buildSeq = useRef(0);

  const toast = (msg, warn) => { setStatus(msg); setTimeout(() => setStatus(''), warn ? 6000 : 2600); };

  // load activity
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await axios.get(`/api/terra/activities/${activityId}`);
        if (!alive) return;
        setActivity(data);
        setTitle(data.title || '');
        setCaption(data.caption || '');
        // Solid-colour cards were removed from TERRA: legacy 'black'/'color'
        // saved backgrounds open as the plain map card. Only Map or Photo remain.
        setBg(normBg(data.bg));
        // Card map colours are the USER preference (default black for TERRA);
        // a legacy 'light' value is never rendered white → normal colours.
        const ms = data.mapStyle === 'dark' || data.mapStyle === 'normal' ? data.mapStyle : resolveMapStyle('terra');
        setMapStyle(ms);
        setStats(enabledStats(data));
        setPhotoUrl(serverPath(data.photo));
        cacheRef.current.clear();
        setMapLayer(null);
        setBandLayer(null);
        setMapFail(false);
      } catch {
        if (alive) setNotFound(true);
      }
    })();
    return () => { alive = false; };
  }, [activityId]);

  const pinsFor = useCallback((st) => ({
    enableMax: Array.isArray(st) && st.includes('maxSpeed'),
    enableElev: Array.isArray(st) && st.includes('elevation'),
  }), []);

  // Build whichever map layer the current background needs (full card for the
  // 'map' bg, rounded band for 'photo'). Keyed cache; guaranteed to clear its
  // busy state on success, failure or an absolute timeout.
  useEffect(() => {
    if (!activity) return;
    const st = stats || enabledStats(activity);
    const pinBits = (st.includes('maxSpeed') ? 'm' : '') + (st.includes('elevation') ? 'e' : '');
    const need = bg === 'map' ? 'full' : 'band';
    const key = `${activity._id}:${mapStyle}:${need}:${pinBits}`;
    if (cacheRef.current.has(key)) {
      if (need === 'full') setMapLayer(cacheRef.current.get(key));
      else setBandLayer(cacheRef.current.get(key));
      return;
    }
    const seq = ++buildSeq.current;
    const pins = { maxSpeedKmh: activity.maxSpeedKmh, hasElevation: activity.hasElevation, ...pinsFor(st) };
    setMapFail(false);
    setMapBusy(true);
    const t = setTimeout(() => { if (buildSeq.current === seq) setMapBusy(false); }, 30000);
    buildMapLayer(activity.route || [], { style: mapStyle, kind: need, pins })
      .then((cnv) => {
        if (buildSeq.current !== seq) return;
        cacheRef.current.set(key, cnv);
        if (need === 'full') {
          setMapLayer(cnv);
          // tileCount 0 ⇒ no tile server answered — tell the user why it's blank
          setMapFail(Number(cnv.tileCount || 0) === 0);
        } else {
          setBandLayer(cnv);
        }
      })
      .catch(() => { if (buildSeq.current === seq) setMapFail(true); })
      .finally(() => {
        clearTimeout(t);
        if (buildSeq.current === seq) setMapBusy(false);
      });
    return () => { if (buildSeq.current === seq) setMapBusy(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, bg, mapStyle, stats]);

  // load photo image whenever we should display one
  useEffect(() => {
    if (!activity || bg !== 'photo') return;
    const src = photoUrl || activity.photo;
    if (!src) { setPhotoImg(null); return; }
    let alive = true;
    loadImage(absoluteUrl(src))
      .then((img) => { if (alive) setPhotoImg(img); })
      .catch(() => { if (alive) setPhotoImg(null); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoUrl, bg, activity]);

  // re-render preview
  useEffect(() => {
    if (!prevRef.current || !activity) return;
    const id = requestAnimationFrame(() => {
      renderStory(prevRef.current, activity, {
        bg, mapStyle, title, caption, stats: stats || undefined,
        mapLayer, bandLayer, img: photoImg,
      }).catch(() => {});
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, title, caption, bg, mapStyle, mapLayer, bandLayer, photoImg, stats]);

  const ensureLayer = useCallback(async (kinds) => {
    if (!activity) return null;
    const st = stats || enabledStats(activity);
    const pinBits = (st.includes('maxSpeed') ? 'm' : '') + (st.includes('elevation') ? 'e' : '');
    const out = {};
    for (const kind of kinds) {
      const key = `${activity._id}:${mapStyle}:${kind}:${pinBits}`;
      let cnv = cacheRef.current.get(key);
      if (!cnv) {
        const pins = { maxSpeedKmh: activity.maxSpeedKmh, hasElevation: activity.hasElevation, ...pinsFor(st) };
        cnv = await buildMapLayer(activity.route || [], { style: mapStyle, kind, pins });
        cacheRef.current.set(key, cnv);
      }
      out[kind] = cnv;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, mapStyle, stats]);

  const pickPhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast('Please choose an image file.', true); return; }
    setBg('photo');
    setPhotoBusy(true);
    const localUrl = URL.createObjectURL(file);
    loadImage(localUrl)
      .then((img) => { setPhotoImg(img); return img; })
      .catch(() => { setPhotoImg(null); toast('Could not read that image.', true); });
    const fd = new FormData();
    fd.append('photo', file);
    axios.post('/api/terra/media', fd, { timeout: 45000 })
      .then(({ data }) => {
        setPhotoUrl(serverPath(data.url));
        toast('Photo added — used as the story background.');
      })
      .catch(() => toast('Photo upload failed — image shows locally but may not persist.', true))
      .finally(() => setPhotoBusy(false));
  };

  const saveStory = async () => {
    setSaving(true);
    try {
      const body = {
        title, caption,
        bg, // 'map' or 'photo' — solid colour was removed from TERRA
        mapStyle,
        cardStats: stats || enabledStats(activity),
        photo: bg === 'photo' ? photoUrl : '',
      };
      await axios.patch(`/api/terra/activities/${activityId}`, body);
      toast('Saved to your journeys ✓');
    } catch (e) {
      toast(e?.response?.data?.error || 'Save failed.', true);
    } finally {
      setSaving(false);
    }
  };

  const doExport = useCallback(async () => {
    await ensureFonts();
    let readyBg = bg;
    let img = photoImg;
    if (readyBg === 'photo' && !img && photoUrl) {
      try { img = await loadImage(absoluteUrl(photoUrl)); } catch { img = null; }
    }
    if (readyBg === 'photo' && !img) readyBg = 'map'; // photo unavailable → plain map card
    const layers = await ensureLayer(readyBg === 'map' ? ['full'] : ['band']);
    const canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    await renderStory(canvas, activity, {
      bg: readyBg,
      mapStyle,
      title,
      caption,
      stats: stats || undefined,
      mapLayer: (readyBg === 'map' && layers) ? layers.full : null,
      bandLayer: (readyBg === 'photo' && layers) ? layers.band : null,
      img: readyBg === 'photo' ? img : null,
    });
    return canvas;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, bg, title, caption, photoUrl, photoImg, mapStyle, stats]);

  const downloadPNG = async () => {
    if (exporting || !activity) return;
    setExporting(true);
    try {
      const canvas = await doExport();
      const blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('export_failed'))), 'image/png'));
      const slug = (title || 'terra').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'journey';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `terra-${slug}.png`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      toast('PNG downloaded (1080×1920) ✓');
    } catch (e) {
      console.error(e);
      toast('Image export failed.', true);
    } finally {
      setExporting(false);
    }
  };

  const sharePNG = async () => {
    if (!activity) return;
    if (!navigator.share) { await downloadPNG(); return; }
    setExporting(true);
    try {
      const canvas = await doExport();
      const blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('export_failed'))), 'image/png'));
      const file = new File([blob], `terra-${Date.now()}.png`, { type: 'image/png' });
      const shareData = { files: [file], title: 'TERRA journey', text: `${title || 'My journey'} — ${fmtDist(activity.distanceKm)} km on GreenRoute TERRA` };
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(shareData);
        toast('Shared ✓');
      } else {
        await downloadPNG();
      }
    } catch (e) {
      if (e && e.name !== 'AbortError') { console.error(e); toast('Share failed — image saved instead.', true); await downloadPNG(); }
    } finally {
      setExporting(false);
    }
  };

  const toggleStat = (key) => {
    setStats((prev) => {
      const cur = prev || enabledStats(activity);
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
      return enabledStats({ cardStats: next }); // keep canonical order
    });
  };

  if (notFound) {
    return <div className="terra-page"><div className="terra-empty"><b>Journey not found</b>It may have been deleted.<div style={{ marginTop: 12 }}><button className="terra-btn primary" onClick={goHome}>Back to TERRA</button></div></div></div>;
  }
  if (!activity) {
    return <div className="terra-page"><div className="terra-empty"><b>Loading journey…</b></div></div>;
  }

  const st = stats || enabledStats(activity);
  const bgTitle = bg === 'map' ? (mapStyle === 'dark' ? 'Map · black' : 'Map · standard colours') : 'Your photo';

  return (
    <div className="terra-page">
      <div className="record-top" style={{ marginBottom: 14 }}>
        <div>
          <div className="terra-hero-kicker"><TerraIcon name="leaf" size={13} /> TERRA STORY</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>Make it yours</div>
          <div className="record-note" style={{ textAlign: 'left' }}>{weekdayShort(activity.startTime)} · {fmtDist(activity.distanceKm)} km · {fmtDuration(activity.durationSec)}</div>
        </div>
        <button className="terra-btn ghost" onClick={goHome}><TerraIcon name="back" size={16} /> Back</button>
      </div>

      <div className="terra-story-wrap">
        <div className="story-preview-box">
          <div className="story-preview-label"><span className="dot" /> Live preview · 9:16</div>
          <div className="story-frame">
            <canvas ref={prevRef} width={PREV_W} height={PREV_H} />
            {(mapBusy || photoBusy) && (
              <div className="story-loading">
                <span className="spin" />{mapBusy ? 'Loading map…' : 'Loading photo…'}
              </div>
            )}
            {!mapBusy && !photoBusy && mapFail && bg === 'map' && (
              <div className="story-loading warn"><span>Map tiles could not load from this device/network — your route is still drawn on the card. Check the API console for “[terra tile]” lines to see the exact reason.</span></div>
            )}
          </div>
          <div className="story-preview-note">This is exactly what you download and save — everything below updates it instantly.</div>
        </div>

        <div className="story-panel">
          <h3>Background — {bgTitle}</h3>

          <div className="bg-options">
            <button className={`bg-option ${bg === 'map' ? 'active' : ''}`} onClick={() => setBg('map')}>
              <span className="swatch map"><span className="swatch-line" /></span><span>Map</span>
            </button>
            <button className={`bg-option ${bg === 'photo' ? 'active' : ''}`} onClick={() => fileRef.current?.click()}>
              <span className="swatch photo">{photoImg ? <img src={photoImg.src} alt="" /> : <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff' }}><TerraIcon name="camera" size={22} /></span>}</span>
              <span>Photo</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="terra-hidden" onChange={pickPhoto} />
          </div>

          {bg === 'map' && (
            <>
              <div className="map-style-row">
                <span className="map-style-label">Map colours</span>
                <div className="map-style-seg">
                  <button className={mapStyle === 'dark' ? 'active' : ''} onClick={() => setMapStyle('dark')} title="Black map"><span className="dot dark" /> Black</button>
                  <button className={mapStyle === 'normal' ? 'active' : ''} onClick={() => setMapStyle('normal')} title="Standard colour map (never white)"><span className="dot normal" /> Standard</button>
                </div>
              </div>
              {!mapBusy && <div className="terra-chip"><TerraIcon name="map" size={12} /> Your real route, start A → finish B, drawn over the map you rode</div>}
            </>
          )}

          {bg === 'photo' && <div className="terra-chip">Tap the Photo tile again to pick a different picture</div>}

          <hr className="story-divider" />
          <div className="story-field">
            <label>Title</label>
            <input type="text" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Evening Ride" />
          </div>

          <div className="story-field">
            <label>Your words (shown on the card)</label>
            <textarea value={caption} maxLength={180} onChange={(e) => setCaption(e.target.value)} placeholder="Write something about this journey…" />
            <div className="char-count">{caption.length}/180</div>
          </div>

          <hr className="story-divider" />
          <div className="story-field">
            <label>Stats on the card — tap to show/hide</label>
            <p className="story-field-hint">Distance, Time &amp; Speed are on by default. Switch on Max speed or Elevation to also pin the exact spot onto the route map.</p>
            <div className="terra-stat-grid">
              {STAT_CARD_DEFS.filter((d) => !d.only || d.only(activity)).map((d) => {
                const on = st.includes(d.key);
                return (
                  <button key={d.key} type="button" className={`stat-toggle ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggleStat(d.key)}>
                    <span className="stat-toggle-name">{d.label}</span>
                    <span className="stat-toggle-val">{d.format(activity)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="story-divider" />
          <div className="story-actions">
            <button className="terra-btn" onClick={saveStory} disabled={saving}>{saving ? 'Saving…' : <><TerraIcon name="leaf" size={15} /> Save to journeys</>}</button>
            <button className="terra-btn primary" onClick={downloadPNG} disabled={exporting}>
              {exporting ? 'Rendering…' : <><TerraIcon name="download" size={15} /> Download PNG</>}
            </button>
            <button className="terra-btn" onClick={sharePNG} disabled={exporting}><TerraIcon name="share" size={15} /> Share</button>
            <button className="terra-btn ghost" onClick={() => onOpenDetail(activityId)}><TerraIcon name="eye" size={15} /> Open full journey</button>
          </div>
          <div className="record-note" style={{ textAlign: 'left' }}>PNG is exported at exactly 1080 × 1920 (9:16) and matches the preview above.</div>
        </div>
      </div>

      {status && <div className="terra-toast">{status}</div>}
    </div>
  );
}
