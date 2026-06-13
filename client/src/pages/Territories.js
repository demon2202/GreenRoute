import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import mapboxgl from 'mapbox-gl';
import { io } from 'socket.io-client';
import 'mapbox-gl/dist/mapbox-gl.css';
import './Territories.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_API_KEY;

// Dynamic HSL color matching user schema (generates unique color for every user)
const getOwnerColor = (ownerId) => {
    if (!ownerId) return '#64748b'; // Slate gray fallback

    const idStr = ownerId.toString();
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) {
        hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 85%, 52%)`;
};

// Calculate distance between two coordinates in meters (Haversine)
const getDistance = (coord1, coord2) => {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
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
};

// Detect closed loops within walked path
const checkLoop = (path) => {
    if (path.length < 4) return null;
    const lastPoint = path[path.length - 1];
    
    // Look for a close point in the history (skipping the last 3 points)
    for (let i = 0; i < path.length - 3; i++) {
        const prevPoint = path[i];
        const dist = getDistance(lastPoint, prevPoint);
        if (dist < 20) { // Within 20 meters
            let pathDist = 0;
            for (let j = i; j < path.length - 1; j++) {
                pathDist += getDistance(path[j], path[j+1]);
            }
            if (pathDist >= 100) { // Walked distance validation (at least 100 meters)
                return {
                    loopStartIndex: i,
                    loopCoords: path.slice(i)
                };
            }
        }
    }
    return null;
};

// Ray-casting Point-in-Polygon check
const isPointInPolygon = (point, polygon) => {
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
};

const Territories = ({ user, theme }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const socket = useRef(null);
    const watchIdRef = useRef(null);
    const userMarkerRef = useRef(null);
    const territoryMarkersRef = useRef({});

    const [mobileExpanded, setMobileExpanded] = useState(false);

    // Grid and capture states
    const [cells, setCells] = useState([]);
    const [activities, setActivities] = useState([]);
    const [isTracking, setIsTracking] = useState(false);
    const [currentCoords, setCurrentCoords] = useState(null);
    const [inspectedCell, setInspectedCell] = useState(null);
    
    // Path capturing states
    const [activePath, setActivePath] = useState([]);
    
    // Attack conquest state machine
    const [currentAttackCell, setCurrentAttackCell] = useState(null);
    const [attackLapsCompleted, setAttackLapsCompleted] = useState(0);
    const [attackCheckpoints, setAttackCheckpoints] = useState([]);
    const [attackVisitedCheckpoints, setAttackVisitedCheckpoints] = useState([]);

    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Dynamic user territoryStats tracking
    const [userStats, setUserStats] = useState(user?.territoryStats || { areaOwned: 0, empireScore: 0 });

    const fetchUserStats = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/auth/current_user');
            if (data && data.territoryStats) {
                setUserStats(data.territoryStats);
            }
        } catch (err) {
            console.error('Error fetching user stats:', err);
        }
    }, []);

    useEffect(() => {
        fetchUserStats();
    }, [fetchUserStats]);

    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    const themeRef = useRef(theme);
    useEffect(() => { themeRef.current = theme; }, [theme]);

    const cellsRef = useRef([]);
    useEffect(() => { cellsRef.current = cells; }, [cells]);

    // Fetch territories inside active viewport bounds
    const fetchVisibleCells = useCallback(async () => {
        if (!map.current) return;
        try {
            const bounds = map.current.getBounds();
            const boundsStr = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
            const { data } = await axios.get(`/api/territory/territories?bounds=${boundsStr}`);
            setCells(data.cells || []);
        } catch (err) {
            console.error('Error loading territories:', err);
        }
    }, []);

    const fetchActivities = useCallback(async () => {
        if (!map.current) return;
        try {
            const bounds = map.current.getBounds();
            const boundsStr = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
            const { data } = await axios.get(`/api/territory/activity?bounds=${boundsStr}`);
            setActivities(data || []);
        } catch (err) {
            console.error('Error loading activity feed:', err);
        }
    }, []);

    const debounceTimerRef = useRef(null);
    const handleBoundsChange = useCallback(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            fetchVisibleCells();
            fetchActivities();
        }, 300);
    }, [fetchVisibleCells, fetchActivities]);

    // Update active walked path drawing on the map
    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded()) return;
        const source = map.current.getSource('active-path');
        if (!source) return;

        if (activePath.length < 2) {
            source.setData({ type: 'FeatureCollection', features: [] });
            return;
        }

        source.setData({
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: activePath
                }
            }]
        });
    }, [activePath]);

    // Update checkpoint visualization on the map during attacks
    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded()) return;
        const source = map.current.getSource('attack-checkpoints');
        if (!source) return;

        if (!currentAttackCell || attackCheckpoints.length === 0) {
            source.setData({ type: 'FeatureCollection', features: [] });
            return;
        }

        const features = attackCheckpoints.map((pt, index) => ({
            type: 'Feature',
            properties: {
                visited: !!attackVisitedCheckpoints[index]
            },
            geometry: {
                type: 'Point',
                coordinates: pt
            }
        }));

        source.setData({
            type: 'FeatureCollection',
            features
        });
    }, [currentAttackCell, attackCheckpoints, attackVisitedCheckpoints]);

    // Draw active territories
    const redrawCells = useCallback(() => {
        if (!map.current || !map.current.isStyleLoaded()) return;

        const cellSource = map.current.getSource('grid-cells');
        const borderSource = map.current.getSource('empire-borders');
        if (!cellSource || !borderSource) return;

        const cellFeatures = cellsRef.current.map(cell => {
            const coords = cell.boundary;
            const isMe = cell.owner?._id === userRef.current?._id || cell.owner === userRef.current?._id;
            const color = getOwnerColor(cell.owner?._id || cell.owner, isMe);

            return {
                type: 'Feature',
                properties: {
                    cellId: cell._id || cell.cellId,
                    color: color
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [coords]
                }
            };
        });

        cellSource.setData({
            type: 'FeatureCollection',
            features: cellFeatures
        });

        // Map individual borders
        const borderFeatures = cellsRef.current.map(cell => {
            const coords = cell.boundary;
            const isMe = cell.owner?._id === userRef.current?._id || cell.owner === userRef.current?._id;
            const color = getOwnerColor(cell.owner?._id || cell.owner, isMe);

            return {
                type: 'Feature',
                properties: {
                    ownerId: cell.owner?._id || cell.owner,
                    ownerName: cell.ownerName || 'Empire Owner',
                    color: color
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [coords]
                }
            };
        });

        borderSource.setData({
            type: 'FeatureCollection',
            features: borderFeatures
        });
    }, []);

    useEffect(() => {
        cellsRef.current = cells;
        redrawCells();
    }, [cells, redrawCells]);

    // Handle drawing and updating owner avatar markers at centroid coordinates
    useEffect(() => {
        if (!map.current) return;

        const currentCellIds = new Set(cells.map(cell => cell._id || cell.cellId));

        // Clean up markers for cells that are no longer in the list
        Object.keys(territoryMarkersRef.current).forEach(cellId => {
            if (!currentCellIds.has(cellId)) {
                territoryMarkersRef.current[cellId].remove();
                delete territoryMarkersRef.current[cellId];
            }
        });

        // Add or update markers for current cells
        cells.forEach(cell => {
            const cellId = cell._id || cell.cellId;
            const centroid = cell.location?.coordinates;
            if (!centroid || centroid.length < 2) return;

            const ownerId = cell.owner?._id || cell.owner;
            const ownerName = cell.ownerName || cell.owner?.displayName || 'Unknown';
            const ownerImage = cell.ownerImage || cell.owner?.image;
            const isMe = ownerId === userRef.current?._id;
            const color = getOwnerColor(ownerId, isMe);

            if (territoryMarkersRef.current[cellId]) {
                territoryMarkersRef.current[cellId].setLngLat(centroid);
            } else {
                const el = document.createElement('div');
                el.className = 'territory-avatar-marker';
                el.style.borderColor = color;
                el.style.boxShadow = `0 4px 12px ${color}50`;

                if (ownerImage) {
                    const img = document.createElement('img');
                    img.src = ownerImage;
                    img.alt = ownerName;
                    img.className = 'territory-marker-img';
                    el.appendChild(img);
                } else {
                    const fallback = document.createElement('div');
                    fallback.className = 'territory-marker-fallback';
                    fallback.style.backgroundColor = color;
                    fallback.innerText = ownerName.charAt(0).toUpperCase();
                    el.appendChild(fallback);
                }

                const popup = new mapboxgl.Popup({ offset: 22, closeButton: false })
                    .setHTML(`
                        <div style="font-family: 'Outfit', sans-serif; padding: 4px; text-align: center;">
                            <strong style="color: ${color}; font-size: 0.88rem; display: block; margin-bottom: 2px;">
                                ${ownerName}
                            </strong>
                            <span style="font-size: 0.76rem; color: #64748b;">
                                Area: ${(cell.area || 0).toFixed(4)} km²
                            </span>
                        </div>
                    `);

                // Prevent marker click propagation and load territory stats directly
                el.addEventListener('click', async (evt) => {
                    evt.stopPropagation();
                    try {
                        const { data } = await axios.get(`/api/territory/territories/${cellId}/stats`);
                        if (data) {
                            setInspectedCell(data);
                        }
                    } catch (err) {
                        console.error(err);
                    }
                });

                const marker = new mapboxgl.Marker({ element: el })
                    .setLngLat(centroid)
                    .setPopup(popup)
                    .addTo(map.current);

                territoryMarkersRef.current[cellId] = marker;
            }
        });
    }, [cells]);

    // Submit territory capture request
    const submitClaim = useCallback(async (lat, lng, boundary, isSim = false) => {
        try {
            const { data } = await axios.post('/api/territory/claim', {
                lat,
                lng,
                boundary,
                isSimulated: isSim
            });

            if (data.wasCaptured) {
                setSuccessMsg(`Successfully captured new territory!`);
                setActivePath([]);
                fetchUserStats();
            } else {
                setSuccessMsg(data.message);
            }
            setTimeout(() => setSuccessMsg(''), 3000);
            fetchVisibleCells();
            fetchActivities();
        } catch (err) {
            console.error('Error claiming territory:', err);
            const msg = err.response?.data?.error || 'Failed to claim territory.';
            setErrorMsg(msg);
            setTimeout(() => setErrorMsg(''), 4000);
        }
    }, [fetchVisibleCells, fetchActivities, fetchUserStats]);

    // Handle Attack Laps updates
    const submitLapCompletion = useCallback(async (territory, lapCount, visited, isSim = false) => {
        try {
            const { data } = await axios.post('/api/territory/attack/lap', {
                territoryId: territory._id,
                lapsCompleted: lapCount,
                checkpointsVisited: visited,
                isSimulated: isSim
            });

            if (data.wasCaptured) {
                setSuccessMsg('🏆 Territory Conquered!');
                setCurrentAttackCell(null);
                setAttackCheckpoints([]);
                setAttackVisitedCheckpoints([]);
                setAttackLapsCompleted(0);
                setActivePath([]);
                fetchUserStats();
            } else {
                setSuccessMsg(`Lap completed! Laps: ${lapCount} / ${territory.defenseLevel}`);
                setAttackLapsCompleted(lapCount);
                // Reset checkpoints visited state for the next lap
                setAttackVisitedCheckpoints(Array(attackCheckpoints.length).fill(false));
            }
            setTimeout(() => setSuccessMsg(''), 4000);
            fetchVisibleCells();
            fetchActivities();
        } catch (err) {
            console.error('Error recording lap:', err);
            const msg = err.response?.data?.error || 'Failed to record lap progress.';
            setErrorMsg(msg);
            setTimeout(() => setErrorMsg(''), 4000);
        }
    }, [attackCheckpoints.length, fetchVisibleCells, fetchActivities, fetchUserStats]);

    // Attack tracker state updater
    const handleAttackMovement = useCallback((coord, isSim = false) => {
        if (!currentAttackCell) {
            // Scan for nearby rival territories
            const rivalTerritory = cells.find(t => {
                const isMe = t.owner?._id === userRef.current?._id || t.owner === userRef.current?._id;
                if (isMe) return false;
                
                // Check if attacker is near any boundary vertex
                return t.boundary.some(vertex => getDistance(coord, vertex) < 25);
            });

            if (rivalTerritory) {
                setCurrentAttackCell(rivalTerritory);
                const pts = rivalTerritory.boundary.slice(0, -1); // Exclude duplicate last coordinate
                setAttackCheckpoints(pts);
                setAttackVisitedCheckpoints(Array(pts.length).fill(false));
                setAttackLapsCompleted(0);
                setSuccessMsg(`⚠️ Border aligned! Attack started around the perimeter...`);
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } else {
            // Check if player wandered too far from boundary outline
            const isNear = currentAttackCell.boundary.some(vertex => getDistance(coord, vertex) < 40);
            if (!isNear) {
                setCurrentAttackCell(null);
                setAttackCheckpoints([]);
                setAttackVisitedCheckpoints([]);
                setAttackLapsCompleted(0);
                setErrorMsg('Attack cancelled: wandered too far from boundary.');
                setTimeout(() => setErrorMsg(''), 3000);
                return;
            }

            // Mark nearby checkpoints as visited
            setAttackVisitedCheckpoints(prev => {
                const nextCheckpoints = [...prev];
                let changed = false;
                
                attackCheckpoints.forEach((pt, idx) => {
                    if (getDistance(coord, pt) < 20) {
                        if (!nextCheckpoints[idx]) {
                            nextCheckpoints[idx] = true;
                            changed = true;
                        }
                    }
                });

                if (changed) {
                    const visitedCount = nextCheckpoints.filter(v => v).length;
                    const coverage = visitedCount / attackCheckpoints.length;
                    
                    // Verify loop completion when >= 95% perimeter is covered and returned to first visited checkpoint
                    if (coverage >= 0.95) {
                        const firstVisitedIdx = nextCheckpoints.findIndex(v => v);
                        if (firstVisitedIdx !== -1 && getDistance(coord, attackCheckpoints[firstVisitedIdx]) < 20) {
                            // Lap finished
                            setTimeout(() => {
                                submitLapCompletion(currentAttackCell, attackLapsCompleted + 1, nextCheckpoints, isSim);
                            }, 50);
                        }
                    }
                }

                return nextCheckpoints;
            });
        }
    }, [cells, currentAttackCell, attackCheckpoints, attackLapsCompleted, submitLapCompletion]);

    // Unified client track updater
    const handleLocationUpdate = useCallback(async (lat, lng, isSim = false) => {
        const coord = [lng, lat];
        
        // Report location update to backend track log
        try {
            await axios.post('/api/territory/track', { lat, lng });
        } catch (err) {
            console.error('Error logging position tracker:', err);
        }

        // Handle active path append
        setActivePath(prevPath => {
            if (prevPath.length > 0) {
                const lastPoint = prevPath[prevPath.length - 1];
                if (getDistance(lastPoint, coord) < 2) {
                    // Filter location jitter (less than 2m movement)
                    return prevPath;
                }
            }

            const nextPath = [...prevPath, coord];
            
            // If attacking, direct coordinate updates into battle validator
            handleAttackMovement(coord, isSim);

            // Check if user closed a new loop
            const loopResult = checkLoop(nextPath);
            if (loopResult && !currentAttackCell) {
                const { loopCoords } = loopResult;
                let lngSum = 0, latSum = 0;
                loopCoords.forEach(c => { lngSum += c[0]; latSum += c[1]; });
                const centroidLng = lngSum / loopCoords.length;
                const centroidLat = latSum / loopCoords.length;

                // Geometrically close loop boundaries
                const closedLoop = [...loopCoords];
                if (closedLoop.length > 0 && (closedLoop[0][0] !== closedLoop[closedLoop.length - 1][0] || closedLoop[0][1] !== closedLoop[closedLoop.length - 1][1])) {
                    closedLoop.push([closedLoop[0][0], closedLoop[0][1]]);
                }

                // Fire claim request
                submitClaim(centroidLat, centroidLng, closedLoop, isSim);
                return [];
            }

            return nextPath;
        });
    }, [currentAttackCell, handleAttackMovement, submitClaim]);

    // WebSocket listeners for remote updates
    const handleRemoteClaim = useCallback(() => { fetchVisibleCells(); }, [fetchVisibleCells]);
    const handleRemoteActivity = useCallback((newActivity) => {
        if (!map.current) return;
        const bounds = map.current.getBounds();
        const coords = newActivity.location?.coordinates;
        if (!coords || coords.length < 2) return;
        
        const isInside = bounds.contains([coords[0], coords[1]]);
        setActivities(prev => {
            if (prev.some(act => act._id === newActivity._id)) return prev;
            return isInside ? [newActivity, ...prev].slice(0, 25) : prev;
        });
    }, []);

    const handleStolenAlert = useCallback((data) => {
        if (data.targetUserId === userRef.current?._id) {
            setErrorMsg(data.message);
            setTimeout(() => setErrorMsg(''), 5000);
        }
    }, []);

    useEffect(() => {
        const socketUrl = axios.defaults.baseURL || 'http://localhost:5000';
        socket.current = io(socketUrl, { withCredentials: true });

        socket.current.on('cellCaptured', handleRemoteClaim);
        socket.current.on('activityCreated', handleRemoteActivity);
        socket.current.on('territoryStolen', handleStolenAlert);

        return () => {
            if (socket.current) socket.current.disconnect();
        };
    }, [handleRemoteClaim, handleRemoteActivity, handleStolenAlert]);

    // GPS Marker avatar update
    const updateOrCreateUserMarker = useCallback((lat, lng) => {
        if (!map.current) return;
        
        if (userMarkerRef.current) {
            userMarkerRef.current.setLngLat([lng, lat]);
        } else {
            const el = document.createElement('div');
            el.className = 'gps-marker-element user-avatar-marker';
            
            if (userRef.current?.image) {
                const img = document.createElement('img');
                img.src = userRef.current.image;
                img.alt = userRef.current.displayName || 'User';
                img.className = 'marker-avatar-img';
                el.appendChild(img);
            } else {
                const inner = document.createElement('div');
                inner.className = 'marker-blue-inner';
                el.appendChild(inner);
            }
            
            userMarkerRef.current = new mapboxgl.Marker(el)
                .setLngLat([lng, lat])
                .addTo(map.current);
        }
    }, []);

    // Handles cell inspection clicking
    const onMapClick = async (e) => {
        const { lng, lat } = e.lngLat;



        // Perform point-in-polygon inspections on map click
        const clickedCell = cells.find(cell => {
            if (cell.boundary) {
                return isPointInPolygon([lng, lat], cell.boundary);
            }
            return false;
        });

        if (clickedCell) {
            try {
                const { data } = await axios.get(`/api/territory/territories/${clickedCell._id || clickedCell.cellId}/stats`);
                if (data) {
                    setInspectedCell(data);
                    return;
                }
            } catch (err) {
                console.error(err);
            }
        }
        setInspectedCell(null);
    };

    // Toggle Map Geolocation tracking
    const toggleTracking = () => {
        if (isTracking) {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            setIsTracking(false);
            setActivePath([]);
            setCurrentAttackCell(null);
            setAttackCheckpoints([]);
            setAttackVisitedCheckpoints([]);
        } else {
            if (!navigator.geolocation) {
                alert('Geolocation is not supported by your browser.');
                return;
            }
            setIsTracking(true);

            setActivePath([]);

            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setCurrentCoords({ lat: latitude, lng: longitude });
                    updateOrCreateUserMarker(latitude, longitude);
                    handleLocationUpdate(latitude, longitude, false);

                    if (map.current) {
                        map.current.easeTo({ center: [longitude, latitude], zoom: 17.5 });
                    }
                },
                (err) => {
                    console.warn('GPS position error:', err);
                    setErrorMsg('GPS Connection Lost or Access Denied.');
                    setIsTracking(false);
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
        }
    };



    const onMapClickRef = useRef(onMapClick);
    useEffect(() => {
        onMapClickRef.current = onMapClick;
    }, [onMapClick]);

    const handleBoundsChangeRef = useRef(handleBoundsChange);
    useEffect(() => {
        handleBoundsChangeRef.current = handleBoundsChange;
    }, [handleBoundsChange]);

    // Style toggles
    useEffect(() => {
        if (!map.current) return;
        const mapStyle = theme === 'dark'
            ? 'mapbox://styles/mapbox/navigation-night-v1'
            : 'mapbox://styles/mapbox/streets-v12';
        map.current.setStyle(mapStyle);
    }, [theme]);

    // Mount load
    useEffect(() => {
        const themeVal = themeRef.current || 'light';
        const mapStyle = themeVal === 'dark'
            ? 'mapbox://styles/mapbox/navigation-night-v1'
            : 'mapbox://styles/mapbox/streets-v12';

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: mapStyle,
            center: [78.9629, 20.5937],
            zoom: 4.2,
            pitch: 0,
            bearing: 0,
            attributionControl: false
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Map initialization and user location
        const requestInitialLocation = () => {
            const fallbackToIPLocation = async () => {
                try {
                    // Using ipinfo.io as it often provides better accuracy for ISPs than ipapi
                    const response = await fetch('https://ipinfo.io/json');
                    const data = await response.json();
                    if (data && data.loc) {
                        const [latitude, longitude] = data.loc.split(',').map(Number);
                        if (map.current) {
                            map.current.flyTo({ center: [longitude, latitude], zoom: 17.5, speed: 1.2 });
                        }
                        setCurrentCoords({ lat: latitude, lng: longitude });
                        updateOrCreateUserMarker(latitude, longitude);
                    }
                } catch (err) {
                    console.warn('Geolocation fallback issue:', err);
                }
            };

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        if (map.current) {
                            map.current.flyTo({ center: [longitude, latitude], zoom: 17.5, speed: 1.2 });
                        }
                        setCurrentCoords({ lat: latitude, lng: longitude });
                        updateOrCreateUserMarker(latitude, longitude);
                    },
                    (error) => {
                        console.warn('GPS Error or Denied, falling back to IP:', error);
                        fallbackToIPLocation();
                    },
                    { enableHighAccuracy: true, timeout: 5000 }
                );
            } else {
                fallbackToIPLocation();
            }
        };

        map.current.on('load', () => {
            requestInitialLocation();
            if (handleBoundsChangeRef.current) {
                handleBoundsChangeRef.current();
            }
        });

        map.current.on('moveend', () => {
            if (handleBoundsChangeRef.current) {
                handleBoundsChangeRef.current();
            }
        });

        map.current.on('click', (e) => {
            if (onMapClickRef.current) {
                onMapClickRef.current(e);
            }
        });

        map.current.on('style.load', () => {
            if (!map.current) return;

            // 1. Grid polygon fills
            if (!map.current.getSource('grid-cells')) {
                map.current.addSource('grid-cells', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });
                map.current.addLayer({
                    id: 'grid-cells-fill',
                    type: 'fill',
                    source: 'grid-cells',
                    paint: {
                        'fill-color': ['get', 'color'],
                        'fill-opacity': 0.18
                    }
                });
            }

            // 2. Empire outlines
            if (!map.current.getSource('empire-borders')) {
                map.current.addSource('empire-borders', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });
                map.current.addLayer({
                    id: 'empire-fills',
                    type: 'fill',
                    source: 'empire-borders',
                    paint: {
                        'fill-color': ['get', 'color'],
                        'fill-opacity': 0.32
                    }
                });
                map.current.addLayer({
                    id: 'empire-borders-outline',
                    type: 'line',
                    source: 'empire-borders',
                    paint: {
                        'line-color': ['get', 'color'],
                        'line-width': 4.5,
                        'line-opacity': 0.85
                    }
                });
            }

            // 3. Active path line
            if (!map.current.getSource('active-path')) {
                map.current.addSource('active-path', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });
                map.current.addLayer({
                    id: 'active-path-line',
                    type: 'line',
                    source: 'active-path',
                    paint: {
                        'line-color': '#3b82f6',
                        'line-width': 4.5,
                        'line-opacity': 0.9,
                        'line-dasharray': [2, 1.5]
                    }
                });
            }

            // 4. Attack Checkpoints circles
            if (!map.current.getSource('attack-checkpoints')) {
                map.current.addSource('attack-checkpoints', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });
                map.current.addLayer({
                    id: 'attack-checkpoints-circles',
                    type: 'circle',
                    source: 'attack-checkpoints',
                    paint: {
                        'circle-radius': 6.5,
                        'circle-color': ['case', ['get', 'visited'], '#10b981', '#ef4444'], // green if visited, red if not
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#ffffff'
                    }
                });
            }

            redrawCells();
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
            territoryMarkersRef.current = {};
        };
    }, []);



    return (
        <div className="territory-page">
            <div className={`territory-sidebar ${mobileExpanded ? 'mobile-expanded' : ''}`}>
                <div className="territory-sidebar-handle" onClick={() => setMobileExpanded(!mobileExpanded)} title="Toggle panel" />
                <div className="territory-header-row">
                    <div className="territory-header">
                        <div className="header-badge">
                            <span className="badge-pulse"></span>
                            GPS CONQUEST ACTIVE
                        </div>
                        <h2>Territory Map</h2>
                        <p className="subtitle">Carve out your empire by walking closed loops along roads and trails.</p>
                    </div>
                </div>

                {errorMsg && <div className="alert-box error">{errorMsg}</div>}
                {successMsg && <div className="alert-box success">{successMsg}</div>}

                {/* Inspect Card */}
                {inspectedCell && (
                    <div className="inspect-cell-card">
                        <div className="card-header-row">
                            <h4>Territory Profile</h4>
                            <button onClick={() => setInspectedCell(null)} className="close-inspect-btn">✕</button>
                        </div>
                        
                        <div className="owner-profile-summary">
                            <div className="owner-avatar-block">
                                {inspectedCell.owner.image ? (
                                    <img src={inspectedCell.owner.image} alt={inspectedCell.owner.displayName} className="profile-large-avatar" />
                                ) : (
                                    <div className="profile-large-avatar-fallback">
                                        {inspectedCell.owner.displayName?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <div className="profile-name">{inspectedCell.owner.displayName}</div>
                                    <div className="profile-rank">
                                        RANK: <strong>#{inspectedCell.owner.rank || 'N/A'}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="inspect-details">
                            <div className="stat-grid-2">
                                <div className="mini-stat">
                                    <div className="num">{(inspectedCell.cell?.area || 0).toFixed(4)}</div>
                                    <div className="lbl">Area (km²)</div>
                                </div>
                                <div className="mini-stat">
                                    <div className="num">{(inspectedCell.cell?.perimeter || 0).toFixed(2)}</div>
                                    <div className="lbl">Perimeter (km)</div>
                                </div>
                            </div>

                            <div className="stat-grid-3">
                                <div className="micro-stat">
                                    <div className="val">{inspectedCell.owner.empireScore}</div>
                                    <div className="desc">Score</div>
                                </div>
                                <div className="micro-stat">
                                    <div className="val">{inspectedCell.owner.successfulCaptures}</div>
                                    <div className="desc">Captures</div>
                                </div>
                                <div className="micro-stat">
                                    <div className="val">{inspectedCell.owner.successfulDefenses}</div>
                                    <div className="desc">Defenses</div>
                                </div>
                            </div>

                            <div className="cell-details-divider">TERRITORY STATUS</div>
                            
                            <div className="row">
                                <span>Defense Strength:</span>
                                <strong>{(inspectedCell.cell?.strength !== undefined ? inspectedCell.cell.strength : 0)}/100</strong>
                            </div>
                            <div className="progress-bar-small">
                                <div className="progress-bar-fill" style={{ width: `${inspectedCell.cell?.strength || 0}%` }} />
                            </div>

                            <div className="row">
                                <span>Defense Level:</span>
                                <strong>Level {inspectedCell.cell?.defenseLevel || 1}</strong>
                            </div>
                            <div className="row">
                                <span>Required Attack Laps:</span>
                                <strong>{inspectedCell.cell?.defenseLevel || 1} laps</strong>
                            </div>
                            <div className="row">
                                <span>Battles Count:</span>
                                <span>{inspectedCell.cell?.battlesCount || 0} times</span>
                            </div>
                            <div className="row">
                                <span>Status:</span>
                                <strong style={{ color: inspectedCell.cell?.status === 'under_attack' ? '#ef4444' : '#10b981' }}>
                                    {(inspectedCell.cell?.status || 'active').toUpperCase()}
                                </strong>
                            </div>
                        </div>
                    </div>
                )}

                {/* Active Attack Widget */}
                {currentAttackCell && (
                    <div className="capture-progress-widget" style={{ borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.03)' }}>
                        <div className="loader-label">
                            <span style={{ color: '#ef4444', fontWeight: 900 }}>Attacking Territory!</span>
                            <strong style={{ color: '#ef4444' }}>
                                {attackLapsCompleted} / {currentAttackCell.defenseLevel} Laps
                            </strong>
                        </div>
                        
                        {/* Perimeter checklist indicators */}
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Perimeter Covered: <strong>
                                {Math.round((attackVisitedCheckpoints.filter(v => v).length / (attackCheckpoints.length || 1)) * 100)}%
                            </strong>
                        </div>

                        <div className="loader-bar-track" style={{ borderColor: 'rgba(239, 68, 68, 0.15)' }}>
                            <div 
                                className="loader-bar-fill" 
                                style={{ 
                                    width: `${(attackVisitedCheckpoints.filter(v => v).length / (attackCheckpoints.length || 1)) * 100}%`,
                                    background: 'linear-gradient(90deg, #ef4444, #f87171)'
                                }} 
                            />
                        </div>
                        <span className="cell-id-sub mono">Walk road outlines to complete laps.</span>
                    </div>
                )}

                {/* Active Walk Path Tracker */}
                {activePath.length > 0 && !currentAttackCell && (
                    <div className="capture-progress-widget">
                        <div className="loader-label">
                            <span>Tracing Closed Loop...</span>
                            <strong>{activePath.length} pts</strong>
                        </div>
                        <span className="cell-id-sub mono">Returns to start to form loop.</span>
                    </div>
                )}

                {/* Empty State Banner */}
                {(!userStats || userStats.areaOwned === 0) && (
                    <div className="empty" style={{ marginBottom: '1.25rem', borderColor: '#10b981', borderStyle: 'solid', background: 'rgba(16, 185, 129, 0.04)' }}>
                        <p style={{ margin: 0, fontWeight: 700, color: '#059669' }}>
                            No territory captured yet!
                        </p>
                        <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            Walk around roads in a closed loop to capture your first territory block!
                        </p>
                    </div>
                )}

                {/* Stats Summary Panel */}
                <div className="info-widgets">
                    <div className="widget">
                        <span className="value">
                            {(userStats.areaOwned || 0).toFixed(3)}
                        </span>
                        <span className="label">Area (km²)</span>
                    </div>
                    <div className="widget">
                        <span className="value">
                            {userStats.empireScore || 0}
                        </span>
                        <span className="label">Empire Score</span>
                    </div>
                </div>

                {/* Action Controls */}
                <div className="controls-section">
                    <button
                        onClick={toggleTracking}
                        className={`btn ${isTracking ? 'btn-danger' : 'btn-primary'} btn-full`}
                    >
                        {isTracking ? 'Stop GPS Tracking' : 'Start GPS Tracking'}
                    </button>



                    {activePath.length > 0 && (
                        <button
                            onClick={() => setActivePath([])}
                            className="btn btn-outline btn-full"
                            style={{ border: '1.5px dashed var(--border-color)', color: 'var(--text-secondary)', background: 'transparent' }}
                        >
                            Clear Active Path ({activePath.length} points)
                        </button>
                    )}
                </div>

                {/* viewport activity feed */}
                <div className="activity-feed-section">
                    <h3>Nearby Capture Activity</h3>
                    <div className="activity-feed-list">
                        {activities.map(act => (
                            <div key={act._id} className="activity-feed-item">
                                <span className="act-time">
                                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <div className="act-content">
                                    {act.userImage ? (
                                        <img src={act.userImage} alt={act.userName} className="act-avatar" />
                                    ) : (
                                        <div className="act-avatar-fallback">{act.userName.charAt(0).toUpperCase()}</div>
                                    )}
                                    <p className="act-message">{act.message}</p>
                                </div>
                            </div>
                        ))}
                        {activities.length === 0 && <p className="empty">No recent activity nearby.</p>}
                    </div>
                </div>
            </div>

            <div className="map-view-container" ref={mapContainer} />
        </div>
    );
};

export default Territories;
