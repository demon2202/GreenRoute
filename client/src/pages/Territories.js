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
        pathDist += getDistance(path[j], path[j + 1]);
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

// Web Audio synthesizer for conquest celebration chime
const playConquestChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 triumphant ascending arpeggio
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.26);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.28);
    });
  } catch (err) {
    console.warn('Audio chime failed:', err);
  }
};

const triggerHapticFeedback = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([150, 80, 150, 80, 350]);
    } catch {}
  }
};

const Territories = ({ user, theme }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const socket = useRef(null);
  const watchIdRef = useRef(null);
  const userMarkerRef = useRef(null);
  const territoryMarkersRef = useRef({});

  // Background execution & screen wake lock refs
  const wakeLockRef = useRef(null);
  const audioKeepAliveRef = useRef(null);
  const lastGpsTimeRef = useRef(Date.now());
  const watchdogIntervalRef = useRef(null);

  const [wakeLockActive, setWakeLockActive] = useState(false);
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

  // Screen Wake Lock API handler
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      }
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
      setWakeLockActive(false);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  // Silent Audio Loop for keeping background execution active on locked phones
  const startSilentAudio = useCallback(() => {
    try {
      if (!audioKeepAliveRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0.0001; // Virtually inaudible, keeps media pipeline alive
          osc.frequency.value = 30; // 30Hz sub-bass
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          audioKeepAliveRef.current = { ctx, osc };
        }
      }
    } catch (err) {
      console.warn('Silent audio keep-alive setup error:', err);
    }
  }, []);

  const stopSilentAudio = useCallback(() => {
    if (audioKeepAliveRef.current) {
      try {
        audioKeepAliveRef.current.osc.stop();
        audioKeepAliveRef.current.ctx.close();
      } catch {}
      audioKeepAliveRef.current = null;
    }
  }, []);

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

  // Recenter map camera on user's current live location
  const recenterMap = useCallback(() => {
    if (!map.current || !currentCoords) return;
    map.current.easeTo({
      center: [currentCoords.lng, currentCoords.lat],
      zoom: 17.8,
      duration: 1000
    });
  }, [currentCoords]);

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
        playConquestChime();
        triggerHapticFeedback();
        setSuccessMsg(`✨ Successfully captured new territory!`);
        setActivePath([]);
        fetchUserStats();
      } else {
        setSuccessMsg(data.message);
      }
      setTimeout(() => setSuccessMsg(''), 3500);
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
        playConquestChime();
        triggerHapticFeedback();
        setSuccessMsg('⭐ Territory Conquered!');
        setCurrentAttackCell(null);
        setAttackCheckpoints([]);
        setAttackVisitedCheckpoints([]);
        setAttackLapsCompleted(0);
        setActivePath([]);
        fetchUserStats();
      } else {
        triggerHapticFeedback();
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
        triggerHapticFeedback();
        setSuccessMsg(`Border aligned! Attack started around the perimeter...`);
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
    lastGpsTimeRef.current = Date.now();
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

  // WebSocket listeners for remote updates with mobile token auth
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
      triggerHapticFeedback();
      setErrorMsg(data.message);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  }, []);

  useEffect(() => {
    const socketUrl = axios.defaults.baseURL || 'https://greenroute-backend-syxi.onrender.com';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('gr_token') : null;
    socket.current = io(socketUrl, { 
      withCredentials: true,
      auth: { token }
    });

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

  // Toggle Map Geolocation tracking with WakeLock & Audio Keep-Alive
  const toggleTracking = () => {
    if (isTracking) {
      // 1. Stop geolocation watch
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      // 2. Clear watchdog interval
      if (watchdogIntervalRef.current) {
        clearInterval(watchdogIntervalRef.current);
        watchdogIntervalRef.current = null;
      }
      // 3. Release wake lock & stop audio keep-alive
      releaseWakeLock();
      stopSilentAudio();

      setIsTracking(false);
      setActivePath([]);
      setCurrentAttackCell(null);
      setAttackCheckpoints([]);
      setAttackVisitedCheckpoints([]);
    } else {
      if (!navigator.geolocation) {
        setErrorMsg('Geolocation is not supported by your browser. Try Chrome or Safari.');
        return;
      }

      setErrorMsg('');
      setIsTracking(true);
      setActivePath([]);

      // Start screen wake lock & silent audio keep-alive for background running
      requestWakeLock();
      startSilentAudio();
      lastGpsTimeRef.current = Date.now();

      const handleGpsError = (err) => {
        console.warn('GPS position error:', err);
        // err.code: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
        if (err.code === 1) {
          setErrorMsg('Location access denied. Please allow location permission in your browser settings.');
        } else if (err.code === 2) {
          setErrorMsg('GPS signal unavailable. Make sure your device GPS is enabled and try again.');
        } else if (err.code === 3) {
          // Timeout — don't stop tracking, retry with lower accuracy
          console.warn('GPS timeout, retrying with lower accuracy...');
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
          }
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              setErrorMsg('');
              lastGpsTimeRef.current = Date.now();
              const { latitude, longitude } = pos.coords;
              setCurrentCoords({ lat: latitude, lng: longitude });
              updateOrCreateUserMarker(latitude, longitude);
              handleLocationUpdate(latitude, longitude, false);
              if (map.current) {
                map.current.easeTo({ center: [longitude, latitude], zoom: 17.5 });
              }
            },
            (retryErr) => {
              console.warn('GPS retry failed:', retryErr);
              setErrorMsg('Could not get GPS signal. Check your device settings and try again.');
              setIsTracking(false);
              releaseWakeLock();
              stopSilentAudio();
            },
            { enableHighAccuracy: false, timeout: 30000, maximumAge: 30000 }
          );
          return;
        }
        setIsTracking(false);
        releaseWakeLock();
        stopSilentAudio();
      };

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setErrorMsg('');
          lastGpsTimeRef.current = Date.now();
          const { latitude, longitude } = pos.coords;
          setCurrentCoords({ lat: latitude, lng: longitude });
          updateOrCreateUserMarker(latitude, longitude);
          handleLocationUpdate(latitude, longitude, false);

          if (map.current) {
            map.current.easeTo({ center: [longitude, latitude], zoom: 17.5 });
          }
        },
        handleGpsError,
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );

      // Setup watchdog heartbeat: if position hasn't been received in 12s, trigger getCurrentPosition
      if (watchdogIntervalRef.current) clearInterval(watchdogIntervalRef.current);
      watchdogIntervalRef.current = setInterval(() => {
        if (Date.now() - lastGpsTimeRef.current > 12000) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              lastGpsTimeRef.current = Date.now();
              const { latitude, longitude } = pos.coords;
              setCurrentCoords({ lat: latitude, lng: longitude });
              updateOrCreateUserMarker(latitude, longitude);
              handleLocationUpdate(latitude, longitude, false);
            },
            (err) => console.warn('Watchdog GPS poll fallback:', err),
            { enableHighAccuracy: true, timeout: 6000 }
          );
        }
      }, 10000);
    }
  };

  // Visibility change listener: re-acquire wake lock & catch up on location when phone is unlocked
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isTracking) {
          requestWakeLock();
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                lastGpsTimeRef.current = Date.now();
                const { latitude, longitude } = pos.coords;
                setCurrentCoords({ lat: latitude, lng: longitude });
                updateOrCreateUserMarker(latitude, longitude);
                handleLocationUpdate(latitude, longitude, false);
              },
              (err) => console.warn('Visibility resume GPS error:', err),
              { enableHighAccuracy: true, timeout: 6000 }
            );
          }
        }
        fetchVisibleCells();
        fetchUserStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTracking, requestWakeLock, handleLocationUpdate, updateOrCreateUserMarker, fetchVisibleCells, fetchUserStats]);

  // Clean up timers, wake locks, and audio on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (watchdogIntervalRef.current) {
        clearInterval(watchdogIntervalRef.current);
      }
      releaseWakeLock();
      stopSilentAudio();
    };
  }, [releaseWakeLock, stopSilentAudio]);



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
      {/* ── FLOATING MOBILE ACTION BAR (High-visibility, 1-tap GPS & Recenter controls) ── */}
      <div className="territory-floating-mobile-bar">
        {/* Main GPS Toggle */}
        <button
          type="button"
          className={`floating-gps-btn ${isTracking ? 'tracking-active' : ''}`}
          onClick={toggleTracking}
        >
          {isTracking ? (
            <div className="gps-btn-labels">
              <span className="gps-btn-main">Stop GPS</span>
              <span className="gps-btn-sub">
                {activePath.length > 0 ? `${activePath.length} pts logged` : (wakeLockActive ? 'Awake • Live' : 'Active')}
              </span>
            </div>
          ) : (
            <div className="gps-btn-labels">
              <span className="gps-btn-main">Start GPS</span>
              <span className="gps-btn-sub">Conquer Loop</span>
            </div>
          )}
        </button>

        {/* Recenter Location Button */}
        <button
          type="button"
          className="floating-tool-btn"
          onClick={recenterMap}
          title="Recenter Map on Your Location"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="7" />
            <line x1="12" y1="1" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="1" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="23" y2="12" />
          </svg>
        </button>

        {/* Stats Drawer Toggle Button */}
        <button
          type="button"
          className={`floating-tool-btn ${mobileExpanded ? 'active' : ''}`}
          onClick={() => setMobileExpanded(!mobileExpanded)}
          title="Toggle Territory Stats Drawer"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="2" />
            <rect x="14" y="3" width="7" height="5" rx="2" />
            <rect x="14" y="12" width="7" height="9" rx="2" />
            <rect x="3" y="16" width="7" height="5" rx="2" />
          </svg>
        </button>
      </div>

      <div className={`territory-sidebar ${mobileExpanded ? 'mobile-expanded' : ''}`}>
        {/* Drag Handle */}
        <div className="territory-sidebar-handle" onClick={() => setMobileExpanded(!mobileExpanded)} title="Toggle panel" />

        {/* ── MOBILE QUICK-BAR (always visible when collapsed) ── */}
        <div className="territory-mobile-quickbar" onClick={() => setMobileExpanded(!mobileExpanded)}>
          {/* GPS badge or status */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {isTracking ? (
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary, #059669)', background: 'var(--primary-soft, #E8EFE9)', padding: '3px 8px', borderRadius: 8, letterSpacing: '0.04em' }}>
                LIVE GPS
              </div>
            ) : (
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary, #64748b)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                  <line x1="9" y1="3" x2="9" y2="18" />
                  <line x1="15" y1="6" x2="15" y2="21" />
                </svg>
                <span>Territory</span>
              </div>
            )}
            {wakeLockActive && isTracking && (
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--primary, #10b981)', background: 'var(--primary-soft, rgba(16,185,129,0.12))', padding: '2px 8px', borderRadius: 8 }}>
                AWAKE
              </div>
            )}
            {currentAttackCell && (
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
                {attackLapsCompleted}/{currentAttackCell.defenseLevel} Laps
              </div>
            )}
          </div>

          {/* Quick stats pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(16,185,129,0.08)', borderRadius: 12, padding: '4px 8px', border: '1px solid rgba(16,185,129,0.15)', flexShrink: 0 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary, #10b981)' }}>
              {(userStats.areaOwned || 0).toFixed(2)}
            </span>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-secondary, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>km²</span>
          </div>

          {/* Tracking toggle button */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleTracking(); }}
            style={{
              height: 36,
              padding: '0 12px',
              borderRadius: 12,
              border: 'none',
              background: isTracking
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: isTracking
                ? '0 4px 14px rgba(239,68,68,0.3)'
                : '0 4px 14px rgba(16,185,129,0.3)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {isTracking ? '⏹ Stop' : '▶ Start GPS'}
          </button>
        </div>

        {/* ── CONTENT (shown when expanded) ── */}
        <div className="territory-mobile-content">

          {/* Desktop Header */}
          <div className="territory-header-row" style={{ marginBottom: 18 }}>
            <div className="territory-header">
              <h2 style={{ margin: '0 0 4px', fontSize: '1.75rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.03em', color: 'var(--text-primary, #0f172a)' }}>
                Territory Empire
              </h2>
              <p className="subtitle" style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary, #64748b)', fontWeight: 500 }}>
                Carve out your green empire by walking closed loops along roads and paths.
              </p>
            </div>
          </div>

          {errorMsg && <div className="alert-box error">{errorMsg}</div>}
          {successMsg && <div className="alert-box success">{successMsg}</div>}

          {/* Background Running Mode Status Banner */}
          {isTracking && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(14,165,233,0.06))',
              border: '1.5px solid rgba(16,185,129,0.3)',
              borderRadius: 18,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              boxShadow: '0 4px 14px rgba(16,185,129,0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(16,185,129,0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" fillOpacity="0.3" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Background GPS Tracking Active
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {wakeLockActive ? 'Running Mode • Screen Kept Awake' : 'Running in background'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.2)', color: 'var(--primary)', padding: '3px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 800 }}>
                {activePath.length} pts
              </div>
            </div>
          )}

          {/* Empire Telemetry Dashboard Cards */}
          <div className="info-widgets" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            <div className="widget" style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.03))',
              border: '1.5px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 18, padding: '14px 12px', textAlign: 'center',
              boxShadow: '0 4px 14px rgba(16,185,129,0.08)'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary, #10b981)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Area (km²)</div>
              <span className="value" style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-primary, #0f172a)', fontFamily: "'Outfit', sans-serif" }}>
                {(userStats.areaOwned || 0).toFixed(3)}
              </span>
            </div>

            <div className="widget" style={{
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(14, 165, 233, 0.03))',
              border: '1.5px solid rgba(14, 165, 233, 0.25)',
              borderRadius: 18, padding: '14px 12px', textAlign: 'center',
              boxShadow: '0 4px 14px rgba(14,165,233,0.08)'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Empire Score</div>
              <span className="value" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0ea5e9', fontFamily: "'Outfit', sans-serif" }}>
                {userStats.empireScore || 0}
              </span>
            </div>

            <div className="widget" style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.03))',
              border: '1.5px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 18, padding: '14px 12px', textAlign: 'center',
              boxShadow: '0 4px 14px rgba(245,158,11,0.08)'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Hex Cells</div>
              <span className="value" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#f59e0b', fontFamily: "'Outfit', sans-serif" }}>
                {cells.filter(c => c.owner === user?._id || c.owner?._id === user?._id).length}
              </span>
            </div>
          </div>

          {/* Inspect Card */}
          {inspectedCell && (
            <div className="inspect-cell-card" style={{
              background: 'linear-gradient(135deg, var(--bg-secondary, #ffffff) 0%, rgba(16,185,129,0.05) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1.5px solid var(--border-color, rgba(16, 185, 129, 0.3))',
              borderRadius: 24, padding: '20px 22px', marginBottom: 20,
              boxShadow: '0 12px 32px rgba(15,23,42,0.06)'
            }}>
              <div className="card-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>Territory Profile</h4>
                </div>
                <button onClick={() => setInspectedCell(null)} className="close-inspect-btn" style={{ border: 'none', background: 'rgba(0,0,0,0.05)', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>✕</button>
              </div>

              <div className="owner-profile-summary" style={{ marginBottom: 14 }}>
                <div className="owner-avatar-block" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {inspectedCell.owner.image ? (
                    <img src={inspectedCell.owner.image} alt={inspectedCell.owner.displayName} className="profile-large-avatar" style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #10b981' }} />
                  ) : (
                    <div className="profile-large-avatar-fallback" style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem' }}>
                      {inspectedCell.owner.displayName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="profile-name" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{inspectedCell.owner.displayName}</div>
                    <div className="profile-rank" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      GLOBAL RANK: <strong style={{ color: '#10b981' }}>#{inspectedCell.owner.rank || '1'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="inspect-details">
                <div className="stat-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div className="mini-stat" style={{ background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                    <div className="num" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{(inspectedCell.cell?.area || 0).toFixed(4)}</div>
                    <div className="lbl" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Area (km²)</div>
                  </div>
                  <div className="mini-stat" style={{ background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                    <div className="num" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{(inspectedCell.cell?.perimeter || 0).toFixed(2)}</div>
                    <div className="lbl" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Perimeter (km)</div>
                  </div>
                </div>

                <div className="cell-details-divider" style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 6px' }}>DEFENSE TELEMETRY</div>

                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Defense Strength:</span>
                  <strong style={{ color: '#10b981' }}>{(inspectedCell.cell?.strength !== undefined ? inspectedCell.cell.strength : 0)}/100</strong>
                </div>
                <div className="progress-bar-small" style={{ height: 6, background: 'var(--bg-primary)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: 10 }}>
                  <div className="progress-bar-fill" style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', transformOrigin: 'left', transform: `scaleX(${(inspectedCell.cell?.strength || 0) / 100})`, transition: 'transform 0.4s ease' }} />
                </div>

                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, margin: '4px 0', color: 'var(--text-secondary)' }}>
                  <span>Fortification Level:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>Level {inspectedCell.cell?.defenseLevel || 1}</strong>
                </div>
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, margin: '4px 0', color: 'var(--text-secondary)' }}>
                  <span>Attack Laps Required:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{inspectedCell.cell?.defenseLevel || 1} laps</strong>
                </div>
              </div>
            </div>
          )}

          {/* Active Attack Widget */}
          {currentAttackCell && (
            <div className="capture-progress-widget" style={{ borderRadius: 20, padding: '16px 18px', marginBottom: 16, borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', boxShadow: '0 8px 24px rgba(239,68,68,0.15)', border: '1.5px solid #ef4444' }}>
              <div className="loader-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: '#ef4444', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.92rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M16 16l4 4" /><path d="M19 21l2-2" /></svg>
                  Attacking Territory
                </span>
                <strong style={{ color: '#ef4444', fontSize: '0.92rem' }}>
                  {attackLapsCompleted} / {currentAttackCell.defenseLevel} Laps
                </strong>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Perimeter Checkpoints:</span>
                <strong>
                  {Math.round((attackVisitedCheckpoints.filter(v => v).length / (attackCheckpoints.length || 1)) * 100)}%
                </strong>
              </div>

              <div className="loader-bar-track" style={{ height: 8, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 999, overflow: 'hidden', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                <div
                  className="loader-bar-fill"
                  style={{
                    height: '100%', width: '100%',
                    transformOrigin: 'left',
                    transform: `scaleX(${(attackVisitedCheckpoints.filter(v => v).length / (attackCheckpoints.length || 1))})`,
                    background: 'linear-gradient(90deg, #ef4444, #f87171)',
                    transition: 'transform 0.3s ease'
                  }}
                />
              </div>
            </div>
          )}

          {/* Active Walk Path Tracker */}
          {activePath.length > 0 && !currentAttackCell && (
            <div className="capture-progress-widget" style={{ borderRadius: 20, padding: '14px 18px', marginBottom: 16, background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02))', border: '1.5px solid #10b981', boxShadow: '0 8px 24px rgba(16,185,129,0.12)' }}>
              <div className="loader-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#10b981', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.92rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  Tracing Closed Loop
                </span>
                <strong style={{ color: '#10b981', fontSize: '0.92rem' }}>{activePath.length} points</strong>
              </div>
              <span className="cell-id-sub mono" style={{ display: 'block', marginTop: 4, color: '#059669', fontSize: '0.8rem', fontWeight: 600 }}>
                Return near starting point to claim spatial hex!
              </span>
            </div>
          )}

          {/* Empty State Banner */}
          {(!userStats || userStats.areaOwned === 0) && (
            <div style={{
              background: 'var(--bg-input, #F3EFE8)',
              border: '1.5px solid var(--border-color, #EAE4DA)',
              borderRadius: 20,
              padding: '20px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--primary-soft, #E8EFE9)',
                color: 'var(--primary, #4A7C59)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                  <line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />
                </svg>
              </div>
              <div style={{ fontWeight: 800, color: 'var(--text-primary, #1C281F)', fontSize: '0.95rem' }}>
                No territory claimed yet!
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #5F7163)', lineHeight: 1.4, maxWidth: 280 }}>
                Step outside and start moving to claim your first hex cell.
              </div>
            </div>
          )}

          {/* Action Controls */}
          <div className="controls-section" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <button
              onClick={toggleTracking}
              className={`btn ${isTracking ? 'btn-danger' : 'btn-primary'} btn-full`}
              style={{
                height: 48,
                borderRadius: 9999,
                fontSize: '0.92rem',
                fontWeight: 800,
                background: isTracking ? '#DC2626' : 'var(--primary, #4A7C59)',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: isTracking ? '0 4px 14px rgba(220,38,38,0.3)' : '0 4px 14px var(--primary-glow)',
                transition: 'all 0.2s ease'
              }}
            >
              {isTracking ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                  Stop GPS Conquest
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  Start GPS Conquest
                </>
              )}
            </button>

            {activePath.length > 0 && (
              <button
                onClick={() => setActivePath([])}
                className="btn btn-outline btn-full"
                style={{ border: '1.5px dashed var(--border-color)', color: 'var(--text-secondary)', background: 'transparent', height: 44, borderRadius: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Clear Active Path ({activePath.length} points)
              </button>
            )}
          </div>

          {/* Viewport Activity Feed */}
          <div className="activity-feed-section">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif", margin: '0 0 12px', color: 'var(--text-primary)' }}>Nearby Conquest Feed</h3>
            <div className="activity-feed-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activities.map(act => (
                <div key={act._id} className="activity-feed-item">
                  {act.userImage ? (
                    <img src={act.userImage} alt={act.userName} className="act-avatar" />
                  ) : (
                    <div className="act-avatar-fallback">
                      {act.userName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="act-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>{act.userName}</span>
                      <span className="act-time">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="act-message" style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'normal' }}>
                      {act.message}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && <p className="empty" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>No recent territory captures nearby.</p>}
            </div>
          </div>

        </div>{/* end .territory-mobile-content */}
      </div>

      <div className="map-view-container" ref={mapContainer} />
    </div>
  );
};

export default Territories;
