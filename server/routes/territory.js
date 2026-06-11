const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Territory = require('../models/Territory');
const TerritoryAttack = require('../models/TerritoryAttack');
const Notification = require('../models/Notification');
const User = require('../models/User');
const TerritoryActivity = require('../models/TerritoryActivity');
const { ensureAuth } = require('../middleware/auth');

// Dynamic defense level calculation and decay logic
function updateCellDefenseAndDecay(territory) {
    const now = new Date();
    const daysSinceCaptured = (now - territory.createdAt) / (1000 * 60 * 60 * 24);
    const daysSinceLastVisited = (now - (territory.lastVisitedAt || territory.createdAt)) / (1000 * 60 * 60 * 24);
    
    // Maintenance progression
    let baseLevel = 1;
    if (daysSinceCaptured >= 120) baseLevel = 5;
    else if (daysSinceCaptured >= 60) baseLevel = 4;
    else if (daysSinceCaptured >= 30) baseLevel = 3;
    else if (daysSinceCaptured >= 7) baseLevel = 2;
    
    // Inactivity decay
    let decay = 0;
    if (daysSinceLastVisited >= 30) decay = 2;
    else if (daysSinceLastVisited >= 14) decay = 1;
    
    territory.defenseLevel = Math.max(1, Math.min(5, baseLevel - decay));
    return territory;
}

// Calculate distance between two coordinates in meters
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

// Geometry helper: Ray-casting Point-in-Polygon
function isPointInPolygon(point, polygon) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Geometry helper: Bounding box of a polygon
function getBoundingBox(polygon) {
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    polygon.forEach(coord => {
        const [lng, lat] = coord;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    });
    return { minLng, maxLng, minLat, maxLat };
}

// Geometry helper: Bounding box overlap
function boxesIntersect(box1, box2) {
    return (box1.minLng <= box2.maxLng && box1.maxLng >= box2.minLng &&
            box1.minLat <= box2.maxLat && box1.maxLat >= box2.minLat);
}

// Geometry helper: Line segment intersection check
function lineSegmentsIntersect(p1, q1, p2, q2) {
    function ccw(A, B, C) {
        return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0]);
    }
    return ccw(p1, p2, q2) !== ccw(q1, p2, q2) && ccw(p1, q1, p2) !== ccw(p1, q1, q2);
}

// Geometry helper: Check if two polygons overlap
function polygonsIntersect(poly1, poly2) {
    for (let i = 0; i < poly1.length - 1; i++) {
        for (let j = 0; j < poly2.length - 1; j++) {
            if (lineSegmentsIntersect(poly1[i], poly1[i+1], poly2[j], poly2[j+1])) {
                return true;
            }
        }
    }
    if (isPointInPolygon(poly1[0], poly2)) return true;
    if (isPointInPolygon(poly2[0], poly1)) return true;
    return false;
}

// Geometry helper: Self-intersection validation
function isSelfIntersecting(polygon) {
    if (polygon.length < 4) return false;
    for (let i = 0; i < polygon.length - 1; i++) {
        for (let j = i + 2; j < polygon.length - 1; j++) {
            if (i === 0 && j === polygon.length - 2) continue;
            if (lineSegmentsIntersect(polygon[i], polygon[i+1], polygon[j], polygon[j+1])) {
                return true;
            }
        }
    }
    return false;
}

