const express = require('express');
const router = express.Router();
const h3 = require('h3-js');
const mongoose = require('mongoose');
const GridCell = require('../models/GridCell');
const CaptureAttempt = require('../models/CaptureAttempt');
const Notification = require('../models/Notification');
const User = require('../models/User');
const TerritoryActivity = require('../models/TerritoryActivity');
const { ensureAuth } = require('../middleware/auth');

// Safe wrappers to support H3 version 3/4 differences
const getCellCenter = (cellId) => {
    try {
        return h3.cellToLatLng ? h3.cellToLatLng(cellId) : h3.h3ToGeo(cellId);
    } catch (e) {
        console.error('Error getting cell center:', e);
        return [28.6139, 77.2090]; // Default Delhi center fallback
    }
};

const getCellId = (lat, lng, resolution = 10) => {
    try {
        return h3.latLngToCell ? h3.latLngToCell(lat, lng, resolution) : h3.geoToH3(lat, lng, resolution);
    } catch (e) {
        console.error('Error getting cell ID:', e);
        return null;
    }
};

// Calculate orthodromic distance (haversine formula) in meters
function getOrthoDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const dPhi = (lat2 - lat1) * Math.PI / 180;
    const dLambda = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Anti-cheat validation: checks location formatting, teleportation speed, and walking speed limit
function validateAndLogMovement(user, newLat, newLng) {
    const latNum = parseFloat(newLat);
    const lngNum = parseFloat(newLng);

    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        throw new Error('Location data appears invalid.');
    }

    const now = new Date();
    const history = user.movementHistory || [];

    if (history.length > 0) {
        const lastPoint = history[history.length - 1];
        const distance = getOrthoDistance(lastPoint.lat, lastPoint.lng, latNum, lngNum); // meters
        const timeDiff = (now.getTime() - new Date(lastPoint.timestamp).getTime()) / 1000; // seconds

        if (timeDiff > 0) {
            const speedKmh = (distance / timeDiff) * 3.6;

            // GPS jump / teleporting check
            if (speedKmh > 120 && distance > 50) {
                throw new Error(`GPS jump detected. Speed too high (${speedKmh.toFixed(1)} km/h). Teleporting is not allowed.`);
            }

            // Walking/cycling/running speed verification
            if (speedKmh > 45 && distance > 30) {
                throw new Error(`Movement speed is too fast (${speedKmh.toFixed(1)} km/h). Claims are only allowed while walking, running, or cycling.`);
            }
        }
    }

    // Push new point and cap history at last 20 coordinates
    history.push({ lat: latNum, lng: lngNum, timestamp: now });
    user.movementHistory = history.slice(-20);
}

// GET /api/territory/cells - Retrieve visible cells in viewport
router.get('/cells', ensureAuth, async (req, res) => {
    try {
        const { bounds } = req.query;
        let query = {};

        if (bounds) {
            const [south, west, north, east] = bounds.split(',').map(Number);
            query.location = {
                $geoWithin: {
                    $box: [
                        [west, south], // southwest [lng, lat]
                        [east, north]  // northeast [lng, lat]
                    ]
                }
            };
        }

        const cells = await GridCell.find(query, 'cellId owner ownerName ownerImage strength defenseLevel capturedAt lastVisitedAt battlesCount').lean();
        res.json({ cells });
    } catch (err) {
        console.error('[territory fetch cells error]', err);
        res.status(500).json({ error: 'Failed to fetch cells' });
    }
});

