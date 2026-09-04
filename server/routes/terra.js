const express = require('express');
const TerraActivity = require('../models/TerraActivity');
const { ensureAuth } = require('../middleware/auth');

const router = express.Router();

const haversineKm = (a, b) => {
    const radius = 6371;
    const dLat = (b.latitude - a.latitude) * Math.PI / 180;
    const dLon = (b.longitude - a.longitude) * Math.PI / 180;
    const lat1 = a.latitude * Math.PI / 180;
    const lat2 = b.latitude * Math.PI / 180;
    const value = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const normalizePoints = (points) => {
    if (!Array.isArray(points) || points.length < 2 || points.length > 20000) return null;
    const normalized = points.map(point => ({
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        timestamp: new Date(point.timestamp),
        altitude: point.altitude == null ? undefined : Number(point.altitude),
        accuracy: point.accuracy == null ? undefined : Number(point.accuracy)
    }));
    if (normalized.some(point => !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) ||
        Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180 || Number.isNaN(point.timestamp.getTime()))) return null;
    if (normalized.some((point, index) => index > 0 && point.timestamp < normalized[index - 1].timestamp)) return null;
    return normalized;
};

const safeStoryPhoto = value => {
    if (!value) return '';
    if (typeof value !== 'string' || value.length > 1600000 || !/^data:image\/(jpeg|png|webp);base64,/i.test(value)) return null;
    return value;
};

router.get('/activities', ensureAuth, async (req, res) => {
    try {
        const activities = await TerraActivity.find({ userId: req.user.id }).sort({ endedAt: -1 }).limit(100).lean();
        res.json(activities);
    } catch (error) {
        res.status(500).json({ error: 'Unable to load TERRA journeys.' });
    }
});

router.get('/activities/:id', ensureAuth, async (req, res) => {
    try {
        const activity = await TerraActivity.findOne({ _id: req.params.id, userId: req.user.id }).lean();
        if (!activity) return res.status(404).json({ error: 'Journey not found.' });
        res.json(activity);
    } catch (error) {
        res.status(404).json({ error: 'Journey not found.' });
    }
});

router.post('/activities', ensureAuth, async (req, res) => {
    const { title, mode, startedAt, endedAt, routeCoordinates } = req.body;
    const points = normalizePoints(routeCoordinates);
    if (!title?.trim() || !mode?.trim() || !points) {
        return res.status(400).json({ error: 'A title, travel mode, and at least two valid GPS points are required.' });
    }
    const started = new Date(startedAt);
    const ended = new Date(endedAt);
    if (Number.isNaN(started.getTime()) || Number.isNaN(ended.getTime()) || ended < started) {
        return res.status(400).json({ error: 'Activity timestamps are invalid.' });
    }

    let distanceKm = 0;
    let elevationGainM = 0;
    let maxSpeedKmh = 0;
    for (let i = 1; i < points.length; i += 1) {
        const previous = points[i - 1];
        const current = points[i];
        const step = haversineKm(previous, current);
        const elapsedSeconds = Math.max(1, (current.timestamp - previous.timestamp) / 1000);
        const speedKmh = (step / elapsedSeconds) * 3600;
        const plausibleStep = step >= 0.002 && speedKmh <= 140;
        if (plausibleStep) {
            distanceKm += step;
            maxSpeedKmh = Math.max(maxSpeedKmh, speedKmh);
        }
        if (Number.isFinite(previous.altitude) && Number.isFinite(current.altitude) && current.altitude > previous.altitude) {
            elevationGainM += current.altitude - previous.altitude;
        }
    }
    const durationSeconds = Math.max(0, Math.round((ended - started) / 1000));
    const averageSpeedKmh = durationSeconds ? distanceKm / (durationSeconds / 3600) : 0;
    try {
        const activity = await TerraActivity.create({
            userId: req.user.id,
            title: title.trim(),
            mode: mode.trim(),
            startedAt: started,
            endedAt: ended,
            distanceKm,
            durationSeconds,
            elevationGainM: elevationGainM || undefined,
            averageSpeedKmh,
            maxSpeedKmh: maxSpeedKmh || undefined,
            routeCoordinates: points
        });
        res.status(201).json(activity);
    } catch (error) {
        res.status(500).json({ error: 'Unable to save TERRA journey.' });
    }
});

router.patch('/activities/:id/story', ensureAuth, async (req, res) => {
    const { title, storyCaption, storyBackground, storyTemplate, storyPhoto } = req.body;
    const update = {};
    if (title !== undefined) {
        if (!String(title).trim() || String(title).trim().length > 80) return res.status(400).json({ error: 'A journey title must be between 1 and 80 characters.' });
        update.title = String(title).trim();
    }
    if (storyCaption !== undefined) update.storyCaption = String(storyCaption).trim().slice(0, 280);
    if (storyBackground !== undefined) {
        if (!['map', 'photo', 'black'].includes(storyBackground)) return res.status(400).json({ error: 'Invalid story background.' });
        update.storyBackground = storyBackground;
    }
    if (storyTemplate !== undefined) {
        if (!['photo', 'route', 'minimal'].includes(storyTemplate)) return res.status(400).json({ error: 'Invalid story template.' });
        update.storyTemplate = storyTemplate;
    }
    if (storyPhoto !== undefined) {
        const photo = safeStoryPhoto(storyPhoto);
        if (photo === null) return res.status(400).json({ error: 'Story photo must be a compressed JPG, PNG, or WebP image under 1.2 MB.' });
        update.storyPhoto = photo;
    }
    try {
        const activity = await TerraActivity.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { $set: update }, { new: true });
        if (!activity) return res.status(404).json({ error: 'Journey not found.' });
        res.json(activity);
    } catch (error) {
        res.status(404).json({ error: 'Journey not found.' });
    }
});

module.exports = router;