// Geometry helper: Local origin projected Shoelace area and perimeter calculation
function calculateAreaAndPerimeter(boundary) {
    if (boundary.length < 4) return { area: 0, perimeter: 0 };
    
    let perimeter = 0;
    let area = 0;
    
    const originLng = boundary[0][0];
    const originLat = boundary[0][1];
    
    const latToKm = 111.32;
    const lngToKm = 111.32 * Math.cos(originLat * Math.PI / 180);
    
    const projectedPoints = boundary.map(coord => [
        (coord[0] - originLng) * lngToKm, // x in km
        (coord[1] - originLat) * latToKm  // y in km
    ]);
    
    for (let i = 0; i < boundary.length - 1; i++) {
        const p1 = projectedPoints[i];
        const p2 = projectedPoints[i+1];
        
        area += (p1[0] * p2[1]) - (p2[0] * p1[1]);
        
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    
    area = Math.abs(area) / 2; // in km²
    
    return { area, perimeter };
}

// Anti-cheat movement tracker
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
        const distance = getOrthoDistance(lastPoint.lat, lastPoint.lng, latNum, lngNum);
        const timeDiff = (now.getTime() - new Date(lastPoint.timestamp).getTime()) / 1000;

        if (timeDiff > 0) {
            const speedKmh = (distance / timeDiff) * 3.6;

            if (speedKmh > 120 && distance > 50) {
                throw new Error(`GPS jump detected. Speed too high (${speedKmh.toFixed(1)} km/h). Teleporting is not allowed.`);
            }

            if (speedKmh > 45 && distance > 30) {
                throw new Error(`Movement speed is too fast (${speedKmh.toFixed(1)} km/h). Claims are only allowed while walking, running, or cycling.`);
            }
        }
    }

    history.push({ lat: latNum, lng: lngNum, timestamp: now });
    user.movementHistory = history.slice(-20);
}

// Update total areaOwned in user document
async function recalculateUserStats(userId, session) {
    const user = await User.findById(userId).session(session);
    if (!user) return;
    
    // Sum area of all active owned territories
    const territories = await Territory.find({ owner: userId }).session(session);
    const totalArea = territories.reduce((sum, t) => sum + (t.area || 0), 0);
    
    if (!user.territoryStats) {
        user.territoryStats = { areaOwned: 0, successfulCaptures: 0, successfulDefenses: 0, longestStreak: 0, empireScore: 0 };
    }
    user.territoryStats.areaOwned = parseFloat(totalArea.toFixed(4));
    
    // Update empireScore formula
    const cells = user.territoryStats.areaOwned;
    const caps = user.territoryStats.successfulCaptures || 0;
    const defs = user.territoryStats.successfulDefenses || 0;
    const streak = user.territoryStats.longestStreak || 0;
    
    user.territoryStats.empireScore = Math.round((cells * 15) + (caps * 5) + (defs * 3) + (streak * 10));
    await user.save({ session });
}

