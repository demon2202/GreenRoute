const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
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
   Photo upload (multipart) — stored under server/uploads/terra
───────────────────────────────────────────────────────────── */
// Uploads live under server/uploads/terra — the same root the app serves
// statically at /uploads (absolute path, so it works no matter the cwd).
const uploadDir = path.join(__dirname, '..', 'uploads', 'terra');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname || '').toLowerCase().match(/\.(png|jpe?g|webp|gif)$/) || ['.jpg'])[0];
    cb(null, `${crypto.randomBytes(12).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
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
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 12 MB).' : err.message || 'Upload failed';
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    res.status(201).json({
      url: `/uploads/terra/${req.file.filename}`,
    });
  });
});

/* ─────────────────────────────────────────────────────────────
   Free map tiles proxy (OpenStreetMap raster) so the Terra share
   cards can embed a real map background WITHOUT any API key and
   without canvas CORS tainting. Tiles are fetched server-side and
   returned with long cache headers. Light in-memory LRU cache.
───────────────────────────────────────────────────────────── */
const tileCache = new Map();
const TILE_CACHE_MAX = 600;

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

  const key = `${z}/${x}/${y}`;
  const cached = tileCache.get(key);
  if (cached) {
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(cached);
  }

  try {
    const url = `https://tile.openstreetmap.org/${key}.png`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'GreenRoute-Terra/2.0 (eco navigation app; share-card map renderer)',
        Accept: 'image/*',
      },
    });
    if (!resp.ok) throw new Error(`OSM tile ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());
    tileCache.set(key, buf);
    if (tileCache.size > TILE_CACHE_MAX) {
      const firstKey = tileCache.keys().next().value;
      tileCache.delete(firstKey);
    }
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buf);
  } catch (err) {
    console.warn('[terra tile]', key, err.message);
    res.status(502).json({ error: 'Tile source unavailable' });
  }
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

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
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
    bg: ['black', 'map', 'photo'].includes(body.bg) ? body.bg : 'black',
    photo: typeof body.photo === 'string' ? body.photo.slice(0, 400) : '',
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

function publicActivity(a) {
  return a; // fields are already plain + safe
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
    if (b.bg !== undefined && ['black', 'map', 'photo'].includes(b.bg)) doc.bg = b.bg;
    if (b.photo !== undefined) doc.photo = String(b.photo).slice(0, 400);

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
