const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { ensureAuth } = require('../middleware/auth');

// node-fetch v3 is ESM-only — use dynamic import
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

// Mapbox SDK
const mbxClient     = require('@mapbox/mapbox-sdk');
const mbxDirections = require('@mapbox/mapbox-sdk/services/directions');
const baseClient    = mbxClient({ accessToken: process.env.MAPBOX_API_KEY });
const directions    = mbxDirections(baseClient);

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

// CO2 emission factors kg per km
const EMISSIONS = { driving: 0.21, cycling: 0.0, walking: 0.0, transit: 0.04 };

// Mapbox profile for each mode
const PROFILES = {
  walking: { profile: 'walking',         mode: 'walking'  },
  cycling: { profile: 'cycling',         mode: 'cycling'  },
  driving: { profile: 'driving-traffic', mode: 'driving'  },
  transit: { profile: 'driving',         mode: 'transit'  },
};

function calcCalories(mode, distKm, durMin) {
  // MET-based approximation
  if (mode === 'walking') return Math.round(distKm * 65);
  if (mode === 'cycling') return Math.round(distKm * 40);
  return 0;
}

function calcDifficulty(mode, distKm) {
  if (mode === 'driving' || mode === 'transit') return 'Easy';
  if (mode === 'walking') {
    if (distKm < 1)  return 'Easy';
    if (distKm < 4)  return 'Moderate';
    return 'Challenging';
  }
  if (mode === 'cycling') {
    if (distKm < 4)  return 'Easy';
    if (distKm < 12) return 'Moderate';
    return 'Challenging';
  }
  return 'Moderate';
}

function calcCost(mode, distKm) {
  // Rough Indian market estimate in INR
  if (mode === 'driving') return Math.round(distKm * 8);   // fuel ~₹8/km
  if (mode === 'transit') return Math.min(Math.max(Math.round(distKm * 2.5), 10), 60);
  return 0;
}