// GET /api/territory/territories - Retrieve visible territories in viewport
router.get('/territories', ensureAuth, async (req, res) => {
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

        const list = await Territory.find(query)
            .populate('owner', 'displayName image')
            .lean();

        // Dynamically compute/update defense level and return formatting
        const processed = list.map(t => {
            const updated = updateCellDefenseAndDecay(t);
            return {
                ...updated,
                cellId: t._id.toString(), // Keep cellId for client-side drawing fallback mapping
                ownerName: t.owner?.displayName || 'Unknown',
                ownerImage: t.owner?.image || ''
            };
        });

        res.json({ cells: processed });
    } catch (err) {
        console.error('[territory fetch error]', err);
        res.status(500).json({ error: 'Failed to fetch territories.' });
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

// POST /api/territory/track - Update user location and log history
router.post('/track', ensureAuth, async (req, res) => {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'Coordinates are required.' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        validateAndLogMovement(user, lat, lng);
        user.lastCoords = { lat: parseFloat(lat), lng: parseFloat(lng) };
        await user.save();

        res.json({ message: 'Location updated successfully.' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/territory/claim - Capture a new loop territory
router.post('/claim', ensureAuth, async (req, res) => {
    const { lat, lng, boundary, isSimulated } = req.body;

    if (!boundary || !Array.isArray(boundary) || boundary.length < 4) {
        return res.status(400).json({ error: 'Valid polygon boundary is required.' });
    }

    const isClosed = boundary[0][0] === boundary[boundary.length - 1][0] &&
                     boundary[0][1] === boundary[boundary.length - 1][1];
    if (!isClosed) {
        return res.status(400).json({ error: 'Polygon must be closed.' });
    }

    if (process.env.NODE_ENV === 'production' && isSimulated) {
        return res.status(403).json({ error: 'Simulation mode is disabled in production.' });
    }

    // 1. Self-intersection check
    if (isSelfIntersecting(boundary)) {
        return res.status(400).json({ error: 'Malformed territory: path cannot intersect itself.' });
    }

    // 2. Enforce MVP sizing limits
    const { area, perimeter } = calculateAreaAndPerimeter(boundary);
    if (area > 0.5) {
        return res.status(400).json({ error: `Area exceeds MVP size limit of 0.5 km² (Current: ${area.toFixed(3)} km²)` });
    }
    if (perimeter > 5.0) {
        return res.status(400).json({ error: `Perimeter exceeds limit of 5.0 km (Current: ${perimeter.toFixed(2)} km)` });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const user = await User.findById(req.user.id).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'User not found' });
        }

        // 3. Enforce 15-minute creation cooldown
        const lastTerritory = await Territory.findOne({ owner: req.user.id })
            .sort({ createdAt: -1 })
            .session(session);
        if (lastTerritory) {
            const timeDiffMin = (Date.now() - lastTerritory.createdAt.getTime()) / (1000 * 60);
            if (timeDiffMin < 15) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    error: `Capture cooldown active. Please wait ${Math.ceil(15 - timeDiffMin)} minutes before creating another territory.`
                });
            }
        }

        // Speed check verification (unless simulated)
        if (!isSimulated) {
            try {
                validateAndLogMovement(user, lat, lng);
            } catch (err) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ error: err.message });
            }
        }

        // 4. Three-Stage Overlap Checking
        const newBox = getBoundingBox(boundary);
        
        // Stage 1: Spatial query on centroid bounding box
        const nearbyTerritories = await Territory.find({
            location: {
                $geoWithin: {
                    $box: [
                        [newBox.minLng, newBox.minLat],
                        [newBox.maxLng, newBox.maxLat]
                    ]
                }
            }
        }).session(session);

        // Stage 2 & 3: Bounding box and full edge checks
        for (const t of nearbyTerritories) {
            // Only check overlap with OTHER users' territories
            if (t.owner.toString() !== user._id.toString()) {
                const tBox = getBoundingBox(t.boundary);
                if (boxesIntersect(newBox, tBox)) {
                    if (polygonsIntersect(boundary, t.boundary)) {
                        await session.abortTransaction();
                        session.endSession();
                        return res.status(400).json({ error: 'Cannot claim territory. Overlaps with an existing claim.' });
                    }
                }
            }
        }

        // 5. Merge Adjacent Territories owned by the same user
        const turf = require('@turf/turf');
        let newPoly = turf.polygon([boundary]);
        let mergedBoundary = boundary;
        let territoriesToDelete = [];
        let maxDefenseLevel = 1;
        let maxStrength = 10;
        let mergedArea = area;
        let mergedPerimeter = perimeter;

        // Fetch all of the user's existing territories
        const myTerritories = await Territory.find({ owner: user._id }).session(session);

        for (const t of myTerritories) {
            const existingPoly = turf.polygon([t.boundary]);
            // If they touch or overlap
            if (!turf.booleanDisjoint(newPoly, existingPoly)) {
                try {
                    const unioned = turf.union(turf.featureCollection([newPoly, existingPoly]));
                    if (unioned && unioned.geometry.type === 'Polygon') {
                        newPoly = unioned;
                        mergedBoundary = unioned.geometry.coordinates[0];
                        territoriesToDelete.push(t._id);
                        
                        // Preserve the highest stats from merged fragments
                        if (t.defenseLevel > maxDefenseLevel) maxDefenseLevel = t.defenseLevel;
                        if (t.strength > maxStrength) maxStrength = t.strength;
                    }
                } catch (unionErr) {
                    console.warn('Failed to merge adjacent territories:', unionErr);
                }
            }
        }

        // Delete absorbed territory fragments
        if (territoriesToDelete.length > 0) {
            await Territory.deleteMany({ _id: { $in: territoriesToDelete } }).session(session);
            // Calculate area and perimeter of the merged shape
            const turfStats = calculateAreaAndPerimeter(mergedBoundary);
            mergedArea = turfStats.area;
            mergedPerimeter = turfStats.perimeter;
        }

        // Calculate centroid of the merged boundary
        let sumLng = 0, sumLat = 0;
        const ptsCount = mergedBoundary.length;
        mergedBoundary.forEach(coord => {
            sumLng += coord[0];
            sumLat += coord[1];
        });
        const centroidLng = sumLng / ptsCount;
        const centroidLat = sumLat / ptsCount;

        // Create/Save the territory
        const territory = new Territory({
            owner: user._id,
            boundary: mergedBoundary,
            area: parseFloat(mergedArea.toFixed(4)),
            perimeter: parseFloat(mergedPerimeter.toFixed(3)),
            defenseLevel: maxDefenseLevel,
            strength: maxStrength,
            location: {
                type: 'Point',
                coordinates: [parseFloat(centroidLng), parseFloat(centroidLat)]
            }
        });
        await territory.save({ session });

        // Update user stats
        if (!user.territoryStats) {
            user.territoryStats = { areaOwned: 0, successfulCaptures: 0, successfulDefenses: 0, longestStreak: 0, empireScore: 0 };
        }
        user.territoryStats.successfulCaptures += 1;
        user.lastCoords = { lat: parseFloat(lat), lng: parseFloat(lng) };
        await user.save({ session });

        // Recalculate user areaOwned & score
        await recalculateUserStats(user._id, session);

        // Create activity record
        const activityMsg = territoriesToDelete.length > 0 
            ? `${user.displayName} expanded and merged their territories into a larger zone`
            : `${user.displayName} created a new territory custom shape`;

        await TerritoryActivity.create([{
            userId: user._id,
            userName: user.displayName,
            userImage: user.image || '',
            type: 'capture',
            cellId: territory._id.toString(),
            message: activityMsg,
            location: {
                type: 'Point',
                coordinates: [parseFloat(centroidLng), parseFloat(centroidLat)]
            }
        }], { session });

        await session.commitTransaction();
        session.endSession();

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('activityCreated', {
                userId: user._id,
                userName: user.displayName,
                userImage: user.image || '',
                type: 'capture',
                cellId: territory._id.toString(),
                message: activityMsg,
                location: {
                    type: 'Point',
                    coordinates: [parseFloat(centroidLng), parseFloat(centroidLat)]
                },
                createdAt: new Date()
            });
            io.emit('cellCaptured', {
                cellId: territory._id.toString(),
                owner: user._id,
                ownerName: user.displayName,
                ownerImage: user.image || '',
                capturedAt: territory.createdAt
            });
        }

        res.json({
            message: territoriesToDelete.length > 0 ? 'Territories merged successfully!' : 'Territory created!',
            wasCaptured: true,
            territoryId: territory._id
        });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error('[claim error]', err);
        res.status(500).json({ error: 'Failed to capture territory.' });
    }
});