// GET /api/territory/notifications - Retrieve user alerts
router.get('/notifications', ensureAuth, async (req, res) => {
    try {
        const list = await Notification.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// POST /api/territory/notifications/read - Mark user alerts as read
router.post('/notifications/read', ensureAuth, async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
        res.json({ message: 'Notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to clear notification alerts' });
    }
});

// POST /api/territory/claim/start - Initiate capture of a cell
router.post('/claim/start', ensureAuth, async (req, res) => {
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'Coordinates are required.' });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const cellId = getCellId(latNum, lngNum, 10); // H3 Resolution 10

    if (!cellId) {
        return res.status(400).json({ error: 'Could not resolve H3 cell.' });
    }

    try {
        let requiredDuration = 10000; // default 10 seconds for neutral cells
        const cell = await GridCell.findOne({ cellId });

        if (cell) {
            // If already owned by user, capture timer is 0 (immediate checkin)
            if (cell.owner.toString() === req.user.id) {
                requiredDuration = 0;
            } else {
                // Enemy owned capture times based on defense level
                if (cell.defenseLevel === 3) requiredDuration = 60000;      // Level 3 = 60s
                else if (cell.defenseLevel === 2) requiredDuration = 45000; // Level 2 = 45s
                else requiredDuration = 30000;                              // Level 1 = 30s
            }
        }

        // Upsert capture attempt log
        const attempt = await CaptureAttempt.findOneAndUpdate(
            { userId: req.user.id, cellId },
            {
                startedAt: new Date(),
                startLat: latNum,
                startLng: lngNum,
                requiredDuration
            },
            { upsert: true, new: true }
        );

        // Validate and log movement for user (anti-cheat verification)
        const userObj = await User.findById(req.user.id);
        if (!userObj) {
            return res.status(404).json({ error: 'User not found' });
        }
        try {
            validateAndLogMovement(userObj, latNum, lngNum);
        } catch (validationErr) {
            return res.status(400).json({ error: validationErr.message });
        }
        userObj.lastCoords = { lat: latNum, lng: lngNum };
        await userObj.save();

        res.json({
            message: 'Capture started',
            cellId,
            requiredDuration: attempt.requiredDuration
        });
    } catch (err) {
        console.error('[territory start claim error]', err);
        res.status(500).json({ error: 'Failed to start claim attempt' });
    }
});