function arrivalTime(durMin) {
  const t = new Date(Date.now() + durMin * 60000);
  return t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Build rich, mode-aware step list from a Mapbox leg.
 *
 * For walking  — keeps all steps; adds surface/crossing hints where available.
 * For cycling  — adds lane-change and signal hints.
 * For driving  — full turn-by-turn with road names.
 * For transit  — simplified; adds "board / alight" language.
 */
function buildSteps(leg, mode) {
  if (!leg?.steps?.length) return [];

  return leg.steps.map((s, idx) => {
    const maneuver = s.maneuver || {};
    const type     = maneuver.type     || 'continue';
    const modifier = maneuver.modifier || null;
    const name     = s.name            || '';

    // Base instruction (Mapbox already returns English text when language:'en' is set)
    let instruction = maneuver.instruction || 'Continue';

    // Enrich instruction per mode
    if (mode === 'walking') {
      if (type === 'depart')  instruction = `Head ${modifier || 'forward'}${name ? ` on ${name}` : ''}`;
      if (type === 'arrive')  instruction = 'You have arrived at your destination';
    }

    if (mode === 'cycling') {
      if (type === 'depart')  instruction = `Start cycling ${modifier || 'forward'}${name ? ` on ${name}` : ''}`;
      if (type === 'arrive')  instruction = 'Lock up your bike — you have arrived';
      // Nudge cyclists to watch for lanes on sharp turns
      if ((type === 'turn') && (modifier === 'sharp right' || modifier === 'sharp left')) {
        instruction += ' — watch for cycle lane';
      }
    }

    if (mode === 'transit') {
      if (idx === 0)                  instruction = `Board transport${name ? ` at ${name}` : ''}`;
      if (idx === leg.steps.length-1) instruction = `Alight${name ? ` at ${name}` : ''} — you have arrived`;
    }

    return {
      instruction,
      distance: s.distance  || 0,   // metres
      duration: s.duration  || 0,   // seconds
      type,
      modifier,
      name,
    };
  });
}

/* ─────────────────────────────────────────────────────────────
   ROUTE PLANNING
───────────────────────────────────────────────────────────── */
router.post('/route', ensureAuth, async (req, res) => {
  const { origin, destination, transportModes } = req.body;

  // Validate
  if (!origin?.coordinates || !destination?.coordinates)
    return res.status(400).json({ error: 'Origin and destination coordinates required.' });
  if (!Array.isArray(origin.coordinates)      || origin.coordinates.length !== 2)
    return res.status(400).json({ error: 'Invalid origin coordinates.' });
  if (!Array.isArray(destination.coordinates) || destination.coordinates.length !== 2)
    return res.status(400).json({ error: 'Invalid destination coordinates.' });
  if (!Array.isArray(transportModes) || transportModes.length === 0)
    return res.status(400).json({ error: 'At least one transport mode required.' });

  // Sanity-check coordinate ranges
  const [oLng, oLat] = origin.coordinates;
  const [dLng, dLat] = destination.coordinates;
  if (Math.abs(oLat) > 90 || Math.abs(oLng) > 180 || Math.abs(dLat) > 90 || Math.abs(dLng) > 180)
    return res.status(400).json({ error: 'Coordinates out of valid range.' });

  try {
    const user  = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const prefs = Object.fromEntries(user.preferences || []);
    const selectedProfiles = transportModes
      .map(m => PROFILES[m.toLowerCase()])
      .filter(Boolean);

    if (!selectedProfiles.length)
      return res.status(400).json({ error: 'No valid transport modes selected.' });

    // Fire all direction requests in parallel
    const promises = selectedProfiles.map(async ({ profile, mode }) => {
      try {
        const resp = await directions.getDirections({
          profile,
          geometries:   'geojson',
          steps:        true,
          overview:     'full',
          alternatives: true,          // ask for up to 2 alternatives
          language:     'en',
          annotations:  ['distance', 'duration', 'speed'],
          waypoints: [
            { coordinates: origin.coordinates },
            { coordinates: destination.coordinates },
          ],
        }).send();
        return { resp, mode };
      } catch (err) {
        console.error(`[route] ${mode} direction error:`, err.message);
        return { resp: null, mode };
      }
    });

    const results = await Promise.all(promises);
    const output  = [];

    results.forEach(({ resp, mode }) => {
      if (!resp?.body?.routes?.length) return;

      // Take at most 2 alternatives per mode
      resp.body.routes.slice(0, 2).forEach((route, idx) => {
        const leg = route.legs?.[0];
        if (!leg) return;

        const distKm  = (route.distance || 0) / 1000;
        const durMin  = Math.round((route.duration || 0) / 60);
        if (distKm < 0.05) return;   // skip trivially short routes

        // Preference filtering
        const maxWalk = parseFloat(prefs.maxWalkingDistance) || 99;
        const maxBike = parseFloat(prefs.maxCyclingDistance) || 99;
        if (mode === 'walking' && distKm > maxWalk) return;
        if (mode === 'cycling' && distKm > maxBike) return;

        const drivingKg = distKm * EMISSIONS.driving;
        const modeKg    = distKm * (EMISSIONS[mode] || 0);
        const co2Saved  = Math.max(drivingKg - modeKg, 0);

        const modeLabels = { walking:'Walking', cycling:'Cycling', driving:'Driving', transit:'Transit' };

        output.push({
          id:               `${mode}-${idx}-${Date.now()}`,
          name:             idx === 0 ? `${modeLabels[mode]} Route` : `${modeLabels[mode]} Alt.`,
          mode,
          distance:         distKm.toFixed(1),
          duration:         durMin,
          co2Saved:         co2Saved.toFixed(2),
          geometry:         route.geometry,
          steps:            buildSteps(leg, mode),
          calories:         calcCalories(mode, distKm, durMin),
          difficulty:       calcDifficulty(mode, distKm),
          cost:             calcCost(mode, distKm),
          estimatedArrival: arrivalTime(durMin),
        });
      });
    });

    if (!output.length)
      return res.status(404).json({ error: 'No routes found. Try different locations or modes.' });

    // Sort by user sustainability preference
    const priority = prefs.sustainabilityPriority || 'Balanced';
    output.sort((a, b) => {
      if (priority === 'Eco First')   return parseFloat(b.co2Saved) - parseFloat(a.co2Saved);
      if (priority === 'Speed First') return a.duration - b.duration;
      // Balanced: weighted composite
      const scoreA = parseFloat(a.co2Saved) * 0.55 - a.duration * 0.012;
      const scoreB = parseFloat(b.co2Saved) * 0.55 - b.duration * 0.012;
      return scoreB - scoreA;
    });

    res.json(output.slice(0, 8));

  } catch (err) {
    console.error('[route] Unexpected error:', err);
    res.status(500).json({ error: 'Route planning failed. Please try again.' });
  }
});

/* ─────────────────────────────────────────────────────────────
   WEATHER  —  API key now read from process.env
───────────────────────────────────────────────────────────── */
router.get('/weather', ensureAuth, async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required.' });

  const key = process.env.OPENWEATHERMAP_API_KEY;
  if (!key) {
    console.warn('[weather] OPENWEATHERMAP_API_KEY not set in environment');
    return res.status(503).json({ error: 'Weather service not configured.' });
  }

  try {
    const url  = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (!resp.ok) {
      console.error('[weather] OpenWeatherMap error:', data);
      return res.status(resp.status).json({ error: 'Weather data unavailable.' });
    }

    res.json(data);
  } catch (err) {
    console.error('[weather] Fetch error:', err.message);
    res.status(500).json({ error: 'Weather fetch failed.' });
  }
});