// POST /api/territory/attack/lap - Attacker records a lap completion
router.post('/attack/lap', ensureAuth, async (req, res) => {
    const { territoryId, lapsCompleted, checkpointsVisited, isSimulated } = req.body;

    if (!territoryId) {
        return res.status(400).json({ error: 'Territory ID is required.' });
    }

    if (process.env.NODE_ENV === 'production' && isSimulated) {
        return res.status(403).json({ error: 'Simulation mode is disabled in production.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const territory = await Territory.findById(territoryId).session(session);
        if (!territory) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Territory not found.' });
        }

        // Self-attacking prevention
        if (territory.owner.toString() === req.user.id) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Cannot attack your own territory. Visit it to maintain it.' });
        }

        // Get updated defense level (decays inside)
        updateCellDefenseAndDecay(territory);

        // Find or create TerritoryAttack profile
        let attack = await TerritoryAttack.findOne({ territoryId, attackerId: req.user.id }).session(session);
        if (!attack) {
            attack = new TerritoryAttack({
                territoryId,
                attackerId: req.user.id,
                attackerName: req.user.displayName,
                lapsCompleted: 0,
                checkpointsVisited: checkpointsVisited || []
            });
        } else {
            attack.lapsCompleted = lapsCompleted !== undefined ? lapsCompleted : attack.lapsCompleted;
            if (checkpointsVisited) {
                attack.checkpointsVisited = checkpointsVisited;
            }
        }

        // Explicitly update updatedAt to refresh MongoDB 24h TTL
        attack.updatedAt = new Date();
        await attack.save({ session });

        // Update territory status to under_attack
        if (territory.status !== 'under_attack') {
            territory.status = 'under_attack';
            await territory.save({ session });
        }

        const requiredLaps = territory.defenseLevel;
        const io = req.app.get('io');

        // Check if attack is complete
        if (attack.lapsCompleted >= requiredLaps) {
            // Ownership transfer
            const oldOwnerId = territory.owner;
            const newOwner = await User.findById(req.user.id).session(session);
            const oldOwnerObj = await User.findById(oldOwnerId).session(session);
            
            // Push old owner to history
            const ownershipSeconds = Math.round((Date.now() - territory.createdAt.getTime()) / 1000);
            
            territory.captureHistory.push({
                owner: oldOwnerId,
                ownerName: oldOwnerObj?.displayName || 'Unknown',
                capturedAt: territory.createdAt,
                duration: ownershipSeconds
            });
            if (territory.captureHistory.length > 50) {
                territory.captureHistory = territory.captureHistory.slice(-50);
            }

            // Assign new owner
            territory.owner = newOwner._id;
            territory.createdAt = new Date();
            territory.lastVisitedAt = new Date();
            territory.strength = 10;
            territory.defenseLevel = 1;
            territory.status = 'active';
            territory.battlesCount += 1;
            await territory.save({ session });

            // Update stats
            if (!newOwner.territoryStats) {
                newOwner.territoryStats = { areaOwned: 0, successfulCaptures: 0, successfulDefenses: 0, longestStreak: 0, empireScore: 0 };
            }
            newOwner.territoryStats.successfulCaptures += 1;
            await newOwner.save({ session });
            await recalculateUserStats(newOwner._id, session);

            if (oldOwnerObj) {
                if (!oldOwnerObj.territoryStats) {
                    oldOwnerObj.territoryStats = { areaOwned: 0, successfulCaptures: 0, successfulDefenses: 0, longestStreak: 0, empireScore: 0 };
                }
                await oldOwnerObj.save({ session });
                await recalculateUserStats(oldOwnerObj._id, session);
            }

            // Delete all TerritoryAttack documents for this territory
            await TerritoryAttack.deleteMany({ territoryId }).session(session);

            // Activity feed
            const activityMsg = `${newOwner.displayName} conquered a territory from ${oldOwnerObj?.displayName || 'Unknown'} after completing ${requiredLaps} laps`;
            await TerritoryActivity.create([{
                userId: newOwner._id,
                userName: newOwner.displayName,
                userImage: newOwner.image || '',
                type: 'steal',
                cellId: territory._id.toString(),
                message: activityMsg,
                location: territory.location
            }], { session });

            // Push notification
            const notificationMsg = `${newOwner.displayName} stole your territory after completing ${requiredLaps} laps.`;
            await Notification.create([{
                userId: oldOwnerId,
                type: 'steal',
                message: notificationMsg
            }], { session });

            await session.commitTransaction();
            session.endSession();

            // Sockets
            if (io) {
                io.emit('activityCreated', {
                    userId: newOwner._id,
                    userName: newOwner.displayName,
                    userImage: newOwner.image || '',
                    type: 'steal',
                    cellId: territory._id.toString(),
                    message: activityMsg,
                    location: territory.location,
                    createdAt: new Date()
                });
                io.emit('cellCaptured', {
                    cellId: territory._id.toString(),
                    owner: newOwner._id,
                    ownerName: newOwner.displayName,
                    ownerImage: newOwner.image || '',
                    capturedAt: territory.createdAt
                });
                io.emit('territoryStolen', {
                    targetUserId: oldOwnerId.toString(),
                    message: `${newOwner.displayName} stole your territory!`
                });
            }

            return res.json({
                message: 'Territory conquered successfully!',
                wasCaptured: true,
                lapsCompleted: attack.lapsCompleted,
                requiredLaps
            });
        } else {
            await session.commitTransaction();
            session.endSession();

            if (io) {
                io.emit('attackProgress', {
                    territoryId: territory._id.toString(),
                    attackerName: attack.attackerName,
                    lapsCompleted: attack.lapsCompleted,
                    requiredLaps
                });
            }

            return res.json({
                message: `Lap ${attack.lapsCompleted} registered.`,
                wasCaptured: false,
                lapsCompleted: attack.lapsCompleted,
                requiredLaps
            });
        }
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error('[attack lap error]', err);
        res.status(500).json({ error: 'Failed to record lap.' });
    }
});