// POST /api/territory/claim - Finalize capture after progress timer completes (atomic transaction)
router.post('/claim', ensureAuth, async (req, res) => {
    const { lat, lng, isSimulated } = req.body;

    if (lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'Coordinates are required.' });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const cellId = getCellId(latNum, lngNum, 10);

    if (!cellId) {
        return res.status(400).json({ error: 'Could not resolve H3 cell.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Fetch active attempt record
        const attempt = await CaptureAttempt.findOne({ userId: req.user.id, cellId }).session(session);
        if (!attempt) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                error: 'No active capture progress found for this cell. Enter the cell boundary first.'
            });
        }

        const elapsedMs = Date.now() - attempt.startedAt.getTime();
        // Allow 800ms network latency/jitter margin
        if (elapsedMs < attempt.requiredDuration - 800) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                error: `Not enough time spent inside the cell. Required: ${attempt.requiredDuration / 1000}s, Elapsed: ${(elapsedMs / 1000).toFixed(1)}s`
            });
        }

        // Speed check validation (moving window average)
        if (!isSimulated) {
            const distance = getOrthoDistance(attempt.startLat, attempt.startLng, latNum, lngNum);
            const durationSec = elapsedMs / 1000;
            const speedKmh = (distance / durationSec) * 3.6;

            // Reject if average speed exceeds 45 km/h (driving detection)
            if (speedKmh > 45 && distance > 30) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    error: `Average speed too high (${speedKmh.toFixed(1)} km/h). Claims are only allowed while walking, running, or cycling.`
                });
            }
        }

        const user = await User.findById(req.user.id).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'User not found' });
        }

        try {
            validateAndLogMovement(user, latNum, lngNum);
        } catch (validationErr) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: validationErr.message });
        }

        let cell = await GridCell.findOne({ cellId }).session(session);
        let wasCaptured = false;
        let isRevisit = false;
        let oldOwnerId = null;
        let oldOwnerName = '';
        let activityMsg = '';
        let activityType = 'capture';

        const centerCoords = getCellCenter(cellId); // [lat, lng]

        if (cell) {
            if (cell.owner.toString() !== user._id.toString()) {
                // Steal / Takeover
                oldOwnerId = cell.owner;
                oldOwnerName = cell.ownerName;
                activityType = 'steal';

                // Log old owner stats to history list
                const ownershipSeconds = Math.round((Date.now() - cell.capturedAt.getTime()) / 1000);
                cell.history.push({
                    owner: cell.owner,
                    ownerName: cell.ownerName,
                    capturedAt: cell.capturedAt,
                    duration: ownershipSeconds
                });
                
                if (cell.history.length > 50) {
                    cell.history = cell.history.slice(-50);
                }

                // Update ownership details
                cell.owner = user._id;
                cell.ownerName = user.displayName;
                cell.ownerImage = user.image || '';
                cell.capturedAt = new Date();
                cell.lastVisitedAt = new Date();
                cell.strength = 10; // reset strength on takeover
                cell.defenseLevel = 1; // reset level on takeover
                cell.battlesCount += 1;
                
                await cell.save({ session });
                wasCaptured = true;

                // Update victim stats
                const victim = await User.findById(oldOwnerId).session(session);
                if (victim) {
                    if (!victim.territoryStats) {
                        victim.territoryStats = { cellsCount: 0, successfulCaptures: 0, successfulDefenses: 0, empireScore: 0 };
                    }
                    const victimCellsCount = await GridCell.countDocuments({ owner: victim._id }).session(session);
                    victim.territoryStats.cellsCount = Math.max(victimCellsCount, 0);
                    victim.territoryStats.empireScore = (victim.territoryStats.cellsCount * 15) + (victim.territoryStats.successfulCaptures * 5) + (victim.territoryStats.successfulDefenses * 3);
                    await victim.save({ session });
                }

                // Update winner stats
                if (!user.territoryStats) {
                    user.territoryStats = { cellsCount: 0, successfulCaptures: 0, successfulDefenses: 0, empireScore: 0 };
                }
                user.territoryStats.successfulCaptures += 1;
                const userCellsCount = await GridCell.countDocuments({ owner: user._id }).session(session);
                user.territoryStats.cellsCount = userCellsCount; // fixed: count already includes the saved cell
                user.territoryStats.empireScore = (user.territoryStats.cellsCount * 15) + (user.territoryStats.successfulCaptures * 5) + (user.territoryStats.successfulDefenses * 3);
                user.lastCoords = { lat: latNum, lng: lngNum };
                await user.save({ session });

                // Create activity record
                activityMsg = `${user.displayName} stole a cell from ${oldOwnerName}`;
                await TerritoryActivity.create([{
                    userId: user._id,
                    userName: user.displayName,
                    userImage: user.image || '',
                    type: 'steal',
                    cellId,
                    message: activityMsg,
                    location: {
                        type: 'Point',
                        coordinates: [centerCoords[1], centerCoords[0]]
                    }
                }], { session });

                // Push notifications
                const msg = `${user.displayName} captured your territory in cell ${cellId.substring(0, 8)}...`;
                await Notification.create([{
                    userId: oldOwnerId,
                    type: 'steal',
                    message: msg
                }], { session });

            } else {
                // Revisit
                isRevisit = true;
                activityType = 'defense';
                const todayStr = new Date().toDateString();
                const lastVisitStr = new Date(cell.lastVisitedAt).toDateString();
                
                if (todayStr !== lastVisitStr) {
                    cell.strength = Math.min(cell.strength + 1, 100);
                }
                
                cell.lastVisitedAt = new Date();

                const daysOwned = (Date.now() - cell.capturedAt.getTime()) / (1000 * 3600 * 24);
                if (daysOwned >= 30) cell.defenseLevel = 3;
                else if (daysOwned >= 7) cell.defenseLevel = 2;
                else cell.defenseLevel = 1;

                await cell.save({ session });

                // Update user stats
                if (!user.territoryStats) {
                    user.territoryStats = { cellsCount: 0, successfulCaptures: 0, successfulDefenses: 0, empireScore: 0 };
                }
                user.territoryStats.successfulDefenses += 1;
                const userCellsCount = await GridCell.countDocuments({ owner: user._id }).session(session);
                user.territoryStats.cellsCount = userCellsCount;
                user.territoryStats.empireScore = (user.territoryStats.cellsCount * 15) + (user.territoryStats.successfulCaptures * 5) + (user.territoryStats.successfulDefenses * 3);
                user.lastCoords = { lat: latNum, lng: lngNum };
                await user.save({ session });

                // Create activity record
                activityMsg = `${user.displayName} defended their territory`;
                await TerritoryActivity.create([{
                    userId: user._id,
                    userName: user.displayName,
                    userImage: user.image || '',
                    type: 'defense',
                    cellId,
                    message: activityMsg,
                    location: {
                        type: 'Point',
                        coordinates: [centerCoords[1], centerCoords[0]]
                    }
                }], { session });
            }
        } else {
            // First time claim
            cell = new GridCell({
                cellId,
                owner: user._id,
                ownerName: user.displayName,
                ownerImage: user.image || '',
                capturedAt: new Date(),
                lastVisitedAt: new Date(),
                strength: 10,
                defenseLevel: 1,
                location: {
                    type: 'Point',
                    coordinates: [centerCoords[1], centerCoords[0]]
                },
                history: []
            });
            await cell.save({ session });
            wasCaptured = true;
            activityType = 'capture';

            // Update user stats
            if (!user.territoryStats) {
                user.territoryStats = { cellsCount: 0, successfulCaptures: 0, successfulDefenses: 0, empireScore: 0 };
            }
            user.territoryStats.successfulCaptures += 1;
            const userCellsCount = await GridCell.countDocuments({ owner: user._id }).session(session);
            user.territoryStats.cellsCount = userCellsCount; // fixed: count already includes the saved cell
            user.territoryStats.empireScore = (user.territoryStats.cellsCount * 15) + (user.territoryStats.successfulCaptures * 5) + (user.territoryStats.successfulDefenses * 3);
            user.lastCoords = { lat: latNum, lng: lngNum };
            await user.save({ session });

            // Create activity record
            activityMsg = `${user.displayName} expanded into a new region`;
            await TerritoryActivity.create([{
                userId: user._id,
                userName: user.displayName,
                userImage: user.image || '',
                type: 'capture',
                cellId,
                message: activityMsg,
                location: {
                    type: 'Point',
                    coordinates: [centerCoords[1], centerCoords[0]]
                }
            }], { session });
        }

        // Clean up capture attempt log
        await CaptureAttempt.deleteOne({ _id: attempt._id }).session(session);

        await session.commitTransaction();
        session.endSession();

        const io = req.app.get('io');
        // Emit dynamic activity feed update to all users
        if (io && activityMsg) {
            io.emit('activityCreated', {
                userId: user._id,
                userName: user.displayName,
                userImage: user.image || '',
                type: activityType,
                cellId,
                message: activityMsg,
                location: {
                    type: 'Point',
                    coordinates: [centerCoords[1], centerCoords[0]]
                },
                createdAt: new Date()
            });
        }

        if (wasCaptured && io) {
            io.emit('cellCaptured', {
                cellId,
                owner: user._id,
                ownerName: user.displayName,
                ownerImage: user.image || '',
                capturedAt: cell.capturedAt
            });
        }

        if (activityType === 'steal' && io && oldOwnerId) {
            io.emit('territoryStolen', {
                targetUserId: oldOwnerId.toString(),
                message: `${user.displayName} captured your territory in cell ${cellId.substring(0, 8)}...`
            });
        }

        res.json({
            message: wasCaptured 
                ? 'Territory captured!' 
                : (isRevisit ? 'Revisited territory. Strength updated.' : 'Already owned by you'),
            cellId,
            ownerName: user.displayName,
            wasCaptured,
            strength: cell.strength,
            defenseLevel: cell.defenseLevel
        });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error('[territory claim error]', err);
        res.status(500).json({ error: 'Failed to claim territory.' });
    }
});