/* ─────────────────────────────────────────────────────────────
   TRIP HISTORY
───────────────────────────────────────────────────────────── */
router.get('/history', ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const sorted = [...(user.tripHistory || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(sorted);
  } catch (err) {
    console.error('[history GET]', err.message);
    res.status(500).json({ error: 'Failed to fetch trip history.' });
  }
});

router.post('/history', ensureAuth, async (req, res) => {
  const { originName, destinationName, originCoords, destinationCoords, mode, distance, duration, co2Saved, calories } = req.body;

  // Inline validation
  const errs = [];
  if (!originName?.trim())      errs.push('Origin name required');
  if (!destinationName?.trim()) errs.push('Destination name required');
  if (!mode?.trim())            errs.push('Transport mode required');
  if (isNaN(parseFloat(distance)))  errs.push('Valid distance required');
  if (isNaN(parseInt(duration)))    errs.push('Valid duration required');
  if (isNaN(parseFloat(co2Saved)))  errs.push('Valid CO₂ value required');

  const checkCoords = (c, label) => {
    if (!c || isNaN(c.lat) || isNaN(c.lng)) { errs.push(`${label} coordinates invalid`); return; }
    if (Math.abs(c.lat) > 90 || Math.abs(c.lng) > 180) errs.push(`${label} coordinates out of range`);
  };
  checkCoords(originCoords,      'Origin');
  checkCoords(destinationCoords, 'Destination');

  if (errs.length) return res.status(400).json({ error: 'Validation failed', details: errs });

  const newTrip = {
    originName:        originName.trim(),
    destinationName:   destinationName.trim(),
    originCoords:      { lat: parseFloat(originCoords.lat),      lng: parseFloat(originCoords.lng)      },
    destinationCoords: { lat: parseFloat(destinationCoords.lat), lng: parseFloat(destinationCoords.lng) },
    mode:     mode.trim().toLowerCase(),
    distance: Math.max(parseFloat(distance), 0),
    duration: Math.max(parseInt(duration),   0),
    co2Saved: Math.max(parseFloat(co2Saved), 0),
    calories: Math.max(parseInt(calories) || 0, 0),
    date:     new Date(),
  };

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.tripHistory = user.tripHistory || [];
    user.tripHistory.unshift(newTrip);
    if (user.tripHistory.length > 200) user.tripHistory = user.tripHistory.slice(0, 200);
    if (typeof user.updateAggregatedStats === 'function') user.updateAggregatedStats();
    await user.save();

    res.status(201).json({ message: 'Trip saved', trip: user.tripHistory[0] });
  } catch (err) {
    console.error('[history POST]', err);
    if (err.name === 'ValidationError')
      return res.status(400).json({ error: 'Validation failed', details: Object.values(err.errors).map(e => e.message) });
    res.status(500).json({ error: 'Failed to save trip.' });
  }
});

