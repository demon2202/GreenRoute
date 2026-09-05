const express = require('express');
const router = express.Router();
const https = require('https');
const multer = require('multer');

const TerraActivity = require('../models/TerraActivity');
const { ensureAuth } = require('../middleware/auth');
const {
  computeMetrics,
  ecoMetrics,
  cleanRoute,
  durationSeconds,
} = require('../utils/terraMath');

/* ─────────────────────────────────────────────────────────────
   Photo upload (multipart) — stored as base64 data URI in MongoDB.
   No files written to disk. The photo lives inside the activity
   document, so everything is self-contained and survives restarts.
───────────────────────────────────────────────────────────── */
const upload = multer({
  storage: multer.memoryStorage(), // keep file in memory, not on disk
  limits: { fileSize: 8 * 1024 * 1024, files: 1 }, // 8MB limit (base64 grows ~33%)
  fileFilter: (_req, file, cb) => {
    if (!file || !/^image\//.test(file.mimetype)) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

router.post('/media', ensureAuth, (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 8 MB).' : err.message || 'Upload failed';
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    // Convert to base64 data URI — stored directly in MongoDB, no file system
    const base64 = req.file.buffer.toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${base64}`;
    res.status(201).json({ url: dataUri });
  });
});

/* ─────────────────────────────────────────────────────────────
   Free map tiles proxy — multi-source so a card map ALWAYS gets a
   real basemap. Sources tried in order until one succeeds:
     normal/light → OSM standard → Carto Voyager → Carto Positron
     dark         → OSM standard (client inverts it to a black map)
                    → Carto Positron (still light, so the client
                      invert keeps visible streets)
     carto_dark   → Carto dark-matter (legacy/no-filter black)
   Fetched server-side (Node 14/16+ via the built-in https module — no global
   fetch required), returned with long cache headers + LRU.
───────────────────────────────────────────────────────────── */
const TILE_SUBDOMAINS = ['a', 'b', 'c', 'd'];
const TILE_SOURCES = {
  normal: [
    { name: 'osm' },
    { name: 'carto', map: 'rastertiles/voyager' },
    { name: 'carto', map: 'rastertiles/positron' },
  ],
  light: [
    { name: 'osm' },
    { name: 'carto', map: 'rastertiles/voyager' },
  ],
  dark: [
    { name: 'osm' },
    { name: 'carto', map: 'rastertiles/positron' },
  ],
  carto_dark: [{ name: 'carto', map: 'dark_all' }],
  carto_light: [{ name: 'carto', map: 'light_all' }],
};
const tileCache = new Map();
const TILE_CACHE_MAX = 1200;
const TILE_UA = 'GreenRoute-Terra/2.1 (eco navigation app; share-card map renderer; demo use)';

function tileUrl(src, z, x, y) {
  if (src.name === 'carto') {
    const sub = TILE_SUBDOMAINS[(x * 7 + y * 3) % TILE_SUBDOMAINS.length];
    return `https://${sub}.basemaps.cartocdn.com/${src.map}/${z}/${x}/${y}.png`;
  }
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

/* Fetch a remote binary over HTTPS with the built-in https module. Uses NO
   global fetch(), so the tile proxy works on Node 14/16/18+ alike — a Node
   version without fetch used to make every tile silently fail with a 502. */
function httpsGetBuffer(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': TILE_UA, Accept: 'image/*' },
      timeout: timeoutMs,
    }, (res) => {
      const code = res.statusCode || 0;
      if (code < 200 || code >= 300) {
        res.resume();
        return reject(new Error(`HTTP ${code}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

router.get('/tile/:z/:x/:y', ensureAuth, async (req, res) => {
  const z = Number(req.params.z);
  const x = Number(req.params.x);
  const y = Number(req.params.y);
  if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) {
    return res.status(400).json({ error: 'Invalid tile coordinates' });
  }
  const maxTiles = 2 ** z;
  if (z < 1 || z > 19 || x < 0 || x >= maxTiles || y < 0 || y >= maxTiles) {
    return res.status(400).json({ error: 'Tile out of range' });
  }
  const style = String(req.query.style || 'normal');
  const sources = TILE_SOURCES[style] || TILE_SOURCES.normal;

  // Cache hit (keyed by style so each theme keeps its own tiles)
  const styleKey = `${style}/${z}/${x}/${y}`;
  const cached = tileCache.get(styleKey);
  if (cached) {
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(cached);
  }

  // Try each source in order; cache the first that answers.
  let lastErr = null;
  for (const src of sources) {
    const srcKey = `${src.name}:${src.map || ''}/${z}/${x}/${y}`;
    const srcCached = tileCache.get(srcKey);
    let buf = srcCached || null;
    if (!buf) {
      try {
        buf = await httpsGetBuffer(tileUrl(src, z, x, y));
        if (!buf || buf.length === 0) throw new Error(`${src.name} empty response`);
      } catch (err) {
        lastErr = new Error(`${src.name} ${err.message}`);
        buf = null;
      }
    }

    if (buf) {
      tileCache.set(srcKey, buf);
      tileCache.set(styleKey, buf);
      if (tileCache.size > TILE_CACHE_MAX) {
        const firstKey = tileCache.keys().next().value;
        tileCache.delete(firstKey);
      }
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(buf);
    }
  }

  console.warn('[terra tile]', styleKey, lastErr ? lastErr.message : 'no source');
  res.status(502).json({ error: 'Tile source unavailable' });
});

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const MODES = new Set(['walking', 'running', 'cycling', 'driving']);

function sanitizeText(v, max) {
  return String(v || '')
    .replace(/[<>\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, max);
}

// Photo field accepts either:
//   • a base64 data URI (data:image/...;base64,...) — stored in MongoDB
//   • a relative path /uploads/terra/<hex>.<ext>   (legacy local storage)
//   • an absolute URL to THIS app's own API host   (legacy deployed split origin)
// Anything else is rejected.
const PHOTO_PATH_RE = /^\/uploads\/terra\/[a-f0-9]{16,40}\.(png|jpe?g|webp|gif)$/;
const DATA_URI_RE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=]+$/;
function ownPhotoOrigin(origin) {
  const envOrigin = (process.env.SERVER_URL || '').replace(/\/$/, '');
  return Boolean(
    envOrigin && origin === envOrigin
  );
}
function safePhotoPath(v) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return '';
  // Base64 data URI — the new primary storage method
  if (s.startsWith('data:image/')) {
    if (!DATA_URI_RE.test(s)) {
      throw Object.assign(new Error('Invalid image data.'), { status: 400 });
    }
    return s.slice(0, 20_000_000); // ~15MB max (base64 of ~11MB original)
  }
  // Legacy: file path or URL
  let pathOnly = s;
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      if (!ownPhotoOrigin(u.origin)) {
        throw Object.assign(new Error('Invalid photo URL — use a photo you uploaded to TERRA.'), { status: 400 });
      }
      pathOnly = u.pathname;
    } catch (err) {
      if (err && err.status) throw err;
      throw Object.assign(new Error('Invalid photo URL — use a photo you uploaded to TERRA.'), { status: 400 });
    }
  }
  if (!PHOTO_PATH_RE.test(pathOnly)) {
    throw Object.assign(new Error('Invalid photo path — use a photo you uploaded to TERRA.'), { status: 400 });
  }
  return pathOnly.slice(0, 400);
}

const CARD_STATS_ALL = new Set(['distance', 'time', 'avgSpeed', 'maxSpeed', 'elevation', 'eco']);
function sanitizeCardStats(v) {
  if (!Array.isArray(v)) return undefined; // not provided → leave default
  const set = new Set(v.map((k) => String(k)).filter((k) => CARD_STATS_ALL.has(k)));
  return set; // caller decides final ordering
}
const STAT_ORDER = ['distance', 'time', 'avgSpeed', 'maxSpeed', 'elevation', 'eco'];

function normalizeMapStyle(v) {
  // 'light' was an early experiment (near-white map) — map it to the
  // standard colourful 'normal' so nothing ever renders white.
  return v === 'dark' ? 'dark' : 'normal';
}

/**
 * Compute final authoritative activity from a submitted track.
 * Server derives every metric itself from the GPS points — client numbers
 * are never trusted.
 */
function buildActivity(userId, body) {
  const mode = String(body.mode || 'cycling').toLowerCase();
  if (!MODES.has(mode)) throw Object.assign(new Error('Invalid activity mode'), { status: 400 });

  const startISO = body.startTime;
  const endISO = body.endTime;
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) {
    throw Object.assign(new Error('Valid startTime / endTime are required'), { status: 400 });
  }

  const route = cleanRoute(body.route, 4000);
  if (route.length < 2) {
    throw Object.assign(new Error('At least two valid GPS points are required'), { status: 400 });
  }

  const dur = durationSeconds(startISO, endISO) || Math.max(1, Math.round((e - s) / 1000));
  if (dur < 1) throw Object.assign(new Error('Activity duration must be at least 1 second'), { status: 400 });

  const m = computeMetrics(route, mode, dur);
  if (m.distanceKm < 0.001) {
    // A track that really produced ~0 distance is allowed but pointless;
    // still let it save with 0 so the user sees an honest result.
  }

  const eco = ecoMetrics(mode, m.distanceKm);

  const now = new Date();
  return {
    user: userId,
    mode,
    title: sanitizeText(body.title, 80) || defaultTitle(mode, s),
    caption: sanitizeText(body.caption, 220),
    bg: ['map', 'photo'].includes(body.bg) ? body.bg : 'map', // solid colour removed from TERRA
    // Fresh recordings keep the schema default (dark = TERRA's signature
    // black map) unless the caller explicitly chose a style.
    ...(body.mapStyle !== undefined ? { mapStyle: normalizeMapStyle(body.mapStyle) } : {}),
    photo: safePhotoPath(body.photo),
    cardStats: (() => {
      const s = sanitizeCardStats(body.cardStats);
      return s === undefined ? undefined : STAT_ORDER.filter((k) => s.has(k));
    })(),
    startTime: new Date(s),
    endTime: new Date(e),
    durationSec: dur,
    distanceKm: m.distanceKm,
    avgSpeedKmh: m.avgSpeedKmh,
    maxSpeedKmh: m.maxSpeedKmh,
    elevationGainM: m.hasElevation ? m.elevationGainM : 0,
    elevationLossM: m.hasElevation ? m.elevationLossM : 0,
    hasElevation: m.hasElevation,
    co2SavedKg: eco.co2SavedKg,
    caloriesKcal: eco.caloriesKcal,
    ecoScore: eco.ecoScore,
    route,
    bounds: m.bounds,
    createdAt: now,
  };
}

function defaultTitle(mode, startMs) {
  const h = new Date(startMs).getHours();
  const part = h < 5 ? 'Night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night';
  const modeLabel = { walking: 'Walk', running: 'Run', cycling: 'Ride', driving: 'Drive' }[mode] || 'Activity';
  return `${part} ${modeLabel}`;
}

/* ─────────────────────────────────────────────────────────────
   CRUD (all scoped to the authenticated user — ownership enforced)
───────────────────────────────────────────────────────────── */
router.get('/activities', ensureAuth, async (req, res) => {
  try {
    const docs = await TerraActivity.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(docs);
  } catch (err) {
    console.error('[terra list]', err.message);
    res.status(500).json({ error: 'Failed to load journeys.' });
  }
});

router.post('/activities', ensureAuth, async (req, res) => {
  let activity;
  try {
    activity = buildActivity(req.user.id, req.body || {});
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  try {
    const doc = await TerraActivity.create(activity);
    res.status(201).json(doc);
  } catch (err) {
    console.error('[terra create]', err.message);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors).map((x) => x.message).join('; ') });
    }
    res.status(500).json({ error: 'Failed to save activity.' });
  }
});

router.get('/activities/:id', ensureAuth, async (req, res) => {
  try {
    const doc = await TerraActivity.findOne({ _id: req.params.id, user: req.user.id }).lean();
    if (!doc) return res.status(404).json({ error: 'Journey not found.' });
    res.json(doc);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Journey not found.' });
    console.error('[terra get]', err.message);
    res.status(500).json({ error: 'Failed to load journey.' });
  }
});

// Partial update: only editable story fields (title, caption, bg, photo).
// Metrics are NEVER client-editable.
router.patch('/activities/:id', ensureAuth, async (req, res) => {
  try {
    const doc = await TerraActivity.findOne({ _id: req.params.id, user: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Journey not found.' });

    const b = req.body || {};
    if (b.title !== undefined) doc.title = sanitizeText(b.title, 80);
    if (b.caption !== undefined) doc.caption = sanitizeText(b.caption, 220);
    // Only Map and Photo exist now — any stray colour value is coerced to Map.
    if (b.bg !== undefined) doc.bg = ['map', 'photo'].includes(b.bg) ? b.bg : 'map';
    if (b.mapStyle !== undefined) doc.mapStyle = normalizeMapStyle(b.mapStyle);
    if (b.cardStats !== undefined) {
      const s = sanitizeCardStats(b.cardStats);
      if (s) doc.cardStats = STAT_ORDER.filter((k) => s.has(k));
    }
    if (b.photo !== undefined) {
      try {
        doc.photo = safePhotoPath(b.photo);
      } catch (e) {
        if (e && e.status) return res.status(e.status).json({ error: e.message });
        throw e;
      }
    }

    await doc.save();
    res.json(doc);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Journey not found.' });
    console.error('[terra patch]', err.message);
    res.status(500).json({ error: 'Failed to update journey.' });
  }
});

router.delete('/activities/:id', ensureAuth, async (req, res) => {
  try {
    const doc = await TerraActivity.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Journey not found.' });
    res.json({ message: 'Journey deleted.' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Journey not found.' });
    console.error('[terra delete]', err.message);
    res.status(500).json({ error: 'Failed to delete journey.' });
  }
});

module.exports = router;