// GET /api/territory/inspect/:cellId - Fetch details of cell and its owner's rival profile
router.get('/inspect/:cellId', ensureAuth, async (req, res) => {
    try {
        const { cellId } = req.params;
        const cell = await GridCell.findOne({ cellId }).lean();
        if (!cell) {
            // Return 200 OK with nulls to avoid console error logs
            return res.json({ cell: null, owner: null });
        }

        // Get owner details
        const owner = await User.findById(cell.owner, 'displayName image territoryStats').lean();
        if (!owner) {
            return res.json({ cell: null, owner: null });
        }

        // Compute dynamic ranking: get all users who own at least 1 cell, sort by empireScore descending
        // Then find this user's index
        const allEmpireUsers = await User.find({ 'territoryStats.cellsCount': { $gt: 0 } }, '_id territoryStats')
            .sort({ 'territoryStats.empireScore': -1 })
            .lean();
        
        const ownerIndex = allEmpireUsers.findIndex(u => u._id.toString() === cell.owner.toString());
        const dynamicRank = ownerIndex !== -1 ? ownerIndex + 1 : null;

        // Calculate dynamic area in km² (approx 0.015 km² per res 10 cell)
        const cellsCount = owner.territoryStats?.cellsCount || 0;
        const areaKm2 = parseFloat((cellsCount * 0.015).toFixed(3));

        res.json({
            cell: {
                cellId: cell.cellId,
                strength: cell.strength,
                defenseLevel: cell.defenseLevel,
                lastVisitedAt: cell.lastVisitedAt || cell.capturedAt,
                battlesCount: cell.battlesCount || 0,
                capturedAt: cell.capturedAt
            },
            owner: {
                userId: owner._id,
                displayName: owner.displayName,
                image: owner.image || '',
                cellsCount,
                areaKm2,
                empireScore: owner.territoryStats?.empireScore || 0,
                successfulCaptures: owner.territoryStats?.successfulCaptures || 0,
                successfulDefenses: owner.territoryStats?.successfulDefenses || 0,
                rank: dynamicRank
            }
        });
    } catch (err) {
        console.error('[territory inspect error]', err);
        res.status(500).json({ error: 'Failed to inspect cell.' });
    }
});