router.delete('/history', ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    user.tripHistory = [];
    if (typeof user.updateAggregatedStats === 'function') user.updateAggregatedStats();
    await user.save();
    res.json({ message: 'History cleared.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear history.' });
  }
});

/* ─────────────────────────────────────────────────────────────
   PREFERENCES
───────────────────────────────────────────────────────────── */
const PREF_DEFAULTS = {
  transportModes:         ['Walking', 'Cycling', 'Driving'],
  maxWalkingDistance:     5,
  maxCyclingDistance:     20,
  sustainabilityPriority: 'Balanced',
  monthlyGoal:            60,
  homeAddress:            '',
  workAddress:            '',
};

router.get('/preferences', ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const stored = Object.fromEntries(user.preferences || []);
    res.json({ ...PREF_DEFAULTS, ...stored });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post(
  '/preferences',
  ensureAuth,
  [
    body('maxWalkingDistance').optional().isNumeric().withMessage('Must be a number'),
    body('maxCyclingDistance').optional().isNumeric().withMessage('Must be a number'),
    body('monthlyGoal').optional().isNumeric().withMessage('Must be a number'),
    body('sustainabilityPriority').optional().isIn(['Eco First','Balanced','Speed First']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: { preferences: req.body } },
        { new: true }
      );
      res.json(Object.fromEntries(user.preferences || []));
    } catch (err) {
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

/* ─────────────────────────────────────────────────────────────
   THEME
───────────────────────────────────────────────────────────── */
router.post('/theme', ensureAuth, async (req, res) => {
  try {
    const { theme } = req.body;
    if (!['light','dark','auto'].includes(theme))
      return res.status(400).json({ error: 'Invalid theme value.' });
    await User.findByIdAndUpdate(req.user.id, { theme });
    res.json({ message: 'Theme updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────────────────────
   PROFILE
───────────────────────────────────────────────────────────── */
router.get('/profile', ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put(
  '/profile',
  ensureAuth,
  [
    body('displayName').optional().trim().notEmpty().withMessage('Display name cannot be empty'),
    body('email').optional().isEmail().withMessage('Invalid email'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { displayName, email } = req.body;
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { ...(displayName && { displayName }), ...(email && { email: email.toLowerCase() }) },
        { new: true }
      ).select('-password');
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

/* ─────────────────────────────────────────────────────────────
   STATS
───────────────────────────────────────────────────────────── */
router.get('/stats', ensureAuth, async (req, res) => {
  try {
    const user  = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const trips = user.tripHistory || [];
    const now   = new Date();
    const sod   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sow   = new Date(sod); sow.setDate(sod.getDate() - sod.getDay());
    const som   = new Date(now.getFullYear(), now.getMonth(), 1);

    const blank = () => ({ co2Saved:0, trips:0, distance:0, calories:0 });
    const stats = { today:blank(), week:blank(), month:blank(), allTime:blank() };

    trips.forEach(t => {
      const d   = new Date(t.date);
      const co2 = parseFloat(t.co2Saved) || 0;
      const dst = parseFloat(t.distance) || 0;
      const cal = parseInt(t.calories)   || 0;
      const add = (bucket) => { bucket.co2Saved+=co2; bucket.trips++; bucket.distance+=dst; bucket.calories+=cal; };
      add(stats.allTime);
      if (d >= sod) add(stats.today);
      if (d >= sow) add(stats.week);
      if (d >= som) add(stats.month);
    });

    // Round for cleaner output
    Object.values(stats).forEach(b => {
      b.co2Saved  = parseFloat(b.co2Saved.toFixed(2));
      b.distance  = parseFloat(b.distance.toFixed(1));
    });

    res.json(stats);
  } catch (err) {
    console.error('[stats]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;