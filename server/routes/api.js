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



// GET Trip History
router.get('/history', ensureAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        
        const formattedTrips = user.tripHistory.map(trip => ({
            ...trip.toObject()
        }));
        
        res.json(formattedTrips.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
        console.error('Get history error:', err.message);
        res.status(500).json({ error: 'Failed to fetch trip history' });
    }
});

// POST Save Trip - SINGLE DEFINITION WITH ROBUST VALIDATION
router.post('/history', ensureAuth, async (req, res) => {
    console.log('Received trip data:', req.body);
    
    const { 
        originName, destinationName, originCoords, destinationCoords, 
        mode, distance, duration, co2Saved, calories 
    } = req.body;

    // Flexible validation - allow missing optional fields
    const validationErrors = [];
    
    if (!originName || typeof originName !== 'string' || originName.trim().length === 0) {
        validationErrors.push('Origin name is required');
    }
    
    if (!destinationName || typeof destinationName !== 'string' || destinationName.trim().length === 0) {
        validationErrors.push('Destination name is required');
    }
    
    if (!mode || typeof mode !== 'string' || mode.trim().length === 0) {
        validationErrors.push('Transport mode is required');
    }
    
    if (distance === undefined || distance === null || isNaN(parseFloat(distance))) {
        validationErrors.push('Valid distance is required');
    }
    
    if (duration === undefined || duration === null || isNaN(parseInt(duration))) {
        validationErrors.push('Valid duration is required');
    }
    
    if (co2Saved === undefined || co2Saved === null || isNaN(parseFloat(co2Saved))) {
        validationErrors.push('Valid CO2 saved value is required');
    }

    // Validate coordinates with more flexibility
    const validateCoords = (coords, name) => {
        if (!coords || typeof coords !== 'object') {
            validationErrors.push(`${name} coordinates are required`);
            return false;
        }
        
        const lat = parseFloat(coords.lat);
        const lng = parseFloat(coords.lng);
        
        if (isNaN(lat) || isNaN(lng)) {
            validationErrors.push(`Valid ${name} coordinates are required`);
            return false;
        }
        
        // Reasonable lat/lng ranges
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            validationErrors.push(`${name} coordinates out of valid range`);
            return false;
        }
        
        return true;
    };
    
    validateCoords(originCoords, 'Origin');
    validateCoords(destinationCoords, 'Destination');

    if (validationErrors.length > 0) {
        console.log('Validation errors:', validationErrors);
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: validationErrors 
        });
    }

    // Create the trip object with proper sanitization
    const newTrip = { 
        originName: originName.trim(), 
        destinationName: destinationName.trim(), 
        originCoords: {
            lat: parseFloat(originCoords.lat),
            lng: parseFloat(originCoords.lng)
        },
        destinationCoords: {
            lat: parseFloat(destinationCoords.lat),
            lng: parseFloat(destinationCoords.lng)
        },
        mode: mode.trim().toLowerCase(),
        distance: Math.max(parseFloat(distance), 0),
        duration: Math.max(parseInt(duration), 0),
        co2Saved: Math.max(parseFloat(co2Saved), 0),
        calories: Math.max(parseInt(calories) || 0, 0),
        date: new Date()
    };

    console.log('Processed trip data:', newTrip);

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            console.log('User not found:', req.user.id);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Initialize tripHistory if it doesn't exist
        if (!user.tripHistory) {
            user.tripHistory = [];
        }
        
        // Add trip to the beginning
        user.tripHistory.unshift(newTrip);
        
        // Keep only last 100 trips
        if (user.tripHistory.length > 100) {
            user.tripHistory = user.tripHistory.slice(0, 100);
        }
        
        // Update aggregated stats if method exists
        if (typeof user.updateAggregatedStats === 'function') {
            user.updateAggregatedStats();
        }
        
        await user.save();
        
        console.log('Trip saved successfully for user:', req.user.id);
        
        res.status(201).json({ 
            message: 'Trip saved successfully', 
            trip: user.tripHistory[0],
            totalTrips: user.tripHistory.length
        });
    } catch (err) {
        console.error('Error saving trip:', err);
        
        // Handle specific MongoDB errors
        if (err.name === 'ValidationError') {
            const validationErrors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ 
                error: 'Trip data validation failed', 
                details: validationErrors 
            });
        }
        
        if (err.name === 'CastError') {
            return res.status(400).json({ 
                error: 'Invalid data format provided' 
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to save trip due to server error. Please try again.' 
        });
    }
});

