import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import mapboxgl from 'mapbox-gl';
import * as h3 from 'h3-js';
import { io } from 'socket.io-client';
import 'mapbox-gl/dist/mapbox-gl.css';
import './Territories.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_API_KEY;

const getBoundaryCoords = (cellId) => {
    try {
        const boundary = h3.cellToBoundary(cellId);
        const lngLats = boundary.map(coord => [coord[1], coord[0]]);
        if (lngLats.length > 0) {
            lngLats.push(lngLats[0]); // Close polygon loop
        }
        return lngLats;
    } catch (err) {
        console.error('Error calculating boundary:', err);
        return [];
    }
};

const getCellFromCoords = (lat, lng, resolution = 10) => {
    try {
        return h3.latLngToCell(lat, lng, resolution);
    } catch (err) {
        console.error('Error getting cell ID:', err);
        return null;
    }
};

// Deterministic HSL color based on owner ID string (preserves brand green for player)
const getOwnerColor = (ownerId, isMe) => {
    if (isMe) return '#10b981'; // Vibrant emerald green for current user
    if (!ownerId) return '#64748b'; // Slate gray fallback

    const idStr = ownerId.toString();
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) {
        hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Select hue dynamically, skipping green range (90-170) to ensure high contrast
    let hue = Math.abs(hash) % 360;
    if (hue >= 90 && hue <= 170) {
        hue = (hue + 90) % 360;
    }
    return `hsl(${hue}, 85%, 52%)`;
};

