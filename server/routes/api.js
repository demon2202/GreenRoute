const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { ensureAuth } = require('../middleware/auth');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Import Mapbox SDK
const mbxClient = require('@mapbox/mapbox-sdk');
const mbxDirections = require('@mapbox/mapbox-sdk/services/directions');
const baseClient = mbxClient({ accessToken: process.env.MAPBOX_API_KEY });
const directionsService = mbxDirections(baseClient);

// --- Route Planning API ---
router.post('/route', ensureAuth, async (req, res) => {
    const { origin, destination } = req.body;
    if (!origin || !destination) {
        return res.status(400).json({ error: 'Origin and destination are required.' });
    }

    try {
        const profiles = ['driving-traffic', 'cycling', 'walking'];
        const routePromises = profiles.map(profile =>
            directionsService.getDirections({
                profile,
                geometries: 'geojson',
                steps: true,
                overview: 'full',
                waypoints: [{ coordinates: origin }, { coordinates: destination }]
            }).send()
        );

        const results = await Promise.all(routePromises);
        const suggestedRoutes = results
            .filter(result => result.body.routes && result.body.routes.length > 0)
            .map((result, index) => {
                const route = result.body.routes[0];
                const leg = route.legs[0];
                const mode = profiles[index].replace('-traffic', '');
                const emissionFactors = { driving: 0.17, cycling: 0.003, walking: 0.001 };
                const co2Saved = (route.distance / 1000) * (emissionFactors.driving - (emissionFactors[mode] || 0));

                return {
                    mode: mode,
                    distance: (route.distance / 1000).toFixed(1),
                    duration: (route.duration / 60).toFixed(0),
                    co2Saved: co2Saved.toFixed(2),
                    geometry: route.geometry,
                    steps: leg.steps.map(step => step.maneuver.instruction),
                };
            }).sort((a, b) => b.co2Saved - a.co2Saved);
        res.json(suggestedRoutes);
    } catch (error) {
        console.error("Mapbox API Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch routes.' });
    }
});

// --- Trip History API ---
router.get('/history', ensureAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json(user.tripHistory.sort((a, b) => b.date - a.date));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.post('/history', ensureAuth, async (req, res) => {
    const { originName, destinationName, mode, distance, duration, co2Saved } = req.body;
    const newTrip = { originName, destinationName, mode, distance, duration, co2Saved };

    try {
        const user = await User.findById(req.user.id);
        user.tripHistory.unshift(newTrip);
        await user.save();
        res.status(201).json(user.tripHistory);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- Weather API ---
router.get('/weather', ensureAuth, async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'Latitude and Longitude are required.' });
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHERMAP_API_KEY}&units=metric`;
    try {
        const weatherResponse = await fetch(url);
        const weatherData = await weatherResponse.json();
        res.json(weatherData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch weather data.' });
    }
});

// --- Preferences API ---
router.get('/preferences', ensureAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json(user.preferences);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/preferences',
    ensureAuth,
    [
        body('maxWalkingDistance').isNumeric(),
        body('maxCyclingDistance').isNumeric(),
        body('monthlyGoal').isNumeric(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        try {
            const user = await User.findByIdAndUpdate(req.user.id, { $set: { preferences: req.body } }, { new: true });
            res.json(user.preferences);
        } catch (err) {
            res.status(500).json({ error: 'Server error' });
        }
    }
);

// --- Theme API ---
router.post('/theme', ensureAuth, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { theme: req.body.theme });
        res.sendStatus(200);
    } catch(err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;