import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { renderStory, buildMapLayer, CARD_W, CARD_H, loadImage, absoluteUrl, ensureFonts } from './terraCanvas';
import { fmtDist, fmtDuration, weekdayShort } from './geo';
import { TerraIcon } from './Icons';

const PREV_W = 324;
const PREV_H = 576;

function speedLabel(a) {
  const v = Number(a.avgSpeedKmh) || 0;
  return v > 0 ? `${v.toFixed(1)} km/h` : '—';
}

export default function TerraStory({ activityId, onDone, onOpenDetail, goHome }) {
  const [activity, setActivity] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [bg, setBg] = useState('black');
  const [photoUrl, setPhotoUrl] = useState(''); // persisted server url
  const [photoImg, setPhotoImg] = useState(null); // html image element ready for canvas
  const [photoBusy, setPhotoBusy] = useState(false);
  const [mapLayer, setMapLayer] = useState(null);
  const [mapBusy, setMapBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState('');

  const prevRef = useRef(null);
  const fileRef = useRef(null);
  const mapCacheRef = useRef(null); // keyed by activity id

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
        setBg(data.bg || 'black');
        setPhotoUrl(data.photo || '');
        mapCacheRef.current = null;
        setMapLayer(null);
      } catch (e) {
        if (alive) setNotFound(true);
      }
    })();
    return () => { alive = false; };
  }, [activityId]);

  // Build the route-map layer for the card. It powers the full "map"
  // background AND the Strava-style rounded route-map box on the black and
  // photo backgrounds, so we try to have it ready as soon as the activity
  // loads (rebuilt only if the user picks the map bg after a failed load).
  useEffect(() => {
    if (!activity || (activity.route || []).length < 2) return;
    if (mapCacheRef.current === activity._id && mapLayer) return;
    let alive = true;
    if (bg === 'map') setMapBusy(true);
    buildMapLayer(activity.route || [])
      .then((cnv) => {
        if (!alive) return;
        mapCacheRef.current = activity._id;
        setMapLayer(cnv);
      })
      .catch(() => {
        if (alive && bg === 'map') toast('Map tiles could not load — the route is still shown.', true);
      })
      .finally(() => { if (alive && bg === 'map') setMapBusy(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, bg]);

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
      renderStory(prevRef.current, activity, { bg, title, caption, mapLayer, img: photoImg }).catch(() => {});
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, title, caption, bg, mapLayer, photoImg]);

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
        setPhotoUrl(absoluteUrl(data.url));
        toast('Photo added — it is used as the story background.');
      })
      .catch(() => toast('Photo upload failed — image shows locally but may not persist.', true))
      .finally(() => setPhotoBusy(false));
  };

  const saveStory = async () => {
    setSaving(true);
    try {
      await axios.patch(`/api/terra/activities/${activityId}`, { title, caption, bg, photo: photoUrl });
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
    // Route-map tiles are needed for the full map bg and the rounded route
    // box on black/photo. Build once if not already cached.
    let layer = mapLayer;
    if (!layer && activity && (activity.route || []).length >= 2) {
      toast('Building route map…');
      try {
        layer = await buildMapLayer(activity.route || []);
        mapCacheRef.current = activity._id;
      } catch { layer = null; }
    }
    const canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    let img = photoImg;
    if (readyBg === 'photo' && !img && photoUrl) {
      try { img = await loadImage(absoluteUrl(photoUrl)); } catch { img = null; }
    }
    const usedBg = readyBg === 'photo' && !img ? 'black' : readyBg;
    await renderStory(canvas, activity, { bg: usedBg, title, caption, mapLayer: layer, img: usedBg === 'photo' ? img : null });
    return canvas;
  }, [activity, bg, title, caption, photoUrl, photoImg, mapLayer]);

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

  if (notFound) {
    return <div className="terra-page"><div className="terra-empty"><b>Journey not found</b>It may have been deleted.<div style={{ marginTop: 12 }}><button className="terra-btn primary" onClick={goHome}>Back to TERRA</button></div></div></div>;
  }
  if (!activity) {
    return <div className="terra-page"><div className="terra-empty"><b>Loading journey…</b></div></div>;
  }

  const bgTitle = bg === 'map' ? 'Map · your real route' : bg === 'photo' ? 'Your photo' : 'Minimal black';

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
        {/* LEFT: preview */}
        <div className="story-preview-box">
          <div className="story-frame">
            <canvas ref={prevRef} width={PREV_W} height={PREV_H} />
            {(mapBusy || photoBusy) && <div className="story-loading">Updating background…</div>}
          </div>
        </div>

        {/* RIGHT: controls */}
        <div className="story-panel">
          <h3>Background — {bgTitle}</h3>
          <div className="bg-options">
            <button className={`bg-option ${bg === 'black' ? 'active' : ''}`} onClick={() => setBg('black')}>
              <span className="swatch black" /><span>Black</span>
            </button>
            <button className={`bg-option ${bg === 'map' ? 'active' : ''}`} onClick={() => setBg('map')}>
              <span className="swatch map" /><span>Map</span>
            </button>
            <button className={`bg-option ${bg === 'photo' ? 'active' : ''}`} onClick={() => fileRef.current?.click()}>
              <span className="swatch photo">{photoImg ? <img src={photoImg.src} alt="" /> : <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff' }}><TerraIcon name="camera" size={22} /></span>}</span>
              <span>Photo</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="terra-hidden" onChange={pickPhoto} />
          </div>
          {bg === 'map' && !mapBusy && <div className="terra-chip"><TerraIcon name="map" size={12} /> Route drawn from your {activity.route?.length || 0} recorded GPS points</div>}
          {bg === 'photo' && <div className="terra-chip">Tap the Photo tile again or any card to replace</div>}

          <div className="story-field">
            <label>Title</label>
            <input type="text" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Evening Ride" />
          </div>

          <div className="story-field">
            <label>Your words (shown on the card)</label>
            <textarea value={caption} maxLength={180} onChange={(e) => setCaption(e.target.value)} placeholder="Write something about this journey…" />
            <div className="char-count">{caption.length}/180</div>
          </div>

          <div className="story-field">
            <label>Real stats on the card (auto)</label>
            <div className="terra-story-stats">
              <div className="terra-stat"><div className="s-label">Distance</div><div className="s-value">{fmtDist(activity.distanceKm)} km</div></div>
              <div className="terra-stat"><div className="s-label">Time</div><div className="s-value">{fmtDuration(activity.durationSec)}</div></div>
              <div className="terra-stat"><div className="s-label">Speed</div><div className="s-value">{speedLabel(activity)}</div></div>
              <div className="terra-stat"><div className="s-label">Avg speed</div><div className="s-value">{Number(activity.avgSpeedKmh).toFixed(1)}</div><div className="s-sub">km/h</div></div>
              <div className="terra-stat"><div className="s-label">Max</div><div className="s-value">{Number(activity.maxSpeedKmh) > 0 ? Number(activity.maxSpeedKmh).toFixed(1) : '–'}</div><div className="s-sub">km/h</div></div>
              {activity.hasElevation && <div className="terra-stat"><div className="s-label">Elev gain</div><div className="s-value">{activity.elevationGainM} m</div></div>}
              <div className="terra-stat"><div className="s-label">Eco score</div><div className="s-value">{activity.ecoScore}</div><div className="s-sub">{Number(activity.co2SavedKg).toFixed(2)} kg CO₂</div></div>
            </div>
          </div>

          <div className="story-actions">
            <button className="terra-btn" onClick={saveStory} disabled={saving}>{saving ? 'Saving…' : <><TerraIcon name="leaf" size={15} /> Save to journeys</>}</button>
            <button className="terra-btn primary" onClick={downloadPNG} disabled={exporting}>
              {exporting ? 'Rendering…' : <><TerraIcon name="download" size={15} /> Download PNG</>}
            </button>
            <button className="terra-btn" onClick={sharePNG} disabled={exporting}><TerraIcon name="share" size={15} /> Share</button>
            <button className="terra-btn ghost" onClick={() => onOpenDetail(activityId)}>Open full journey</button>
          </div>
          <div className="record-note" style={{ textAlign: 'left' }}>PNG is exported at exactly 1080 × 1920 (9:16) and matches the preview above.</div>
        </div>
      </div>

      {status && <div className="terra-toast">{status}</div>}
    </div>
  );
}