const Territories = ({ user, theme }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const socket = useRef(null);
    const watchIdRef = useRef(null);
    const userMarkerRef = useRef(null);
    const progressTimerRef = useRef(null);

    // States
    const [cells, setCells] = useState([]);
    const [activities, setActivities] = useState([]);
    
    // Tracking states
    const [isTracking, setIsTracking] = useState(false);
    const [currentCoords, setCurrentCoords] = useState(null);
    const [currentCell, setCurrentCell] = useState(null);
    
    // Capture state machine states
    const [capturingCell, setCapturingCell] = useState(null);
    const [captureProgress, setCaptureProgress] = useState(0);
    const [captureTimeRemaining, setCaptureTimeRemaining] = useState(0);
    
    // Inspect cell and owner rival profile
    const [inspectedCell, setInspectedCell] = useState(null);

    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Refs for holding latest states to prevent map recreation and race conditions
    const userRef = useRef(user);
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    const themeRef = useRef(theme);
    useEffect(() => {
        themeRef.current = theme;
    }, [theme]);

    const cellsRef = useRef([]);
    const currentCellRef = useRef(null);

    // Fetch cells inside active viewport bounds
    const fetchVisibleCells = useCallback(async () => {
        if (!map.current) return;
        try {
            const bounds = map.current.getBounds();
            const boundsStr = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
            
            // Fetch cells & viewport leaderboard
            const { data } = await axios.get(`/api/territory/cells?bounds=${boundsStr}`);
            setCells(data.cells || []);
        } catch (err) {
            console.error('Error loading cells:', err);
        }
    }, []);

    // Fetch activities inside active viewport bounds
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

    // Combined bounds update trigger (debounced 300ms)
    const handleBoundsChange = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            fetchVisibleCells();
            fetchActivities();
        }, 300);
    }, [fetchVisibleCells, fetchActivities]);

    const handleBoundsChangeRef = useRef(handleBoundsChange);
    useEffect(() => {
        handleBoundsChangeRef.current = handleBoundsChange;
    }, [handleBoundsChange]);

    // Redraw functions
    const redrawCells = useCallback(() => {
        if (!map.current || !map.current.isStyleLoaded()) return;

        const cellSource = map.current.getSource('grid-cells');
        const borderSource = map.current.getSource('empire-borders');
        if (!cellSource || !borderSource) return;

        // 1. Setup individual grid fills
        const cellFeatures = cellsRef.current.map(cell => {
            const coords = getBoundaryCoords(cell.cellId);
            const isMe = cell.owner === userRef.current?._id || cell.ownerName === userRef.current?.displayName;
            const color = getOwnerColor(cell.owner, isMe);

            return {
                type: 'Feature',
                properties: {
                    cellId: cell.cellId,
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

        // 2. Group cells by owner, merge contiguous boundaries
        const cellsByOwner = {};
        cellsRef.current.forEach(cell => {
            const ownerId = cell.owner.toString();
            if (!cellsByOwner[ownerId]) {
                cellsByOwner[ownerId] = {
                    ownerName: cell.ownerName,
                    cellIds: []
                };
            }
            cellsByOwner[ownerId].cellIds.push(cell.cellId);
        });

        const borderFeatures = [];
        Object.keys(cellsByOwner).forEach(ownerId => {
            const { ownerName, cellIds } = cellsByOwner[ownerId];
            const isMe = ownerId === userRef.current?._id?.toString();
            const color = getOwnerColor(ownerId, isMe);

            try {
                const multiPolygons = h3.cellsToMultiPolygon(cellIds);
                const geoJsonCoords = multiPolygons.map(polygon => 
                    polygon.map(ring => 
                        ring.map(coord => [coord[1], coord[0]])
                    )
                );

                borderFeatures.push({
                    type: 'Feature',
                    properties: {
                        ownerId,
                        ownerName,
                        color: color
                    },
                    geometry: {
                        type: 'MultiPolygon',
                        coordinates: geoJsonCoords
                    }
                });
            } catch (err) {
                console.error(`Failed to merge borders for ${ownerName}`, err);
            }
        });

        borderSource.setData({
            type: 'FeatureCollection',
            features: borderFeatures
        });
    }, []);

    const redrawCurrentCell = useCallback(() => {
        if (!map.current || !map.current.isStyleLoaded() || !currentCellRef.current) return;

        const source = map.current.getSource('current-cell');
        if (!source) return;

        const coords = getBoundaryCoords(currentCellRef.current);
        source.setData({
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Polygon',
                        coordinates: [coords]
                    }
                }
            ]
        });
    }, []);

    useEffect(() => {
        cellsRef.current = cells;
        redrawCells();
    }, [cells, redrawCells]);

    useEffect(() => {
        currentCellRef.current = currentCell;
        redrawCurrentCell();
    }, [currentCell, redrawCurrentCell]);

    const triggerRedrawRef = useRef(() => {});
    useEffect(() => {
        triggerRedrawRef.current = () => {
            redrawCells();
            redrawCurrentCell();
        };
    }, [redrawCells, redrawCurrentCell]);

    // Finalize claim on target cell
    const submitClaim = useCallback(async (lat, lng, cellId) => {
        try {
            const { data } = await axios.post('/api/territory/claim', {
                lat,
                lng,
                isSimulated: false
            });

            if (data.wasCaptured) {
                setSuccessMsg(`Successfully captured cell ${cellId.substring(0, 8)}!`);
            } else {
                setSuccessMsg(data.message);
            }
            setTimeout(() => setSuccessMsg(''), 3000);
            fetchVisibleCells();
            fetchActivities();
        } catch (err) {
            console.error('Error claiming cell:', err);
            const msg = err.response?.data?.error || 'Failed to claim territory.';
            setErrorMsg(msg);
            setTimeout(() => setErrorMsg(''), 4000);
        } finally {
            setCapturingCell(null);
            setCaptureProgress(0);
            setCaptureTimeRemaining(0);
        }
    }, [fetchVisibleCells, fetchActivities]);

    // Handle capture timer ticking
    const startCaptureTimer = useCallback((lat, lng, cellId, durationMs) => {
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);

        if (durationMs === 0) {
            submitClaim(lat, lng, cellId);
            return;
        }

        setCapturingCell(cellId);
        setCaptureProgress(0);
        setCaptureTimeRemaining(durationMs / 1000);

        const startTime = Date.now();
        progressTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / durationMs) * 100, 100);
            const remaining = Math.max((durationMs - elapsed) / 1000, 0);

            setCaptureProgress(progress);
            setCaptureTimeRemaining(remaining);

            if (progress >= 100) {
                clearInterval(progressTimerRef.current);
                progressTimerRef.current = null;
                submitClaim(lat, lng, cellId);
            }
        }, 100);
    }, [submitClaim]);

    // Initialize capture attempt backend log
    const handleCellTransition = useCallback(async (lat, lng, cellId) => {
        if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
        }

        try {
            const { data } = await axios.post('/api/territory/claim/start', { lat, lng });
            startCaptureTimer(lat, lng, cellId, data.requiredDuration);
        } catch (err) {
            console.error('Error starting capture:', err);
            const msg = err.response?.data?.error || 'Failed to initialize capture timer.';
            setErrorMsg(msg);
            setTimeout(() => setErrorMsg(''), 3000);
            setCapturingCell(null);
        }
    }, [startCaptureTimer]);

    // Listen to real-time events via WebSockets
    const handleRemoteClaim = useCallback(() => {
        fetchVisibleCells();
    }, [fetchVisibleCells]);

    // Viewport-aware remote activity updater
    const handleRemoteActivity = useCallback((newActivity) => {
        if (!map.current) return;
        const bounds = map.current.getBounds();
        const coords = newActivity.location?.coordinates;
        if (!coords || coords.length < 2) return;
        
        const isInside = bounds.contains([coords[0], coords[1]]); // checks [lng, lat]

        setActivities(prev => {
            if (prev.some(act => act._id === newActivity._id)) return prev;

            // Check if current list is displaying fallback (no local activities within bounds)
            const hasLocalActivities = prev.some(act => {
                const actCoords = act.location?.coordinates;
                return actCoords && actCoords.length >= 2 && bounds.contains([actCoords[0], actCoords[1]]);
            });

            if (isInside) {
                if (!hasLocalActivities) {
                    return [newActivity];
                } else {
                    return [newActivity, ...prev].slice(0, 25);
                }
            } else {
                if (!hasLocalActivities) {
                    return [newActivity, ...prev].slice(0, 25);
                }
                return prev;
            }
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
            if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        };
    }, [handleRemoteClaim, handleRemoteActivity, handleStolenAlert]);

    // Helper to update or place user avatar marker on map
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

    const updateOrCreateUserMarkerRef = useRef(updateOrCreateUserMarker);
    useEffect(() => {
        updateOrCreateUserMarkerRef.current = updateOrCreateUserMarker;
    }, [updateOrCreateUserMarker]);

    const onMapClick = async (e) => {
        const { lng, lat } = e.lngLat;
        const clickedCellId = getCellFromCoords(lat, lng, 10);

        try {
            const { data } = await axios.get(`/api/territory/inspect/${clickedCellId}`);
            if (data && data.cell) {
                setInspectedCell(data);
            } else {
                setInspectedCell(null);
            }
        } catch (err) {
            setInspectedCell(null);
        }
    };

    const onMapClickRef = useRef(onMapClick);
    useEffect(() => {
        onMapClickRef.current = onMapClick;
    }, [onMapClick]);

    // Listen to theme prop changes to dynamically toggle Mapbox style
    useEffect(() => {
        if (!map.current) return;
        const mapStyle = theme === 'dark'
            ? 'mapbox://styles/mapbox/navigation-night-v1'
            : 'mapbox://styles/mapbox/streets-v12';
        map.current.setStyle(mapStyle);
    }, [theme]);

    // Map initialization (Runs EXACTLY ONCE on Mount)
    useEffect(() => {
        const themeVal = themeRef.current || 'light';
        const mapStyle = themeVal === 'dark'
            ? 'mapbox://styles/mapbox/navigation-night-v1'
            : 'mapbox://styles/mapbox/streets-v12';

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: mapStyle,
            center: [78.9629, 20.5937], // Start general India overview
            zoom: 4.2, // India overview zoom level 4.2
            pitch: 0,
            bearing: 0,
            attributionControl: false
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        const fallbackToIPLocation = async () => {
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                if (data && data.latitude && data.longitude) {
                    const { latitude, longitude, city } = data;
                    console.log(`IP Geolocation resolved to: ${city} (${latitude}, ${longitude})`);
                    if (map.current) {
                        map.current.flyTo({
                            center: [longitude, latitude],
                            zoom: 17.5,
                            speed: 1.2
                        });
                    }
                    setCurrentCoords({ lat: latitude, lng: longitude });
                    const cell = getCellFromCoords(latitude, longitude, 10);
                    setCurrentCell(cell);
                    if (updateOrCreateUserMarkerRef.current) {
                        updateOrCreateUserMarkerRef.current(latitude, longitude);
                    }
                } else {
                    console.log('IP Geolocation response invalid. Staying on India overview.');
                }
            } catch (ipErr) {
                console.warn('IP Geolocation fallback failed:', ipErr);
                console.log('Staying on India overview.');
            }
        };

        const fallbackToLastCoords = () => {
            if (userRef.current?.lastCoords?.lat && userRef.current?.lastCoords?.lng) {
                const { lat, lng } = userRef.current.lastCoords;
                if (map.current) {
                    map.current.flyTo({
                        center: [lng, lat],
                        zoom: 17.5,
                        speed: 1.2
                    });
                }
                setCurrentCoords({ lat, lng });
                const cell = getCellFromCoords(lat, lng, 10);
                setCurrentCell(cell);
                if (updateOrCreateUserMarkerRef.current) {
                    updateOrCreateUserMarkerRef.current(lat, lng);
                }
            } else {
                console.log('No last coordinates found. Fallback to IP Geolocation...');
                fallbackToIPLocation();
            }
        };

        const handleInitialPosition = () => {
            if (!navigator.geolocation) {
                fallbackToLastCoords();
                return;
            }

            console.log('Attempting GPS lookup...');
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    console.log('GPS lookup succeeded:', latitude, longitude);
                    if (map.current) {
                        map.current.flyTo({
                            center: [longitude, latitude],
                            zoom: 17.5,
                            speed: 1.2
                        });
                    }
                    setCurrentCoords({ lat: latitude, lng: longitude });
                    const cell = getCellFromCoords(latitude, longitude, 10);
                    setCurrentCell(cell);
                    if (updateOrCreateUserMarkerRef.current) {
                        updateOrCreateUserMarkerRef.current(latitude, longitude);
                    }
                },
                (err1) => {
                    console.warn('GPS permission denied or unavailable. Fallback to saved lastCoords...', err1);
                    fallbackToLastCoords();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 8000,
                    maximumAge: 10000
                }
            );
        };

        map.current.on('load', () => {
            handleInitialPosition();
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

        // Layer and sources initialization (fired on initial style load & subsequent style switches)
        map.current.on('style.load', () => {
            if (!map.current) return;
            // 1. Grid Cells Fill
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
                        'fill-opacity': 0.15
                    }
                });
            }

            // 2. Empire Borders
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

            // 3. Current Cell Outline
            if (!map.current.getSource('current-cell')) {
                map.current.addSource('current-cell', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });

                map.current.addLayer({
                    id: 'current-cell-outline',
                    type: 'line',
                    source: 'current-cell',
                    paint: {
                        'line-color': '#0ea5e9',
                        'line-width': 3.5,
                        'line-dasharray': [2, 2]
                    }
                });
            }

            // Restore elements on the map
            if (triggerRedrawRef.current) {
                triggerRedrawRef.current();
            }
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    // Geolocation Active GPS Tracking
    const toggleTracking = () => {
        if (isTracking) {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            setIsTracking(false);
            if (userMarkerRef.current) {
                userMarkerRef.current.remove();
                userMarkerRef.current = null;
            }
            if (progressTimerRef.current) {
                clearInterval(progressTimerRef.current);
                progressTimerRef.current = null;
            }
            setCapturingCell(null);
            setCaptureProgress(0);
        } else {
            if (!navigator.geolocation) {
                alert('Geolocation is not supported by your browser.');
                return;
            }

            setIsTracking(true);
            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setCurrentCoords({ lat: latitude, lng: longitude });

                    const cellId = getCellFromCoords(latitude, longitude, 10);
                    setCurrentCell(cellId);
                    setInspectedCell(null);

                    if (updateOrCreateUserMarkerRef.current) {
                        updateOrCreateUserMarkerRef.current(latitude, longitude);
                    }

                    if (map.current) {
                        map.current.easeTo({ center: [longitude, latitude], zoom: 17.5 });
                    }

                    // Start cell claim transitions
                    if (cellId !== capturingCell) {
                        handleCellTransition(latitude, longitude, cellId);
                    }
                },
                (err) => {
                    console.warn('GPS watch position warning:', err);
                    if (err.code !== 3) {
                        setErrorMsg('GPS Connection Lost or Access Denied.');
                        setIsTracking(false);
                        if (watchIdRef.current !== null) {
                            navigator.geolocation.clearWatch(watchIdRef.current);
                            watchIdRef.current = null;
                        }
                        if (userMarkerRef.current) {
                            userMarkerRef.current.remove();
                            userMarkerRef.current = null;
                        }
                        if (progressTimerRef.current) {
                            clearInterval(progressTimerRef.current);
                            progressTimerRef.current = null;
                        }
                        setCapturingCell(null);
                        setCaptureProgress(0);
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 10000
                }
            );
        }
    };

    return (
        <div className="territory-page">
            <div className="territory-sidebar">
                <div className="sidebar-header-row">
                    <div className="sidebar-header">
                        <h2>Territory Map</h2>
                        <p>Claim real-world zones while walking</p>
                    </div>
                </div>

                {errorMsg && <div className="alert-box error">{errorMsg}</div>}
                {successMsg && <div className="alert-box success">{successMsg}</div>}

                {/* Rival/Owner Territory Profile Card Details */}
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
                                        DYNAMIC RANK: <strong>#{inspectedCell.owner.rank || 'N/A'}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="inspect-details">
                            <div className="stat-grid-2">
                                <div className="mini-stat">
                                    <div className="num">{inspectedCell.owner.cellsCount}</div>
                                    <div className="lbl">Cells Owned</div>
                                </div>
                                <div className="mini-stat">
                                    <div className="num">{inspectedCell.owner.areaKm2}</div>
                                    <div className="lbl">Area (km²)</div>
                                </div>
                            </div>

                            <div className="stat-grid-3">
                                <div className="micro-stat">
                                    <div className="val">{inspectedCell.owner.empireScore}</div>
                                    <div className="desc">Empire Score</div>
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

                            <div className="cell-details-divider">CELL DETAILS</div>
                            
                            <div className="row">
                                <span>Defense Strength:</span>
                                <strong>{inspectedCell.cell.strength}/100</strong>
                            </div>
                            <div className="progress-bar-small">
                                <div className="progress-bar-fill" style={{ width: `${inspectedCell.cell.strength}%` }} />
                            </div>

                            <div className="row">
                                <span>Defense Level:</span>
                                <strong>Level {inspectedCell.cell.defenseLevel || 1}</strong>
                            </div>
                            <div className="row">
                                <span>Battles Contested:</span>
                                <span>{inspectedCell.cell.battlesCount} times</span>
                            </div>
                            <div className="row">
                                <span>Last Visited:</span>
                                <span>{new Date(inspectedCell.cell.lastVisitedAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Capture Progress Tracker Alert */}
                {capturingCell && (
                    <div className="capture-progress-widget">
                        <div className="loader-label">
                            <span>Capturing Cell...</span>
                            <strong>{captureTimeRemaining.toFixed(1)}s</strong>
                        </div>
                        <div className="loader-bar-track">
                            <div className="loader-bar-fill" style={{ width: `${captureProgress}%` }} />
                        </div>
                        <span className="cell-id-sub mono">{capturingCell.substring(0, 12)}</span>
                    </div>
                )}

                {/* Unranked Fallback Alert */}
                {(!user.territoryStats || user.territoryStats.cellsCount === 0) && (
                    <div className="empty" style={{ marginBottom: '1.25rem', borderColor: '#10b981', borderStyle: 'solid', background: 'rgba(16, 185, 129, 0.04)' }}>
                        <p style={{ margin: 0, fontWeight: 700, color: '#059669' }}>
                            🌍 No territory captured yet!
                        </p>
                        <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            Enter an unclaimed cell on the map and toggle GPS tracking to start conquering cells.
                        </p>
                    </div>
                )}

                {/* Stats Widgets */}
                <div className="info-widgets">
                    <div className="widget">
                        <span className="value">
                            {user.territoryStats?.cellsCount || 0}
                        </span>
                        <span className="label">Owned Cells</span>
                    </div>
                    <div className="widget">
                        <span className="value">
                            {((user.territoryStats?.cellsCount || 0) * 0.015).toFixed(3)}
                        </span>
                        <span className="label">Area (km²)</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="controls-section">
                    <button
                        onClick={toggleTracking}
                        className={`btn ${isTracking ? 'btn-danger' : 'btn-primary'} btn-full`}
                    >
                        {isTracking ? 'End' : 'Start'}
                    </button>
                </div>

                {/* Viewport/Nearby Activity Feed */}
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
