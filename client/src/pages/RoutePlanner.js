import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_API_KEY;

/* ─── Helpers ─────────────────────────────────────────────── */
const MODE_META = {
  walking: { icon: '🚶', color: '#10b981', label: 'Walking',       desc: 'Zero emissions'      },
  cycling: { icon: '🚴', color: '#3b82f6', label: 'Cycling',       desc: 'Fast & eco-friendly'  },
  driving: { icon: '🚗', color: '#ef4444', label: 'Driving',       desc: 'Door to door'         },
  transit: { icon: '🚌', color: '#8b5cf6', label: 'Transit',       desc: 'Shared transport'     },
};

const MANEUVER_ICONS = {
  'turn-right':           '↱',
  'turn-left':            '↰',
  'turn-slight-right':    '↗',
  'turn-slight-left':     '↖',
  'turn-sharp-right':     '⮞',
  'turn-sharp-left':      '⮜',
  'straight':             '↑',
  'continue':             '↑',
  'merge':                '⤵',
  'roundabout':           '↻',
  'rotary':               '↻',
  'fork-right':           '↱',
  'fork-left':            '↰',
  'end-of-road-right':    '↱',
  'end-of-road-left':     '↰',
  'depart':               '📍',
  'arrive':               '🏁',
  default:                '•',
};

function getManeuverIcon(step) {
  if (!step?.type) return MANEUVER_ICONS.default;
  const key = step.modifier ? `${step.type}-${step.modifier}` : step.type;
  return MANEUVER_ICONS[key] || MANEUVER_ICONS[step.type] || MANEUVER_ICONS.default;
}