// DELETE Trip History
router.delete('/history', ensureAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.tripHistory = [];
        await user.save();
        
        res.json({ message: 'Trip history cleared successfully' });
    } catch (err) {
        console.error('Clear history error:', err.message);
        res.status(500).json({ error: 'Failed to clear history' });
    }
});

// ==================== ROUTE PLANNING ENDPOINT ====================

router.post('/route', ensureAuth, async (req, res) => {
    const { origin, destination, transportModes } = req.body;
    
    console.log('Route request received:', { origin, destination, transportModes });
    
    // Validation
    if (!origin || !destination) {
        return res.status(400).json({ error: 'Both origin and destination are required.' });
    }
    
    if (!origin.coordinates || !destination.coordinates) {
        return res.status(400).json({ error: 'Origin and destination coordinates are required.' });
    }

    if (!Array.isArray(origin.coordinates) || origin.coordinates.length !== 2) {
        return res.status(400).json({ error: 'Invalid origin coordinates format.' });
    }

    if (!Array.isArray(destination.coordinates) || destination.coordinates.length !== 2) {
        return res.status(400).json({ error: 'Invalid destination coordinates format.' });
    }

    if (!transportModes || !Array.isArray(transportModes) || transportModes.length === 0) {
        return res.status(400).json({ error: 'At least one transport mode is required.' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const preferences = user.preferences || {};

        const profileMap = {
            'walking': { profile: 'walking', mode: 'walking' },
            'cycling': { profile: 'cycling', mode: 'cycling' },
            'driving': { profile: 'driving-traffic', mode: 'driving' },
            'transit': { profile: 'driving', mode: 'transit' }
        };

        const profiles = transportModes
            .filter(mode => profileMap[mode.toLowerCase()])
            .map(mode => profileMap[mode.toLowerCase()]);

        if (profiles.length === 0) {
            return res.status(400).json({ error: 'No valid transport modes selected.' });
        }

        console.log('Valid profiles to process:', profiles);

        const routePromises = profiles.map(async ({ profile, mode }) => {
            try {
                console.log(`Requesting ${profile} route from Mapbox...`);
                
                const response = await directionsService.getDirections({
                    profile,
                    geometries: 'geojson',
                    steps: true,
                    overview: 'full',
                    alternatives: true,
                    annotations: ['distance', 'duration'],
                    waypoints: [
                        { coordinates: origin.coordinates }, 
                        { coordinates: destination.coordinates }
                    ]
                }).send();
                
                console.log(`${profile} response status:`, response.statusCode);
                return { response, mode };
            } catch (err) {
                console.error(`Error with ${profile}:`, err.message);
                return { response: null, mode, error: err.message };
            }
        });

        const results = await Promise.all(routePromises);
        console.log('All route requests completed');
        
        const suggestedRoutes = [];
        
        results.forEach(({ response, mode, error }) => {
            if (error) {
                console.log(`Skipping ${mode} due to error:`, error);
                return;
            }
            
            if (!response || !response.body.routes || response.body.routes.length === 0) {
                console.log(`No routes found for ${mode}`);
                return;
            }
            
            const routes = response.body.routes.slice(0, 2);
            
            routes.forEach((route, routeIndex) => {
                try {
                    const leg = route.legs[0];
                    if (!leg) {
                        console.log(`No leg data for ${mode} route ${routeIndex}`);
                        return;
                    }
                    
                    const emissionFactors = { 
                        driving: 0.21,
                        cycling: 0.0,
                        walking: 0.0,
                        transit: 0.04
                    };
                    
                    const distanceKm = (route.distance || 0) / 1000;
                    const durationMin = Math.round((route.duration || 0) / 60);
                    
                    if (distanceKm < 0.2) {
                        console.log(`Skipping very short ${mode} route: ${distanceKm}km`);
                        return;
                    }
                    
                    const drivingEmissions = distanceKm * emissionFactors.driving;
                    const modeEmissions = distanceKm * (emissionFactors[mode] || 0);
                    const co2Saved = Math.max(drivingEmissions - modeEmissions, 0);

                    if (mode === 'walking' && preferences.maxWalkingDistance && distanceKm > preferences.maxWalkingDistance) {
                        console.log(`Walking route too long: ${distanceKm}km > ${preferences.maxWalkingDistance}km`);
                        return;
                    }
                    
                    if (mode === 'cycling' && preferences.maxCyclingDistance && distanceKm > preferences.maxCyclingDistance) {
                        console.log(`Cycling route too long: ${distanceKm}km > ${preferences.maxCyclingDistance}km`);
                        return;
                    }

                    const detailedSteps = (leg.steps || []).map(step => ({
                        instruction: step.maneuver?.instruction || 'Continue',
                        distance: step.distance || 0,
                        duration: step.duration || 0,
                        type: step.maneuver?.type || 'continue'
                    }));

                    const routeName = routeIndex === 0 ? 
                        `${getModeName(mode)} Route` :
                        `${getModeName(mode)} Alternative`;

                    const routeData = {
                        id: `${mode}-${routeIndex}-${Date.now()}`,
                        name: routeName,
                        mode: mode,
                        distance: distanceKm.toFixed(1),
                        duration: durationMin,
                        co2Saved: co2Saved.toFixed(2),
                        geometry: route.geometry,
                        steps: detailedSteps,
                        calories: calculateCalories(mode, distanceKm, durationMin),
                        difficulty: getDifficultyLevel(mode, distanceKm, durationMin),
                        cost: calculateCost(mode, distanceKm),
                        estimatedArrival: getEstimatedArrival(durationMin),
                        weather_suitability: getWeatherSuitability(mode)
                    };
                    
                    console.log(`Added ${mode} route:`, routeData.name);
                    suggestedRoutes.push(routeData);
                } catch (routeError) {
                    console.error(`Error processing ${mode} route ${routeIndex}:`, routeError);
                }
            });
        });

        console.log(`Total routes generated: ${suggestedRoutes.length}`);

        if (suggestedRoutes.length === 0) {
            return res.status(404).json({ 
                error: 'No routes found for the selected criteria. Please try different locations or transport modes.' 
            });
        }

        // Sort routes
        const sortedRoutes = suggestedRoutes.sort((a, b) => {
            if (preferences.sustainabilityPriority === 'Eco First') {
                return parseFloat(b.co2Saved) - parseFloat(a.co2Saved);
            } else if (preferences.sustainabilityPriority === 'Speed First') {
                return a.duration - b.duration;
            }
            return (parseFloat(b.co2Saved) * 0.5) - (a.duration * 0.01);
        });

        console.log('Returning sorted routes:', sortedRoutes.length);
        res.json(sortedRoutes.slice(0, 8));
        
    } catch (error) {
        console.error("Route planning error:", error);
        
        if (error.response) {
            console.error("Mapbox API error:", error.response.data);
            return res.status(500).json({ 
                error: 'External mapping service is currently unavailable. Please try again later.' 
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to fetch routes due to server error. Please try again.' 
        });
    }
});

// Helper functions
function getModeName(mode) {
    const modeNames = {
        'walking': 'Walking',
        'cycling': 'Cycling', 
        'driving': 'Driving',
        'transit': 'Public Transit'
    };
    return modeNames[mode?.toLowerCase()] || 'Mixed';
}

function calculateCalories(mode, distance, duration) {
    try {
        if (mode === 'walking') return Math.round(distance * 60);
        if (mode === 'cycling') return Math.round(distance * 45);
        return 0;
    } catch (error) {
        console.error('Error calculating calories:', error);
        return 0;
    }
}

function getDifficultyLevel(mode, distance, duration) {
    try {
        if (mode === 'driving' || mode === 'transit') return 'Easy';
        if (mode === 'walking') {
            if (distance < 1) return 'Easy';
            if (distance < 3) return 'Moderate';
            return 'Challenging';
        }
        if (mode === 'cycling') {
            if (distance < 3) return 'Easy';
            if (distance < 8) return 'Moderate';
            return 'Challenging';
        }
        return 'Moderate';
    } catch (error) {
        console.error('Error determining difficulty:', error);
        return 'Moderate';
    }
}

function calculateCost(mode, distance) {
    try {
        if (mode === 'driving') return Math.round(distance * 8);
        if (mode === 'transit') return Math.min(Math.max(distance * 3, 10), 50);
        return 0;
    } catch (error) {
        console.error('Error calculating cost:', error);
        return 0;
    }
}

function getEstimatedArrival(durationMin) {
    try {
        const arrival = new Date(new Date().getTime() + durationMin * 60000);
        return arrival.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
        });
    } catch (error) {
        console.error('Error calculating arrival time:', error);
        return 'Unknown';
    }
}

function getWeatherSuitability(mode) {
    if (mode === 'walking' || mode === 'cycling') return 'weather_dependent';
    return 'weather_independent';
}



// Weather API
router.get('/weather', ensureAuth, async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'Latitude and Longitude are required.' });
    
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHERMAP_API_KEY}&units=metric`;
    
    try {
        const weatherResponse = await fetch(url);
        const weatherData = await weatherResponse.json();
        
        if (weatherResponse.ok) {
            res.json(weatherData);
        } else {
            res.status(weatherResponse.status).json({ error: 'Weather service unavailable' });
        }
    } catch (error) {
        console.error('Weather API error:', error);
        res.status(500).json({ error: 'Failed to fetch weather data.' });
    }
});

// Preferences API
router.get('/preferences', ensureAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const defaultPreferences = {
            transportModes: ['Walking', 'Cycling', 'Driving'],
            maxWalkingDistance: 5,
            maxCyclingDistance: 20,
            sustainabilityPriority: 'Balanced',
            monthlyGoal: 60
        };
        
        res.json({ ...defaultPreferences, ...user.preferences });
    } catch (err) {
        console.error('Error fetching preferences:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/preferences',
    ensureAuth,
    [
        body('maxWalkingDistance').optional().isNumeric(),
        body('maxCyclingDistance').optional().isNumeric(),
        body('monthlyGoal').optional().isNumeric(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        try {
            const user = await User.findByIdAndUpdate(
                req.user.id, 
                { $set: { preferences: req.body } }, 
                { new: true }
            );
            res.json(user.preferences);
        } catch (err) {
            console.error('Error updating preferences:', err);
            res.status(500).json({ error: 'Server error' });
        }
    }
);

// Theme API
router.post('/theme', ensureAuth, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { theme: req.body.theme });
        res.json({ message: 'Theme updated successfully' });
    } catch(err) {
        console.error('Theme update error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// User Profile API
router.get('/profile', ensureAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/profile', ensureAuth, async (req, res) => {
    try {
        const { displayName, email } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { displayName, email },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Stats API
router.get('/stats', ensureAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const trips = user.tripHistory || [];
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const stats = {
            today: { co2Saved: 0, trips: 0, distance: 0, calories: 0 },
            week: { co2Saved: 0, trips: 0, distance: 0, calories: 0 },
            month: { co2Saved: 0, trips: 0, distance: 0, calories: 0 },
            allTime: { co2Saved: 0, trips: 0, distance: 0, calories: 0 }
        };
        
        trips.forEach(trip => {
            const tripDate = new Date(trip.date);
            const co2 = parseFloat(trip.co2Saved) || 0;
            const distance = parseFloat(trip.distance) || 0;
            const calories = parseInt(trip.calories) || 0;
            
            stats.allTime.co2Saved += co2;
            stats.allTime.trips += 1;
            stats.allTime.distance += distance;
            stats.allTime.calories += calories;
            
            if (tripDate >= today) {
                stats.today.co2Saved += co2;
                stats.today.trips += 1;
                stats.today.distance += distance;
                stats.today.calories += calories;
            }
            
            if (tripDate >= startOfWeek) {
                stats.week.co2Saved += co2;
                stats.week.trips += 1;
                stats.week.distance += distance;
                stats.week.calories += calories;
            }
            
            if (tripDate >= startOfMonth) {
                stats.month.co2Saved += co2;
                stats.month.trips += 1;
                stats.month.distance += distance;
                stats.month.calories += calories;
            }
        });
        
        res.json(stats);
    } catch (err) {
        console.error('Stats error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