// GET /api/territory/territories/:territoryId/stats - Dynamic stats profile card lookup
router.get('/territories/:territoryId/stats', ensureAuth, async (req, res) => {
    try {
        const { territoryId } = req.params;
        const territory = await Territory.findById(territoryId)
            .populate('owner', 'displayName image territoryStats')
            .lean();
        
        if (!territory) {
            return res.status(404).json({ error: 'Territory not found.' });
        }

        // Apply dynamic defense levels and decay calculations
        const updated = updateCellDefenseAndDecay(territory);

        // Compute dynamic ranking: sort all users who own at least 1 cell by score
        const allEmpireUsers = await User.find({ 'territoryStats.areaOwned': { $gt: 0 } }, '_id territoryStats')
            .sort({ 'territoryStats.empireScore': -1 })
            .lean();
        
        const ownerIndex = allEmpireUsers.findIndex(u => u._id.toString() === territory.owner?._id.toString());
        const dynamicRank = ownerIndex !== -1 ? ownerIndex + 1 : null;

        // Count ongoing attackers
        const activeAttacksCount = await TerritoryAttack.countDocuments({ territoryId });

        res.json({
            territory: {
                territoryId: territory._id,
                area: updated.area,
                perimeter: updated.perimeter,
                defenseLevel: updated.defenseLevel,
                strength: updated.strength,
                status: updated.status,
                createdAt: updated.createdAt,
                lastVisitedAt: updated.lastVisitedAt,
                battlesCount: updated.battlesCount,
                territoryType: updated.territoryType,
                activeAttacksCount
            },
            owner: {
                userId: territory.owner?._id || null,
                displayName: territory.owner?.displayName || 'Unknown',
                image: territory.owner?.image || '',
                areaOwned: territory.owner?.territoryStats?.areaOwned || 0,
                empireScore: territory.owner?.territoryStats?.empireScore || 0,
                successfulCaptures: territory.owner?.territoryStats?.successfulCaptures || 0,
                successfulDefenses: territory.owner?.territoryStats?.successfulDefenses || 0,
                rank: dynamicRank
            }
        });
    } catch (err) {
        console.error('[territory stats query error]', err);
        res.status(500).json({ error: 'Failed to inspect territory.' });
    }
});