// GET /api/territory/activity - Fetch viewport-based activity or global fallback
router.get('/activity', ensureAuth, async (req, res) => {
    try {
        const { bounds } = req.query;
        let query = {};

        if (bounds) {
            const [south, west, north, east] = bounds.split(',').map(Number);
            query.location = {
                $geoWithin: {
                    $box: [
                        [west, south], // southwest [lng, lat]
                        [east, north]  // northeast [lng, lat]
                    ]
                }
            };
        }

        let activities = await TerritoryActivity.find(query)
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        // Fallback to global recent activities if viewport activities are empty
        if (bounds && activities.length === 0) {
            activities = await TerritoryActivity.find({})
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();
        }

        res.json(activities);
    } catch (err) {
        console.error('[territory activity fetch error]', err);
        res.status(500).json({ error: 'Failed to fetch activity.' });
    }
});

// GET /api/territory/leaderboard - Return territory leaderboard based on sortBy
router.get('/leaderboard', ensureAuth, async (req, res) => {
    try {
        const { sortBy = 'empireScore' } = req.query;

        // Allow sorting by: empireScore, cellsCount, successfulCaptures, successfulDefenses
        const validSortFields = {
            empireScore: 'empireScore',
            cellsCount: 'cellsCount',
            captures: 'successfulCaptures',
            defenses: 'successfulDefenses'
        };

        const sortKey = validSortFields[sortBy] || 'empireScore';

        // Fetch counts directly from GridCell to be self-healing
        const cellCounts = await GridCell.aggregate([
            { $group: { _id: '$owner', count: { $sum: 1 } } }
        ]);
        const cellCountMap = {};
        cellCounts.forEach(c => {
            cellCountMap[c._id.toString()] = c.count;
        });

        // Query all users
        const users = await User.find({}, 'displayName image territoryStats').lean();

        const ranked = users.map(u => {
            const cellsCount = cellCountMap[u._id.toString()] || 0;
            const captures = u.territoryStats?.successfulCaptures || 0;
            const defenses = u.territoryStats?.successfulDefenses || 0;
            // Calculate dynamic empireScore: (cells * 15) + (captures * 5) + (defenses * 3)
            const empireScore = (cellsCount * 15) + (captures * 5) + (defenses * 3);
            return {
                userId: u._id,
                displayName: u.displayName,
                image: u.image || '',
                cellsCount,
                areaKm2: parseFloat((cellsCount * 0.015).toFixed(3)),
                empireScore,
                successfulCaptures: captures,
                successfulDefenses: defenses
            };
        });

        // Filter out users with 0 cells
        let filteredRanked = ranked.filter(r => r.cellsCount > 0);

        // Sort by the chosen metric
        filteredRanked.sort((a, b) => b[sortKey] - a[sortKey] || b.empireScore - a.empireScore);

        // Add dynamic rank
        filteredRanked = filteredRanked.map((item, index) => ({
            ...item,
            rank: index + 1
        }));

        const currentUserIdStr = req.user.id.toString();
        const currentUserRankInfo = filteredRanked.find(u => u.userId.toString() === currentUserIdStr);

        res.json({
            leaderboard: filteredRanked.slice(0, 50), // top 50
            currentUser: currentUserRankInfo || null
        });
    } catch (err) {
        console.error('[territory leaderboard fetch error]', err);
        res.status(500).json({ error: 'Failed to fetch leaderboard.' });
    }
});

// GET /api/territory/leaderboard/active - Return most active players today (captures/defenses last 24h)
router.get('/leaderboard/active', ensureAuth, async (req, res) => {
    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const mostActiveToday = await TerritoryActivity.aggregate([
            { $match: { createdAt: { $gte: oneDayAgo } } },
            {
                $group: {
                    _id: '$userId',
                    count: { $sum: 1 },
                    userName: { $first: '$userName' },
                    userImage: { $first: '$userImage' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.json(mostActiveToday);
    } catch (err) {
        console.error('[territory active fetch error]', err);
        res.status(500).json({ error: 'Failed to fetch active players.' });
    }
});

// GET /api/territory/leaderboard/aggressive - Return most aggressive players (steals)
router.get('/leaderboard/aggressive', ensureAuth, async (req, res) => {
    try {
        const mostAggressive = await TerritoryActivity.aggregate([
            { $match: { type: 'steal' } },
            {
                $group: {
                    _id: '$userId',
                    count: { $sum: 1 },
                    userName: { $first: '$userName' },
                    userImage: { $first: '$userImage' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.json(mostAggressive);
    } catch (err) {
        console.error('[territory aggressive fetch error]', err);
        res.status(500).json({ error: 'Failed to fetch aggressive players.' });
    }
});

module.exports = router;