function formatDist(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(sec) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/* Interpolate a point along a GeoJSON LineString at fraction t ∈ [0,1] */
function interpolateRoute(coords, t) {
  if (!coords || coords.length === 0) return coords[0];
  const totalPts = coords.length - 1;
  const idx = Math.min(Math.floor(t * totalPts), totalPts - 1);
  const rem = t * totalPts - idx;
  const a = coords[idx];
  const b = coords[idx + 1] || a;
  return [a[0] + (b[0] - a[0]) * rem, a[1] + (b[1] - a[1]) * rem];
}

/* ─── Component ───────────────────────────────────────────── */
const RoutePlanner = ({ user }) => {
  const mapContainer      = useRef(null);
  const map               = useRef(null);
  const originGeoRef      = useRef(null);
  const destGeoRef        = useRef(null);
  const originMarkerRef   = useRef(null);
  const destMarkerRef     = useRef(null);
  const travMarkerRef     = useRef(null);  // animated traveller
  const animFrameRef      = useRef(null);
  const animStartRef      = useRef(null);

  const [origin,      setOrigin]      = useState(null);
  const [destination, setDestination] = useState(null);
  const [routes,      setRoutes]      = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [loadingPct,  setLoadingPct]  = useState(0);
  const [weather,     setWeather]     = useState(null);
  const [carbonData,  setCarbonData]  = useState({ today: 0, month: 0, goal: 60, progress: 0 });
  const [modes,       setModes]       = useState(['walking', 'cycling', 'driving']);
  const [showModal,   setShowModal]   = useState(false);
  const [panel,       setPanel]       = useState('routes'); // 'routes' | 'directions'
  const [activeStep,  setActiveStep]  = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [saveMsg,     setSaveMsg]     = useState('');
  const [mapStyle,    setMapStyle]    = useState('streets-v12');

  /* ── map init ── */
  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style:     `mapbox://styles/mapbox/${mapStyle}`,
      center:    [77.2090, 28.6139],
      zoom:      11,
      attributionControl: false,
      logoPosition: 'bottom-right',
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      showUserHeading: true,
    }), 'top-right');
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    map.current.on('load', () => {
      initGeocoders();
      map.current.resize();
    });

    fetchWeather(28.6139, 77.2090);
    fetchCarbonData();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  /* ── geocoders ── */
  const initGeocoders = useCallback(() => {
    const originEl = document.getElementById('geocoder-origin');
    const destEl   = document.getElementById('geocoder-dest');
    if (!originEl || !destEl) return;

    originEl.innerHTML = '';
    destEl.innerHTML   = '';

    const commonOpts = {
      accessToken: mapboxgl.accessToken,
      mapboxgl,
      marker:    false,
      flyTo:     false,
      // No country restriction — full global search
      proximity: { longitude: 77.2090, latitude: 28.6139 }, // bias toward user region
      language:  'en',
      types:     'place,address,poi,district,locality,neighborhood',
    };

    const originGeo = new MapboxGeocoder({
      ...commonOpts,
      placeholder: 'Choose starting point…',
    });

    const destGeo = new MapboxGeocoder({
      ...commonOpts,
      placeholder: 'Choose destination…',
    });

    originGeoRef.current = originGeo;
    destGeoRef.current   = destGeo;

    originEl.appendChild(originGeo.onAdd(map.current));
    destEl.appendChild(destGeo.onAdd(map.current));

    originGeo.on('result', e => {
      const coords = e.result.center;
      setOrigin({ coordinates: coords, name: e.result.place_name });
      placeMarker('origin', coords);
      map.current.flyTo({ center: coords, zoom: 13, duration: 1200 });
    });

    originGeo.on('clear', () => {
      setOrigin(null);
      if (originMarkerRef.current) { originMarkerRef.current.remove(); originMarkerRef.current = null; }
    });

    destGeo.on('result', e => {
      const coords = e.result.center;
      setDestination({ coordinates: coords, name: e.result.place_name });
      placeMarker('dest', coords);
      map.current.flyTo({ center: coords, zoom: 13, duration: 1200 });
    });

    destGeo.on('clear', () => {
      setDestination(null);
      if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null; }
    });
  }, []);

  /* ── markers ── */
  const placeMarker = (type, coords) => {
    const isOrigin = type === 'origin';
    const ref      = isOrigin ? originMarkerRef : destMarkerRef;

    if (ref.current) ref.current.remove();

    const el       = document.createElement('div');
    el.className   = `gr-marker gr-marker-${type}`;
    el.innerHTML   = isOrigin ? `<div class="gr-pin gr-pin-origin">A</div>` : `<div class="gr-pin gr-pin-dest">B</div>`;

    const popup = new mapboxgl.Popup({ offset: 30, closeButton: false })
      .setHTML(`<div class="gr-popup">${isOrigin ? '📍 Start' : '🏁 End'}</div>`);

    ref.current = new mapboxgl.Marker({ element: el })
      .setLngLat(coords)
      .setPopup(popup)
      .addTo(map.current);
  };

  /* ── animated traveller marker ── */
  const createTravellerMarker = (coords, modeIcon) => {
    if (travMarkerRef.current) travMarkerRef.current.remove();

    const el     = document.createElement('div');
    el.className = 'gr-traveller';
    el.innerHTML = `<div class="gr-traveller-inner">${modeIcon}</div>`;

    travMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat(coords)
      .addTo(map.current);
  };

  const animateTraveller = (routeCoords, modeIcon) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const DURATION = 8000; // 8-second preview animation
    animStartRef.current = null;

    createTravellerMarker(routeCoords[0], modeIcon);

    const step = (ts) => {
      if (!animStartRef.current) animStartRef.current = ts;
      const elapsed = ts - animStartRef.current;
      const t = Math.min(elapsed / DURATION, 1);
      const pos = interpolateRoute(routeCoords, t);

      if (travMarkerRef.current) travMarkerRef.current.setLngLat(pos);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  };

  /* ── route display ── */
  const clearRouteLayer = () => {
    if (!map.current) return;
    ['gr-route-outline', 'gr-route-main', 'gr-route-dash'].forEach(id => {
      if (map.current.getLayer(id)) map.current.removeLayer(id);
    });
    if (map.current.getSource('gr-route')) map.current.removeSource('gr-route');
  };

  const displayRoute = useCallback((route) => {
    if (!map.current || !route?.geometry) return;

    clearRouteLayer();

    const color = MODE_META[route.mode]?.color || '#10b981';

    map.current.addSource('gr-route', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: route.geometry },
    });

    // Thick glow
    map.current.addLayer({
      id: 'gr-route-outline',
      type: 'line', source: 'gr-route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': color, 'line-width': 14, 'line-opacity': 0.18 },
    });

    // Solid line
    map.current.addLayer({
      id: 'gr-route-main',
      type: 'line', source: 'gr-route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': color, 'line-width': 5, 'line-opacity': 0.95 },
    });

    // Animated dash
    map.current.addLayer({
      id: 'gr-route-dash',
      type: 'line', source: 'gr-route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#ffffff',
        'line-width': 2.5,
        'line-opacity': 0.7,
        'line-dasharray': [0, 5, 4],
      },
    });

    // Animate dash
    let step = 0;
    const animDash = () => {
      if (!map.current || !map.current.getLayer('gr-route-dash')) return;
      step = (step + 1) % 10;
      map.current.setPaintProperty('gr-route-dash', 'line-dasharray', [step * 0.5, 5, 4]);
      requestAnimationFrame(animDash);
    };
    requestAnimationFrame(animDash);

    // Fit bounds
    if (origin && destination) {
      const bounds = new mapboxgl.LngLatBounds();
      route.geometry.coordinates.forEach(c => bounds.extend(c));
      map.current.fitBounds(bounds, { padding: { top: 80, bottom: 200, left: 80, right: 80 }, duration: 1400 });
    }

    // Animate traveller
    const icon = MODE_META[route.mode]?.icon || '📍';
    animateTraveller(route.geometry.coordinates, icon);
  }, [origin, destination]);

  const selectRoute = useCallback((route) => {
    setSelectedRoute(route);
    displayRoute(route);
    setPanel('routes');
    setActiveStep(null);
    setIsNavigating(false);
  }, [displayRoute]);

  /* ── route planning ── */
  const planRoute = async () => {
    if (!origin || !destination) { alert('Please select both start and destination.'); return; }
    if (modes.length === 0)       { alert('Please select at least one transport mode.'); return; }

    setShowModal(false);
    setLoading(true);
    setRoutes([]);
    setSelectedRoute(null);
    setPanel('routes');
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (travMarkerRef.current) { travMarkerRef.current.remove(); travMarkerRef.current = null; }

    let pct = 0;
    const tick = setInterval(() => {
      pct = Math.min(pct + Math.random() * 10, 90);
      setLoadingPct(pct);
    }, 350);

    try {
      const res = await axios.post('/api/route', {
        origin:         { coordinates: origin.coordinates,      name: origin.name },
        destination:    { coordinates: destination.coordinates, name: destination.name },
        transportModes: modes,
      });

      const data = res.data || [];
      clearInterval(tick);
      setLoadingPct(100);

      setTimeout(() => {
        setLoading(false);
        setLoadingPct(0);
        if (data.length > 0) {
          setRoutes(data);
          selectRoute(data[0]);
          fetchWeather(destination.coordinates[1], destination.coordinates[0]);
        } else {
          alert('No routes found. Try different locations or transport modes.');
        }
      }, 500);
    } catch (err) {
      clearInterval(tick);
      setLoading(false);
      setLoadingPct(0);
      alert(err.response?.data?.error || 'Failed to plan route. Please try again.');
    }
  };

  /* ── navigation simulation ── */
  const startNavigation = (route) => {
    setIsNavigating(true);
    setPanel('directions');
    setActiveStep(0);

    // Re-animate traveller continuously
    if (route?.geometry?.coordinates) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const icon = MODE_META[route.mode]?.icon || '📍';
      animateTraveller(route.geometry.coordinates, icon);
    }

    // Center map on start
    if (origin) {
      map.current.flyTo({ center: origin.coordinates, zoom: 15, pitch: 45, bearing: 30, duration: 1500 });
    }
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setActiveStep(null);
    setPanel('routes');
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (origin && destination) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend(origin.coordinates);
      bounds.extend(destination.coordinates);
      map.current.fitBounds(bounds, { padding: 80, pitch: 0, bearing: 0, duration: 1200 });
    }
  };

  const focusStep = (step, idx) => {
    setActiveStep(idx);
    // zoom to step location on the route geometry
    if (selectedRoute?.geometry?.coordinates) {
      const coords = selectedRoute.geometry.coordinates;
      const stepPct = idx / (selectedRoute.steps?.length || 1);
      const pos = interpolateRoute(coords, stepPct);
      map.current.flyTo({ center: pos, zoom: 16, pitch: 40, duration: 800 });
    }
  };

  /* ── save trip ── */
  const saveTrip = async () => {
    if (!selectedRoute || !origin || !destination) return;
    try {
      await axios.post('/api/history', {
        originName:        origin.name,
        destinationName:   destination.name,
        originCoords:      { lat: origin.coordinates[1],      lng: origin.coordinates[0] },
        destinationCoords: { lat: destination.coordinates[1], lng: destination.coordinates[0] },
        mode:              selectedRoute.mode,
        distance:          parseFloat(selectedRoute.distance),
        duration:          parseInt(selectedRoute.duration),
        co2Saved:          parseFloat(selectedRoute.co2Saved),
        calories:          selectedRoute.calories || 0,
      });
      setSaveMsg('✅ Trip saved!');
      fetchCarbonData();
      setTimeout(() => setSaveMsg(''), 2500);
    } catch (err) {
      setSaveMsg('❌ Save failed.');
      setTimeout(() => setSaveMsg(''), 2500);
    }
  };

  /* ── swap ── */
  const swapLocations = () => {
    const tmp = origin;
    setOrigin(destination);
    setDestination(tmp);

    // Update geocoder text
    const oInput = document.querySelector('#geocoder-origin input');
    const dInput = document.querySelector('#geocoder-dest input');
    if (oInput) oInput.value = destination?.name || '';
    if (dInput) dInput.value = origin?.name || '';

    // Swap markers
    if (destination) placeMarker('origin', destination.coordinates);
    if (origin)      placeMarker('dest',   origin.coordinates);

    clearRouteLayer();
    setRoutes([]);
    setSelectedRoute(null);
  };

  /* ── clear all ── */
  const clearAll = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (travMarkerRef.current)  { travMarkerRef.current.remove();  travMarkerRef.current  = null; }
    if (originMarkerRef.current){ originMarkerRef.current.remove();originMarkerRef.current = null; }
    if (destMarkerRef.current)  { destMarkerRef.current.remove();  destMarkerRef.current  = null; }

    setOrigin(null);
    setDestination(null);
    setRoutes([]);
    setSelectedRoute(null);
    setPanel('routes');
    setIsNavigating(false);
    clearRouteLayer();

    if (originGeoRef.current) originGeoRef.current.clear();
    if (destGeoRef.current)   destGeoRef.current.clear();

    map.current.flyTo({ center: [77.2090, 28.6139], zoom: 11, pitch: 0, bearing: 0, duration: 1200 });
  };

  /* ── map style toggle ── */
  const toggleMapStyle = () => {
    const next = mapStyle === 'streets-v12' ? 'satellite-streets-v12' : 'streets-v12';
    setMapStyle(next);
    map.current.setStyle(`mapbox://styles/mapbox/${next}`);
    // Re-draw route after style loads
    map.current.once('style.load', () => {
      if (selectedRoute) displayRoute(selectedRoute);
    });
  };

  /* ── data fetches ── */
  const fetchWeather = async (lat, lon) => {
    try {
      const res = await axios.get(`/api/weather?lat=${lat}&lon=${lon}`);
      setWeather(res.data);
    } catch { setWeather(null); }
  };

  const fetchCarbonData = async () => {
    try {
      const [hRes, pRes] = await Promise.all([
        axios.get('/api/history'),
        axios.get('/api/preferences'),
      ]);
      const trips = hRes.data;
      const goal  = pRes.data.monthlyGoal || 60;
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      let todayC = 0, monthC = 0;
      trips.forEach(t => {
        const d = new Date(t.date);
        const c = parseFloat(t.co2Saved) || 0;
        if (d.toDateString() === today.toDateString()) todayC += c;
        if (d >= startOfMonth) monthC += c;
      });
      setCarbonData({ today: todayC, month: monthC, goal, progress: Math.min((monthC / goal) * 100, 100) });
    } catch {}
  };

  const weatherIcon = (code) => {
    const m = { '01d':'☀️','01n':'🌙','02d':'⛅','02n':'☁️','03d':'☁️','04d':'☁️',
                '09d':'🌧️','10d':'🌦️','11d':'⛈️','13d':'❄️','50d':'🌫️' };
    return m[code] || '🌤️';
  };

  /* ─── JSX ─────────────────────────────────────────────── */
  const LOAD_MSGS = ['Scanning eco-routes…','Calculating savings…','Optimising journey…','Almost there…'];

  return (
    <div className="gr-shell">
      {/* ── Left panel ── */}
      <aside className="gr-panel">

        {/* Impact strip */}
        <div className="gr-impact">
          <div className="gr-impact-item">
            <span className="gr-impact-val">{carbonData.today.toFixed(1)}</span>
            <span className="gr-impact-lbl">kg today</span>
          </div>
          <div className="gr-impact-sep" />
          <div className="gr-impact-item">
            <span className="gr-impact-val">{carbonData.month.toFixed(1)}</span>
            <span className="gr-impact-lbl">kg this month</span>
          </div>
          <div className="gr-impact-sep" />
          <div className="gr-impact-item gr-impact-goal">
            <span className="gr-impact-val">{carbonData.progress.toFixed(0)}%</span>
            <span className="gr-impact-lbl">of goal</span>
          </div>
          <div className="gr-impact-bar-wrap">
            <div className="gr-impact-bar" style={{ width: `${carbonData.progress}%` }} />
          </div>
        </div>

        {/* Search area */}
        <div className="gr-search-area">
          <div className="gr-search-row">
            <div className="gr-dot gr-dot-a">A</div>
            <div className="gr-geocoder-wrap" id="geocoder-origin" />
          </div>
          <div className="gr-search-divider">
            <button
              className="gr-swap-btn"
              onClick={swapLocations}
              disabled={!origin && !destination}
              title="Swap"
            >⇅</button>
          </div>
          <div className="gr-search-row">
            <div className="gr-dot gr-dot-b">B</div>
            <div className="gr-geocoder-wrap" id="geocoder-dest" />
          </div>

          <div className="gr-search-actions">
            {(origin || destination) && (
              <button className="gr-btn-ghost" onClick={clearAll}>✕ Clear</button>
            )}
            <button
              className="gr-btn-primary"
              onClick={() => (origin && destination) ? setShowModal(true) : alert('Set both locations first.')}
              disabled={loading}
            >
              {loading
                ? <><span className="gr-spin" />{LOAD_MSGS[Math.floor(loadingPct / 25)]}</>
                : '🔍 Find Routes'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        {routes.length > 0 && (
          <div className="gr-tabs">
            <button
              className={`gr-tab ${panel === 'routes' ? 'active' : ''}`}
              onClick={() => { setPanel('routes'); setIsNavigating(false); }}
            >Routes</button>
            <button
              className={`gr-tab ${panel === 'directions' ? 'active' : ''}`}
              onClick={() => selectedRoute && setPanel('directions')}
              disabled={!selectedRoute}
            >Directions</button>
          </div>
        )}

        {/* Routes list */}
        {panel === 'routes' && routes.length > 0 && (
          <div className="gr-routes">
            {routes.map((route, i) => {
              const meta = MODE_META[route.mode] || {};
              const sel  = selectedRoute?.id === route.id;
              return (
                <div
                  key={route.id || i}
                  className={`gr-route ${sel ? 'gr-route-sel' : ''}`}
                  onClick={() => selectRoute(route)}
                  style={{ '--rc': meta.color }}
                >
                  <div className="gr-route-head">
                    <div className="gr-route-icon">{meta.icon}</div>
                    <div className="gr-route-title">
                      <span className="gr-route-name">{meta.label}</span>
                      {i === 0 && <span className="gr-badge-best">Best</span>}
                      {route.difficulty && <span className={`gr-badge-diff gr-diff-${route.difficulty?.toLowerCase()}`}>{route.difficulty}</span>}
                    </div>
                    <div className="gr-route-eta">arrives {route.estimatedArrival}</div>
                  </div>

                  <div className="gr-route-stats">
                    <div className="gr-stat">
                      <span className="gr-stat-icon">⏱</span>
                      <strong>{route.duration}</strong>
                      <span>min</span>
                    </div>
                    <div className="gr-stat">
                      <span className="gr-stat-icon">📏</span>
                      <strong>{route.distance}</strong>
                      <span>km</span>
                    </div>
                    <div className="gr-stat gr-stat-eco">
                      <span className="gr-stat-icon">🌱</span>
                      <strong>{route.co2Saved}</strong>
                      <span>kg CO₂</span>
                    </div>
                    {route.calories > 0 && (
                      <div className="gr-stat">
                        <span className="gr-stat-icon">🔥</span>
                        <strong>{route.calories}</strong>
                        <span>cal</span>
                      </div>
                    )}
                    {route.cost > 0 && (
                      <div className="gr-stat">
                        <span className="gr-stat-icon">₹</span>
                        <strong>{route.cost}</strong>
                        <span>est.</span>
                      </div>
                    )}
                  </div>

                  {sel && (
                    <div className="gr-route-ctas">
                      <button
                        className="gr-cta-nav"
                        onClick={e => { e.stopPropagation(); startNavigation(route); setPanel('directions'); }}
                      >
                        ▶ Start Navigation
                      </button>
                      <button
                        className="gr-cta-save"
                        onClick={e => { e.stopPropagation(); saveTrip(); }}
                      >
                        💾 Save
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {saveMsg && <div className="gr-save-msg">{saveMsg}</div>}
          </div>
        )}

        {/* Directions panel */}
        {panel === 'directions' && selectedRoute && (
          <div className="gr-directions">
            <div className="gr-dir-header">
              <div className="gr-dir-summary">
                <span className="gr-dir-mode">{MODE_META[selectedRoute.mode]?.icon}</span>
                <div>
                  <div className="gr-dir-title">
                    {origin?.name?.split(',')[0]} → {destination?.name?.split(',')[0]}
                  </div>
                  <div className="gr-dir-meta">
                    {selectedRoute.duration} min · {selectedRoute.distance} km
                  </div>
                </div>
              </div>
              {isNavigating && (
                <button className="gr-btn-stop" onClick={stopNavigation}>✕ Stop</button>
              )}
              {!isNavigating && (
                <button className="gr-cta-nav-sm" onClick={() => startNavigation(selectedRoute)}>
                  ▶ Start
                </button>
              )}
            </div>

            <div className="gr-steps">
              {selectedRoute.steps?.map((step, idx) => (
                <div
                  key={idx}
                  className={`gr-step ${activeStep === idx ? 'gr-step-active' : ''}`}
                  onClick={() => focusStep(step, idx)}
                >
                  <div className="gr-step-icon">
                    {getManeuverIcon(step)}
                  </div>
                  <div className="gr-step-body">
                    <div className="gr-step-instruction">{step.instruction}</div>
                    <div className="gr-step-dist">
                      {step.distance > 0 && <span>{formatDist(step.distance)}</span>}
                      {step.duration > 0 && <span> · {formatDuration(step.duration)}</span>}
                    </div>
                  </div>
                  {activeStep === idx && <div className="gr-step-arrow">›</div>}
                </div>
              ))}

              {/* Arrival */}
              <div className="gr-step gr-step-arrive">
                <div className="gr-step-icon">🏁</div>
                <div className="gr-step-body">
                  <div className="gr-step-instruction">Arrive at {destination?.name?.split(',')[0]}</div>
                  <div className="gr-step-dist">You have reached your destination</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Weather */}
        {weather && panel === 'routes' && (
          <div className="gr-weather">
            <span className="gr-weather-ico">{weatherIcon(weather.weather?.[0]?.icon)}</span>
            <div className="gr-weather-body">
              <span className="gr-weather-temp">{Math.round(weather.main?.temp)}°C</span>
              <span className="gr-weather-desc">{weather.weather?.[0]?.description}</span>
            </div>
            <div className="gr-weather-extra">
              <span>💧 {weather.main?.humidity}%</span>
              <span>💨 {Math.round((weather.wind?.speed || 0) * 3.6)} km/h</span>
            </div>
          </div>
        )}
      </aside>

      {/* ── Map ── */}
      <main className="gr-map-area">
        <div ref={mapContainer} className="gr-map" />

        {/* Map style toggle */}
        <button className="gr-style-toggle" onClick={toggleMapStyle} title="Toggle satellite">
          {mapStyle === 'streets-v12' ? '🛰️' : '🗺️'}
        </button>

        {/* Loading overlay */}
        {loading && (
          <div className="gr-loading">
            <div className="gr-loading-box">
              <svg className="gr-loading-ring" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" className="gr-ring-bg" />
                <circle
                  cx="50" cy="50" r="40"
                  className="gr-ring-fill"
                  style={{ strokeDasharray: `${loadingPct * 2.51} 251` }}
                />
              </svg>
              <div className="gr-loading-leaf">🌱</div>
              <div className="gr-loading-pct">{Math.round(loadingPct)}%</div>
              <div className="gr-loading-msg">{LOAD_MSGS[Math.floor(loadingPct / 25) % 4]}</div>
            </div>
          </div>
        )}
      </main>

      {/* ── Transport modal ── */}
      {showModal && (
        <div className="gr-overlay" onClick={() => setShowModal(false)}>
          <div className="gr-modal" onClick={e => e.stopPropagation()}>
            <div className="gr-modal-head">
              <h3>Choose Transport</h3>
              <button className="gr-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <p className="gr-modal-sub">Select one or more travel modes to compare.</p>
            <div className="gr-mode-grid">
              {Object.entries(MODE_META).map(([id, meta]) => (
                <button
                  key={id}
                  className={`gr-mode-btn ${modes.includes(id) ? 'active' : ''}`}
                  style={{ '--mc': meta.color }}
                  onClick={() => setModes(prev =>
                    prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
                  )}
                >
                  <span className="gr-mode-ico">{meta.icon}</span>
                  <span className="gr-mode-name">{meta.label}</span>
                  <span className="gr-mode-desc">{meta.desc}</span>
                  {modes.includes(id) && <span className="gr-mode-check">✓</span>}
                </button>
              ))}
            </div>
            <div className="gr-modal-foot">
              <button className="gr-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="gr-btn-primary"
                onClick={planRoute}
                disabled={modes.length === 0}
              >Find Routes →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Styles ── */}
      <style>{`
        /* ── Shell ── */
        .gr-shell {
          display: flex;
          height: 100vh;
          width: 100%;
          font-family: 'Be Vietnam Pro', -apple-system, sans-serif;
          background: #f0f4f8;
          overflow: hidden;
        }

        /* ── Panel ── */
        .gr-panel {
          width: 380px;
          min-width: 340px;
          max-width: 400px;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background: #fff;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 0;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }

        .gr-panel::-webkit-scrollbar { width: 5px; }
        .gr-panel::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

        /* ── Impact strip ── */
        .gr-impact {
          background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%);
          padding: 14px 16px 10px;
          display: flex;
          align-items: flex-start;
          gap: 0;
          flex-wrap: wrap;
          position: relative;
          overflow: hidden;
        }

        .gr-impact::before {
          content: '';
          position: absolute;
          top: -20px; right: -20px;
          width: 100px; height: 100px;
          background: rgba(255,255,255,0.04);
          border-radius: 50%;
        }

        .gr-impact-item {
          flex: 1;
          text-align: center;
        }

        .gr-impact-val {
          display: block;
          font-size: 1.4rem;
          font-weight: 800;
          color: #fff;
          line-height: 1;
          letter-spacing: -0.03em;
        }

        .gr-impact-lbl {
          display: block;
          font-size: 0.65rem;
          color: rgba(255,255,255,0.65);
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .gr-impact-sep {
          width: 1px;
          height: 30px;
          background: rgba(255,255,255,0.15);
          margin: 2px 4px 0;
        }

        .gr-impact-goal .gr-impact-val { color: #6ee7b7; }

        .gr-impact-bar-wrap {
          width: 100%;
          height: 3px;
          background: rgba(255,255,255,0.2);
          border-radius: 2px;
          margin-top: 10px;
          overflow: hidden;
        }

        .gr-impact-bar {
          height: 100%;
          background: linear-gradient(90deg, #6ee7b7, #34d399);
          border-radius: 2px;
          transition: width 0.6s ease;
        }

        /* ── Search ── */
        .gr-search-area {
          padding: 14px 14px 12px;
          background: #fff;
          border-bottom: 1px solid #f1f5f9;
        }

        .gr-search-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }

        .gr-dot {
          width: 28px;
          height: 28px;
          min-width: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 800;
          color: #fff;
          flex-shrink: 0;
        }

        .gr-dot-a { background: #10b981; }
        .gr-dot-b { background: #ef4444; }

        .gr-geocoder-wrap {
          flex: 1;
          min-width: 0;
        }

        /* Mapbox geocoder overrides */
        .gr-geocoder-wrap .mapboxgl-ctrl-geocoder {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 100% !important;
          background: #f8fafc !important;
          border: 1.5px solid #e2e8f0 !important;
          border-radius: 10px !important;
          box-shadow: none !important;
          font-family: inherit !important;
        }

        .gr-geocoder-wrap .mapboxgl-ctrl-geocoder:focus-within {
          border-color: #10b981 !important;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.12) !important;
          background: #fff !important;
        }

        .gr-geocoder-wrap .mapboxgl-ctrl-geocoder--input {
          height: 42px !important;
          padding: 0 36px 0 40px !important;
          font-size: 13.5px !important;
          color: #1e293b !important;
          font-family: inherit !important;
          background: transparent !important;
        }

        .gr-geocoder-wrap .mapboxgl-ctrl-geocoder--input::placeholder { color: #94a3b8 !important; }
        .gr-geocoder-wrap .mapboxgl-ctrl-geocoder--input:focus { outline: none !important; }
        .gr-geocoder-wrap .mapboxgl-ctrl-geocoder--icon { fill: #94a3b8 !important; }
        .gr-geocoder-wrap .mapboxgl-ctrl-geocoder--icon-search { left: 11px !important; top: 11px !important; }

        .gr-geocoder-wrap .suggestions-wrapper,
        .gr-geocoder-wrap .mapboxgl-ctrl-geocoder .suggestions-wrapper {
          position: absolute !important;
          z-index: 99999 !important;
          top: 100% !important;
          left: 0 !important;
          right: 0 !important;
        }

        .gr-geocoder-wrap .suggestions,
        .gr-geocoder-wrap .mapboxgl-ctrl-geocoder .suggestions {
          position: relative !important;
          background: #fff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.13) !important;
          margin-top: 6px !important;
          overflow: hidden !important;
          max-height: 260px !important;
          overflow-y: auto !important;
          z-index: 99999 !important;
        }

        .gr-geocoder-wrap .suggestions li,
        .gr-geocoder-wrap .mapboxgl-ctrl-geocoder .suggestions li {
          padding: 12px 14px !important;
          border-bottom: 1px solid #f8fafc !important;
          cursor: pointer !important;
          transition: background 0.12s !important;
          list-style: none !important;
        }

        .gr-geocoder-wrap .suggestions li:hover,
        .gr-geocoder-wrap .mapboxgl-ctrl-geocoder .suggestions li.active,
        .gr-geocoder-wrap .mapboxgl-ctrl-geocoder .suggestions li:hover {
          background: #f0fdf4 !important;
        }

        .gr-geocoder-wrap .suggestions li a,
        .gr-geocoder-wrap .mapboxgl-ctrl-geocoder .suggestions li a {
          text-decoration: none !important;
          color: #1e293b !important;
          font-size: 13px !important;
          display: block !important;
        }

        .gr-geocoder-wrap .mapboxgl-ctrl-geocoder--suggestion-title {
          font-weight: 600 !important;
          color: #1e293b !important;
        }

        .gr-geocoder-wrap .mapboxgl-ctrl-geocoder--suggestion-address {
          font-size: 11.5px !important;
          color: #64748b !important;
          margin-top: 1px !important;
        }

        .gr-search-divider {
          display: flex;
          align-items: center;
          padding: 2px 0 2px 8px;
        }

        .gr-swap-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .gr-swap-btn:hover:not(:disabled) {
          border-color: #10b981;
          color: #10b981;
          background: #f0fdf4;
        }

        .gr-swap-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .gr-search-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
          align-items: center;
        }

        /* ── Buttons ── */
        .gr-btn-primary {
          flex: 1;
          padding: 11px 16px;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          transition: all 0.18s;
          box-shadow: 0 3px 10px rgba(16,185,129,0.28);
          font-family: inherit;
          letter-spacing: 0.01em;
        }

        .gr-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(16,185,129,0.38);
        }

        .gr-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .gr-btn-ghost {
          padding: 11px 14px;
          background: none;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
          white-space: nowrap;
        }

        .gr-btn-ghost:hover { border-color: #ef4444; color: #ef4444; background: #fff5f5; }

        .gr-spin {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Tabs ── */
        .gr-tabs {
          display: flex;
          border-bottom: 1px solid #f1f5f9;
          background: #fff;
        }

        .gr-tab {
          flex: 1;
          padding: 11px 0;
          background: none;
          border: none;
          border-bottom: 2.5px solid transparent;
          font-size: 13.5px;
          font-weight: 600;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }

        .gr-tab.active { color: #10b981; border-bottom-color: #10b981; }
        .gr-tab:hover:not(.active) { color: #475569; }
        .gr-tab:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Routes ── */
        .gr-routes {
          display: flex;
          flex-direction: column;
          gap: 0;
          padding: 10px 12px;
          flex: 1;
        }

        .gr-route {
          background: #f8fafc;
          border: 2px solid transparent;
          border-radius: 14px;
          padding: 13px 14px;
          cursor: pointer;
          transition: all 0.18s;
          margin-bottom: 8px;
          position: relative;
          overflow: hidden;
        }

        .gr-route::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: var(--rc, #10b981);
          border-radius: 14px 0 0 14px;
          opacity: 0;
          transition: opacity 0.18s;
        }

        .gr-route:hover { background: #fff; border-color: #e2e8f0; }
        .gr-route:hover::before { opacity: 0.5; }

        .gr-route.gr-route-sel {
          background: #fff;
          border-color: var(--rc, #10b981);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--rc) 12%, transparent);
        }

        .gr-route.gr-route-sel::before { opacity: 1; }

        .gr-route-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .gr-route-icon {
          font-size: 1.5rem;
          width: 40px; height: 40px;
          background: color-mix(in srgb, var(--rc) 12%, #fff);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .gr-route-title {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .gr-route-name {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
        }

        .gr-badge-best {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #78350f;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .gr-badge-diff {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 20px;
        }

        .gr-diff-easy     { background: #d1fae5; color: #065f46; }
        .gr-diff-moderate { background: #fef3c7; color: #92400e; }
        .gr-diff-challenging { background: #fee2e2; color: #991b1b; }

        .gr-route-eta {
          font-size: 11.5px;
          color: #64748b;
          white-space: nowrap;
        }

        .gr-route-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: 10px 12px;
          background: #f1f5f9;
          border-radius: 9px;
        }

        .gr-stat {
          display: flex;
          align-items: baseline;
          gap: 3px;
          font-size: 12.5px;
          color: #64748b;
        }

        .gr-stat strong { font-size: 14px; font-weight: 700; color: #1e293b; }
        .gr-stat-eco strong { color: #10b981; }
        .gr-stat-icon { font-size: 13px; }

        .gr-route-ctas {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }

        .gr-cta-nav {
          flex: 1;
          padding: 9px 12px;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 9px;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }

        .gr-cta-nav:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,0.3); }

        .gr-cta-save {
          padding: 9px 14px;
          background: #f1f5f9;
          border: 1.5px solid #e2e8f0;
          border-radius: 9px;
          color: #475569;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
          white-space: nowrap;
        }

        .gr-cta-save:hover { border-color: #10b981; color: #10b981; background: #f0fdf4; }

        .gr-save-msg {
          text-align: center;
          font-size: 13px;
          font-weight: 600;
          padding: 10px;
          border-radius: 9px;
          background: #f0fdf4;
          color: #065f46;
          animation: fadeSlide 0.3s ease;
        }

        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Directions ── */
        .gr-directions {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }

        .gr-dir-header {
          padding: 12px 14px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          flex-shrink: 0;
        }

        .gr-dir-summary {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }

        .gr-dir-mode { font-size: 1.6rem; }

        .gr-dir-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .gr-dir-meta { font-size: 12px; color: #64748b; margin-top: 1px; }

        .gr-btn-stop {
          padding: 7px 12px;
          background: #fee2e2;
          border: none;
          border-radius: 8px;
          color: #ef4444;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          font-family: inherit;
        }

        .gr-btn-stop:hover { background: #fecaca; }

        .gr-cta-nav-sm {
          padding: 7px 12px;
          background: #10b981;
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          font-family: inherit;
        }

        .gr-steps {
          flex: 1;
          overflow-y: auto;
          padding: 8px 12px 20px;
        }

        .gr-step {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 11px 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s;
          border-bottom: 1px solid #f8fafc;
          position: relative;
        }

        .gr-step:hover { background: #f8fafc; }
        .gr-step.gr-step-active { background: #f0fdf4; border-color: transparent; }
        .gr-step.gr-step-arrive { opacity: 0.75; cursor: default; }

        .gr-step-icon {
          width: 32px; height: 32px;
          min-width: 32px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          color: #334155;
          transition: background 0.15s;
        }

        .gr-step.gr-step-active .gr-step-icon {
          background: #10b981;
          color: #fff;
        }

        .gr-step-body { flex: 1; min-width: 0; }

        .gr-step-instruction {
          font-size: 13.5px;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.4;
        }

        .gr-step-dist {
          font-size: 11.5px;
          color: #94a3b8;
          margin-top: 2px;
        }

        .gr-step-arrow {
          color: #10b981;
          font-size: 1.2rem;
          font-weight: 700;
          flex-shrink: 0;
          align-self: center;
        }

        /* ── Weather ── */
        .gr-weather {
          margin: 10px 12px 14px;
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          border-radius: 14px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #fff;
          flex-shrink: 0;
        }

        .gr-weather-ico { font-size: 2rem; }

        .gr-weather-body { flex: 1; }
        .gr-weather-temp { font-size: 1.4rem; font-weight: 800; }
        .gr-weather-desc { font-size: 11.5px; opacity: 0.85; text-transform: capitalize; margin-top: 1px; display: block; }

        .gr-weather-extra {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 11.5px;
          opacity: 0.8;
        }

        /* ── Map area ── */
        .gr-map-area {
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        .gr-map {
          width: 100%;
          height: 100%;
        }

        .gr-style-toggle {
          position: absolute;
          bottom: 100px;
          right: 14px;
          width: 40px; height: 40px;
          border-radius: 10px;
          border: 2px solid rgba(255,255,255,0.8);
          background: #fff;
          font-size: 1.2rem;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.15);
          transition: transform 0.15s;
          z-index: 10;
        }

        .gr-style-toggle:hover { transform: scale(1.08); }

        /* ── Loading ── */
        .gr-loading {
          position: absolute; inset: 0;
          background: rgba(6, 78, 59, 0.92);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 500;
        }

        .gr-loading-box { text-align: center; color: #fff; position: relative; }

        .gr-loading-ring {
          width: 110px; height: 110px;
          transform: rotate(-90deg);
          display: block;
          margin: 0 auto 16px;
        }

        .gr-ring-bg { fill: none; stroke: rgba(255,255,255,0.15); stroke-width: 7; }

        .gr-ring-fill {
          fill: none;
          stroke: #6ee7b7;
          stroke-width: 7;
          stroke-linecap: round;
          stroke-dasharray: 0 251;
          transition: stroke-dasharray 0.35s ease;
        }

        .gr-loading-leaf {
          position: absolute;
          top: 18px; left: 50%;
          transform: translateX(-50%);
          font-size: 2.2rem;
          animation: pulse 1.8s ease-in-out infinite;
        }

        @keyframes pulse {
          0%,100% { transform: translateX(-50%) scale(1); }
          50%      { transform: translateX(-50%) scale(1.1); }
        }

        .gr-loading-pct { font-size: 1rem; font-weight: 700; margin-bottom: 6px; }
        .gr-loading-msg { font-size: 14px; opacity: 0.85; }

        /* ── Modal ── */
        .gr-overlay {
          position: fixed; inset: 0;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 9000;
          animation: fadeIn 0.18s ease;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .gr-modal {
          background: #fff;
          border-radius: 20px;
          padding: 24px;
          width: 90%; max-width: 420px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.22);
          animation: modalPop 0.25s ease;
        }

        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .gr-modal-head {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 6px;
        }

        .gr-modal-head h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #1e293b; }

        .gr-modal-close {
          width: 30px; height: 30px;
          border-radius: 50%;
          border: none;
          background: #f1f5f9;
          color: #64748b;
          font-size: 13px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }

        .gr-modal-close:hover { background: #e2e8f0; color: #1e293b; }

        .gr-modal-sub {
          font-size: 13px;
          color: #64748b;
          margin: 0 0 18px 0;
        }

        .gr-mode-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 20px;
        }

        .gr-mode-btn {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 10px 14px;
          background: #f8fafc;
          border: 2px solid transparent;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.18s;
          font-family: inherit;
        }

        .gr-mode-btn:hover { background: #fff; border-color: #e2e8f0; transform: translateY(-2px); }

        .gr-mode-btn.active {
          background: #fff;
          border-color: var(--mc, #10b981);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--mc) 14%, transparent);
        }

        .gr-mode-ico { font-size: 2rem; margin-bottom: 5px; }
        .gr-mode-name { font-size: 13.5px; font-weight: 700; color: #1e293b; }
        .gr-mode-desc { font-size: 11px; color: #64748b; margin-top: 2px; }

        .gr-mode-check {
          position: absolute;
          top: 8px; right: 8px;
          width: 20px; height: 20px;
          background: var(--mc, #10b981);
          color: #fff;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px;
          font-weight: 800;
        }

        .gr-modal-foot {
          display: flex;
          gap: 10px;
        }

        /* ── Map markers ── */
        .gr-pin {
          width: 28px; height: 28px;
          border-radius: 50% 50% 50% 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px;
          font-weight: 800;
          color: #fff;
          transform: rotate(-45deg);
          box-shadow: 0 3px 10px rgba(0,0,0,0.25);
        }

        .gr-pin > * { transform: rotate(45deg); }

        .gr-pin-origin { background: #10b981; }
        .gr-pin-dest   { background: #ef4444; }

        /* Animated traveller */
        .gr-traveller {
          width: 36px; height: 36px;
          filter: drop-shadow(0 3px 6px rgba(0,0,0,0.25));
        }

        .gr-traveller-inner {
          width: 100%; height: 100%;
          background: #fff;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem;
          border: 3px solid #10b981;
          animation: travelPulse 1.5s ease-in-out infinite;
        }

        @keyframes travelPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
          50%      { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
        }

        /* gr-popup */
        .gr-popup {
          padding: 6px 10px;
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .gr-shell { flex-direction: column; }
          .gr-panel {
            width: 100%;
            max-width: 100%;
            min-width: unset;
            height: auto;
            max-height: 48vh;
            border-right: none;
            border-bottom: 1px solid #e2e8f0;
          }
          .gr-map-area { height: 52vh; flex: unset; }
        }

        @media (max-width: 480px) {
          .gr-impact-val { font-size: 1.1rem; }
          .gr-route-stats { gap: 8px; }
        }
      `}</style>
    </div>
  );
};

export default RoutePlanner;