// GET /api/territory/inspect/:cellId - Backwards compatible legacy redirect for client pages
router.get('/inspect/:cellId', ensureAuth, async (req, res) => {
    try {
        const { cellId } = req.params;
        const territory = await Territory.findById(cellId)
            .populate('owner', 'displayName image territoryStats')
            .lean();
        
        if (!territory) {
            return res.json({ cell: null, owner: null });
        }

        const updated = updateCellDefenseAndDecay(territory);

        const allEmpireUsers = await User.find({ 'territoryStats.areaOwned': { $gt: 0 } }, '_id territoryStats')
            .sort({ 'territoryStats.empireScore': -1 })
            .lean();
        
        const ownerIndex = allEmpireUsers.findIndex(u => u._id.toString() === territory.owner?._id.toString());
        const dynamicRank = ownerIndex !== -1 ? ownerIndex + 1 : null;

        res.json({
            cell: {
                cellId: territory._id.toString(),
                strength: updated.strength,
                defenseLevel: updated.defenseLevel,
                lastVisitedAt: updated.lastVisitedAt || updated.createdAt,
                battlesCount: updated.battlesCount || 0,
                capturedAt: updated.createdAt,
                area: updated.area,
                perimeter: updated.perimeter,
                boundary: updated.boundary,
                status: updated.status
            },
            owner: {
                userId: territory.owner?._id || null,
                displayName: territory.owner?.displayName || 'Unknown',
                image: territory.owner?.image || '',
                cellsCount: territory.owner?.territoryStats?.areaOwned ? Math.ceil(territory.owner.territoryStats.areaOwned / 0.015) : 0, // Fallback cell count representation
                areaKm2: territory.owner?.territoryStats?.areaOwned || 0,
                empireScore: territory.owner?.territoryStats?.empireScore || 0,
                successfulCaptures: territory.owner?.territoryStats?.successfulCaptures || 0,
                successfulDefenses: territory.owner?.territoryStats?.successfulDefenses || 0,
                rank: dynamicRank
            }
        });
    } catch (err) {
        console.error('[territory inspect legacy error]', err);
        res.status(500).json({ error: 'Failed to inspect cell.' });
    }
});

// GET /api/territory/contested - Retrieve most contested territories sorted by battlesCount
router.get('/contested', ensureAuth, async (req, res) => {
    try {
        const territories = await Territory.find({})
            .sort({ battlesCount: -1 })
            .limit(10)
            .populate('owner', 'displayName image')
            .lean();

        const formatted = territories.map(t => ({
            territoryId: t._id,
            area: t.area,
            perimeter: t.perimeter,
            battlesCount: t.battlesCount,
            ownerName: t.owner?.displayName || 'Unknown',
            ownerImage: t.owner?.image || '',
            territoryType: t.territoryType,
            status: t.status
        }));

        res.json(formatted);
    } catch (err) {
        console.error('[contested fetch error]', err);
        res.status(500).json({ error: 'Failed to fetch contested leaderboard.' });
    }
});

// GET /api/territory/leaderboard - Return territory leaderboard based on sortBy
router.get('/leaderboard', ensureAuth, async (req, res) => {
    try {
        const { sortBy = 'empireScore' } = req.query;

        const validSortFields = {
            empireScore: 'empireScore',
            areaOwned: 'areaOwned',
            captures: 'successfulCaptures',
            defenses: 'successfulDefenses'
        };

        const sortKey = validSortFields[sortBy] || 'empireScore';

        // Fetch counts/areas directly from User to get latest stats
        const users = await User.find({}, 'displayName image territoryStats').lean();

        const ranked = users.map(u => {
            const areaOwned = u.territoryStats?.areaOwned || 0;
            const captures = u.territoryStats?.successfulCaptures || 0;
            const defenses = u.territoryStats?.successfulDefenses || 0;
            const streak = u.territoryStats?.longestStreak || 0;
            // Calculate dynamic empireScore: (areaOwned * 15) + (captures * 5) + (defenses * 3) + (streak * 10)
            const empireScore = Math.round((areaOwned * 15) + (captures * 5) + (defenses * 3) + (streak * 10));
            return {
                userId: u._id,
                displayName: u.displayName,
                image: u.image || '',
                cellsCount: areaOwned > 0 ? Math.ceil(areaOwned / 0.015) : 0, // Fallback mapping for leaderboard display columns
                areaKm2: areaOwned,
                areaOwned,
                empireScore,
                successfulCaptures: captures,
                successfulDefenses: defenses
            };
        });

        // Filter out users with 0 area owned
        let filteredRanked = ranked.filter(r => r.areaOwned > 0);

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
            leaderboard: filteredRanked.slice(0, 50),
            currentUser: currentUserRankInfo || null
        });
    } catch (err) {
        console.error('[territory leaderboard fetch error]', err);
        res.status(500).json({ error: 'Failed to fetch leaderboard.' });
    }
});

// GET /api/territory/leaderboard/active - Return most active players today
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
                        [west, south],
                        [east, north]
                    ]
                }
            };
        }

        let activities = await TerritoryActivity.find(query)
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

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

module.exports = router;
