import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_API_KEY ;

const RoutePlanner = ({ user }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const originGeocoderRef = useRef(null);
  const destinationGeocoderRef = useRef(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [carbonData, setCarbonData] = useState({ today: 2.3, month: 47.8, goal: 60, progress: 80 });
  const [weather, setWeather] = useState(null);
  const [showSteps, setShowSteps] = useState(false);
  const [showTransportOptions, setShowTransportOptions] = useState(false);
  const [selectedTransportModes, setSelectedTransportModes] = useState(['walking', 'cycling', 'driving']);
  const [originMarker, setOriginMarker] = useState(null);
  const [destinationMarker, setDestinationMarker] = useState(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const transportOptions = [
    { id: 'walking', label: 'Walking', icon: '🚶', profile: 'walking', description: 'Zero emissions', color: '#10b981' },
    { id: 'cycling', label: 'Cycling', icon: '🚴', profile: 'cycling', description: 'Fast & eco-friendly', color: '#3b82f6' },
    { id: 'driving', label: 'Driving', icon: '🚗', profile: 'driving-traffic', description: 'Quick trips', color: '#ef4444' },
    { id: 'transit', label: 'Transit', icon: '🚌', profile: 'driving', description: 'Shared transport', color: '#8b5cf6' }
  ];

  const loadingMessages = [
    "Scanning eco-friendly routes...",
    "Calculating carbon savings...",
    "Analyzing traffic patterns...",
    "Optimizing your journey...",
    "Finding the best options..."
  ];

  const initializeGeocoders = useCallback(() => {
    // Clear existing geocoders
    const originContainer = document.getElementById('origin-geocoder');
    const destContainer = document.getElementById('destination-geocoder');
    
    if (originContainer) originContainer.innerHTML = '';
    if (destContainer) destContainer.innerHTML = '';

    const originGeocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      placeholder: 'Enter starting location...',
      marker: false,
      countries: 'in',
      bbox: [68.1766451354, 7.96553477623, 97.4025614766, 35.4940095078],
      flyTo: false
    });

    const destinationGeocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      placeholder: 'Enter destination...',
      marker: false,
      countries: 'in',
      bbox: [68.1766451354, 7.96553477623, 97.4025614766, 35.4940095078],
      flyTo: false
    });

    originGeocoderRef.current = originGeocoder;
    destinationGeocoderRef.current = destinationGeocoder;
    
    if (originContainer) {
      originContainer.appendChild(originGeocoder.onAdd(map.current));
    }
    
    if (destContainer) {
      destContainer.appendChild(destinationGeocoder.onAdd(map.current));
    }

    originGeocoder.on('result', (e) => {
      const coords = e.result.center;
      setOrigin({ coordinates: coords, name: e.result.place_name });
      setShowQuickActions(true);
      
      if (originMarker) originMarker.remove();
      
      const el = document.createElement('div');
      el.className = 'custom-marker origin-marker';
      el.innerHTML = '📍';
      
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(coords)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div style="padding: 10px; font-weight: 600; font-size: 14px;">📍 Starting Point</div>`
        ))
        .addTo(map.current);
      setOriginMarker(marker);
      
      map.current.flyTo({ center: coords, zoom: 14, duration: 1500, essential: true });
    });

    destinationGeocoder.on('result', (e) => {
      const coords = e.result.center;
      setDestination({ coordinates: coords, name: e.result.place_name });
      setShowQuickActions(true);
      
      if (destinationMarker) destinationMarker.remove();
      
      const el = document.createElement('div');
      el.className = 'custom-marker destination-marker';
      el.innerHTML = '🎯';
      
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(coords)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div style="padding: 10px; font-weight: 600; font-size: 14px;">🎯 Destination</div>`
        ))
        .addTo(map.current);
      setDestinationMarker(marker);
      
      if (origin) {
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend(origin.coordinates);
        bounds.extend(coords);
        map.current.fitBounds(bounds, { padding: 100, duration: 1500 });
      } else {
        map.current.flyTo({ center: coords, zoom: 14, duration: 1500 });
      }
    });
  }, [origin, originMarker, destinationMarker]);

  useEffect(() => {
    if (map.current) return;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [77.2090, 28.6139],
      zoom: 10,
      attributionControl: false
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.current.on('load', () => {
      initializeGeocoders();
      map.current.resize();
    });

    fetchWeatherData(28.6139, 77.2090);
    fetchCarbonData();
  }, [initializeGeocoders]);

  useEffect(() => {
    if (loading) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 12;
        if (progress > 95) progress = 95;
        setLoadingProgress(progress);
      }, 400);
      return () => clearInterval(interval);
    } else {
      setLoadingProgress(0);
    }
  }, [loading]);

  const fetchWeatherData = async (lat, lon) => {
    try {
      const response = await axios.get(`/api/weather?lat=${lat}&lon=${lon}`);
      setWeather(response.data);
    } catch (error) {
      console.error('Weather fetch error:', error);
      setWeather({
        main: { temp: 28, humidity: 65 },
        weather: [{ description: 'partly cloudy', icon: '02d' }],
        wind: { speed: 3.5 }
      });
    }
  };

  const fetchCarbonData = async () => {
    try {
      const response = await axios.get('/api/history');
      const trips = response.data;
      
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      let todayCarbon = 0;
      let monthCarbon = 0;
      
      trips.forEach(trip => {
        const tripDate = new Date(trip.date);
        const carbon = parseFloat(trip.co2Saved) || 0;
        
        if (tripDate.toDateString() === today.toDateString()) todayCarbon += carbon;
        if (tripDate >= startOfMonth) monthCarbon += carbon;
      });

      const prefsResponse = await axios.get('/api/preferences');
      const monthlyGoal = prefsResponse.data.monthlyGoal || 60;
      const progress = Math.min((monthCarbon / monthlyGoal) * 100, 100);
      
      setCarbonData({ today: todayCarbon, month: monthCarbon, goal: monthlyGoal, progress });
    } catch (error) {
      console.error('Error fetching carbon data:', error);
    }
  };

  const planRoute = async () => {
    if (!origin || !destination) {
      alert('🗺️ Please select both starting location and destination');
      return;
    }

    if (selectedTransportModes.length === 0) {
      alert('🚦 Please select at least one transport mode');
      return;
    }

    setShowTransportOptions(false);
    setLoading(true);
    setRoutes([]);
    setSelectedRoute(null);
    
    try {
      const response = await axios.post('/api/route', {
        origin: { coordinates: origin.coordinates, name: origin.name },
        destination: { coordinates: destination.coordinates, name: destination.name },
        transportModes: selectedTransportModes
      });

      setTimeout(() => {
        setLoadingProgress(100);
        const suggestedRoutes = response.data;
        
        if (suggestedRoutes.length > 0) {
          setRoutes(suggestedRoutes);
          selectRoute(suggestedRoutes[0]);
          fetchWeatherData(destination.coordinates[1], destination.coordinates[0]);
        } else {
          alert('No routes found. Please try different locations or transport modes.');
        }
      }, 600);
      
    } catch (error) {
      console.error('Route planning error:', error);
      alert(error.response?.data?.error || 'Failed to plan route. Please try again.');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  const displayRoute = (route) => {
    if (!map.current || !route?.geometry) return;
  
    const mapInstance = map.current;
  
    if (mapInstance.getSource('route')) {
      if (mapInstance.getLayer('route-animation')) mapInstance.removeLayer('route-animation');
      if (mapInstance.getLayer('route-glow')) mapInstance.removeLayer('route-glow');
      if (mapInstance.getLayer('route')) mapInstance.removeLayer('route');
      mapInstance.removeSource('route');
    }
  
    mapInstance.addSource('route', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: route.geometry }
    });
  
    mapInstance.addLayer({
      id: 'route-glow',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 
        'line-color': getRouteColor(route.mode), 
        'line-width': 12, 
        'line-opacity': 0.3,
        'line-blur': 8
      }
    });

    mapInstance.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 
        'line-color': getRouteColor(route.mode), 
        'line-width': 6, 
        'line-opacity': 0.9
      }
    });
  
    mapInstance.addLayer({
      id: 'route-animation',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#ffffff',
        'line-width': 4,
        'line-opacity': 0.6,
        'line-dasharray': [0, 4, 3]
      }
    });
  
    if (origin && destination) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend(origin.coordinates);
      bounds.extend(destination.coordinates);
      mapInstance.fitBounds(bounds, { padding: 100, duration: 1500 });
    }
  };

  const selectRoute = (route) => {
    setSelectedRoute(route);
    displayRoute(route);
    setShowSteps(false);
  };

  const saveTrip = async () => {
    if (!selectedRoute || !origin || !destination) return;

    try {
      await axios.post('/api/history', {
        originName: origin.name,
        destinationName: destination.name,
        originCoords: { lat: origin.coordinates[1], lng: origin.coordinates[0] },
        destinationCoords: { lat: destination.coordinates[1], lng: destination.coordinates[0] },
        mode: selectedRoute.mode,
        distance: parseFloat(selectedRoute.distance),
        duration: parseInt(selectedRoute.duration),
        co2Saved: parseFloat(selectedRoute.co2Saved),
        calories: selectedRoute.calories || 0
      });
      
      alert('🌱 Trip saved successfully! Your green journey has been recorded.');
      fetchCarbonData();
    } catch (error) {
      console.error('Save trip error:', error);
      alert(error.response?.data?.error || 'Failed to save trip.');
    }
  };

  const swapLocations = () => {
    if (!origin && !destination) return;
    
    if (originMarker) originMarker.remove();
    if (destinationMarker) destinationMarker.remove();

    const tempOrigin = origin;
    const tempDest = destination;
    
    setOrigin(tempDest);
    setDestination(tempOrigin);
    
    if (tempDest) {
      const el = document.createElement('div');
      el.className = 'custom-marker origin-marker';
      el.innerHTML = '📍';
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(tempDest.coordinates)
        .addTo(map.current);
      setOriginMarker(marker);
    }
    
    if (tempOrigin) {
      const el = document.createElement('div');
      el.className = 'custom-marker destination-marker';
      el.innerHTML = '🎯';
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(tempOrigin.coordinates)
        .addTo(map.current);
      setDestinationMarker(marker);
    }
    
    clearRouteDisplay();
    
    // Update geocoder inputs
    setTimeout(() => {
      const originInput = document.querySelector('#origin-geocoder input');
      const destInput = document.querySelector('#destination-geocoder input');
      if (originInput) originInput.value = tempDest?.name || '';
      if (destInput) destInput.value = tempOrigin?.name || '';
    }, 50);
  };

  const clearRoute = () => {
    if (originMarker) originMarker.remove();
    if (destinationMarker) destinationMarker.remove();
    setOriginMarker(null);
    setDestinationMarker(null);
    setOrigin(null);
    setDestination(null);
    setRoutes([]);
    setSelectedRoute(null);
    setShowSteps(false);
    setShowQuickActions(false);
    
    clearRouteDisplay();
    
    const originInput = document.querySelector('#origin-geocoder input');
    const destInput = document.querySelector('#destination-geocoder input');
    if (originInput) originInput.value = '';
    if (destInput) destInput.value = '';
    
    if (originGeocoderRef.current) originGeocoderRef.current.clear();
    if (destinationGeocoderRef.current) destinationGeocoderRef.current.clear();
    
    map.current.flyTo({ center: [77.2090, 28.6139], zoom: 10, duration: 1500 });
  };

  const clearRouteDisplay = () => {
    if (map.current && map.current.getSource('route')) {
      ['route-animation', 'route-glow', 'route'].forEach(layer => {
        if (map.current.getLayer(layer)) map.current.removeLayer(layer);
      });
      map.current.removeSource('route');
    }
  };
  
  const getRouteIcon = (mode) => {
    const option = transportOptions.find(o => o.id === mode?.toLowerCase());
    return option?.icon || '📍';
  };

  const getRouteColor = (mode) => {
    const option = transportOptions.find(o => o.id === mode?.toLowerCase());
    return option?.color || '#6b7280';
  };

  const getModeLabel = (mode) => {
    const labels = {
      walking: 'Walking Route',
      cycling: 'Cycling Route',
      driving: 'Driving Route',
      transit: 'Transit Route'
    };
    return labels[mode?.toLowerCase()] || 'Route';
  };

  const getWeatherIcon = (iconCode) => {
    const iconMap = {
      '01d': '☀️', '01n': '🌙',
      '02d': '⛅', '02n': '☁️',
      '03d': '☁️', '03n': '☁️',
      '04d': '☁️', '04n': '☁️',
      '09d': '🌧️', '09n': '🌧️',
      '10d': '🌦️', '10n': '🌧️',
      '11d': '⛈️', '11n': '⛈️',
      '13d': '❄️', '13n': '❄️',
      '50d': '🌫️', '50n': '🌫️'
    };
    return iconMap[iconCode] || '🌤️';
  };

  const handleQuickLocation = async (type) => {
    try {
      const prefsResponse = await axios.get('/api/preferences');
      const address = type === 'home' ? prefsResponse.data.homeAddress : prefsResponse.data.workAddress;
      
      if (!address) {
        alert(`Please set your ${type} address in Preferences first!`);
        return;
      }

      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}&country=in`;
      const response = await fetch(geocodeUrl);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const coords = data.features[0].center;
        const name = data.features[0].place_name;
        
        if (!origin) {
          setOrigin({ coordinates: coords, name });
          const el = document.createElement('div');
          el.className = 'custom-marker origin-marker';
          el.innerHTML = '📍';
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat(coords)
            .addTo(map.current);
          setOriginMarker(marker);
          
          const originInput = document.querySelector('#origin-geocoder input');
          if (originInput) originInput.value = name;
        } else {
          setDestination({ coordinates: coords, name });
          const el = document.createElement('div');
          el.className = 'custom-marker destination-marker';
          el.innerHTML = '🎯';
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat(coords)
            .addTo(map.current);
          setDestinationMarker(marker);
          
          const destInput = document.querySelector('#destination-geocoder input');
          if (destInput) destInput.value = name;
        }
        
        map.current.flyTo({ center: coords, zoom: 14, duration: 1500 });
      }
    } catch (error) {
      console.error('Quick location error:', error);
      alert('Failed to use saved location');
    }
  };

  const toggleTransportMode = (modeId) => {
    setSelectedTransportModes(prev =>
      prev.includes(modeId) 
        ? prev.filter(id => id !== modeId) 
        : [...prev, modeId]
    );
  };

  return (
    <div className="rp-container">
      {/* Sidebar */}
      <aside className="rp-sidebar">
        {/* Carbon Impact Card */}
        <div className="rp-card rp-carbon-card">
          <div className="rp-carbon-header">
            <span>🌱</span>
            <h3>Your Impact Today</h3>
          </div>
          <div className="rp-carbon-stats">
            <div className="rp-carbon-stat">
              <div className="rp-carbon-value">{carbonData.today.toFixed(1)}</div>
              <div className="rp-carbon-label">kg CO₂ saved today</div>
            </div>
            <div className="rp-carbon-stat">
              <div className="rp-carbon-value">{carbonData.month.toFixed(1)}</div>
              <div className="rp-carbon-label">kg CO₂ this month</div>
            </div>
          </div>
          <div className="rp-carbon-goal">
            <div className="rp-goal-header">
              <span>Monthly Goal</span>
              <span>{carbonData.progress.toFixed(0)}%</span>
            </div>
            <div className="rp-goal-bar">
              <div className="rp-goal-fill" style={{ width: `${Math.min(carbonData.progress, 100)}%` }} />
            </div>
            <div className="rp-goal-text">{carbonData.month.toFixed(1)} of {carbonData.goal}kg</div>
          </div>
        </div>

        {/* Journey Planner Card */}
        <div className="rp-card rp-journey-card">
          <h3 className="rp-journey-title">
            <span>🗺️</span>
            Plan Your Journey
          </h3>

          {/* Origin Input */}
          <div className="rp-geocoder-wrapper">
            <label className="rp-label">Starting Point</label>
            <div id="origin-geocoder" className="rp-geocoder-box"></div>
          </div>

          {/* Swap & Clear Buttons */}
          <div className="rp-swap-row">
            <button 
              className="rp-btn-icon rp-btn-swap"
              onClick={swapLocations}
              disabled={!origin && !destination}
              title="Swap locations"
            >
              ⇅
            </button>
            {(origin || destination) && (
              <button 
                className="rp-btn-icon rp-btn-clear"
                onClick={clearRoute}
                title="Clear all"
              >
                ✕
              </button>
            )}
          </div>

          {/* Destination Input */}
          <div className="rp-geocoder-wrapper">
            <label className="rp-label">Destination</label>
            <div id="destination-geocoder" className="rp-geocoder-box"></div>
          </div>

          {/* Quick Actions */}
          {showQuickActions && (
            <div className="rp-quick-actions">
              <span className="rp-quick-label">⚡ Quick Fill</span>
              <div className="rp-quick-btns">
                <button className="rp-quick-btn" onClick={() => handleQuickLocation('home')}>
                  🏠 Home
                </button>
                <button className="rp-quick-btn" onClick={() => handleQuickLocation('work')}>
                  💼 Work
                </button>
              </div>
            </div>
          )}

          {/* Find Routes Button */}
          <button 
            className="rp-btn-primary"
            onClick={() => setShowTransportOptions(true)}
            disabled={loading || !origin || !destination}
          >
            {loading ? (
              <><span className="rp-spinner"></span> Finding Routes...</>
            ) : (
              <>🚀 Find Eco Routes</>
            )}
          </button>
        </div>

        {/* Routes Results */}
        {routes.length > 0 && (
          <div className="rp-card rp-routes-card">
            <div className="rp-routes-header">
              <span className="rp-routes-icon">🌟</span>
              <div>
                <h3>Routes Found</h3>
                <p>{routes.length} eco-friendly options</p>
              </div>
            </div>

            <div className="rp-routes-list">
              {routes.map((route, index) => (
                <div 
                  key={route.id || index}
                  className={`rp-route-card ${selectedRoute?.id === route.id ? 'selected' : ''}`}
                  onClick={() => selectRoute(route)}
                >
                  <div className="rp-route-top">
                    <div className="rp-route-icon" style={{ backgroundColor: getRouteColor(route.mode) }}>
                      {getRouteIcon(route.mode)}
                    </div>
                    <div className="rp-route-info">
                      <h4>
                        {getModeLabel(route.mode)}
                        {index === 0 && <span className="rp-badge">🏆 Best</span>}
                      </h4>
                      <span>Arrive by {route.estimatedArrival}</span>
                    </div>
                  </div>

                  <div className="rp-route-stats">
                    <div className="rp-stat">
                      <span className="rp-stat-emoji">⏱️</span>
                      <strong>{route.duration}</strong> min
                    </div>
                    <div className="rp-stat">
                      <span className="rp-stat-emoji">📏</span>
                      <strong>{route.distance}</strong> km
                    </div>
                    <div className="rp-stat rp-stat-eco">
                      <span className="rp-stat-emoji">🌱</span>
                      <strong>{route.co2Saved}</strong> kg
                    </div>
                    {route.calories > 0 && (
                      <div className="rp-stat">
                        <span className="rp-stat-emoji">🔥</span>
                        <strong>{route.calories}</strong> cal
                      </div>
                    )}
                  </div>

                  {selectedRoute?.id === route.id && (
                    <>
                      <div className="rp-route-actions">
                        <button 
                          className="rp-action-btn"
                          onClick={(e) => { e.stopPropagation(); setShowSteps(!showSteps); }}
                        >
                          {showSteps ? '📖 Hide' : '🧭 Directions'}
                        </button>
                        <button 
                          className="rp-action-btn rp-action-primary"
                          onClick={(e) => { e.stopPropagation(); saveTrip(); }}
                        >
                          💾 Save Trip
                        </button>
                      </div>

                      {showSteps && route.steps && (
                        <div className="rp-directions">
                          <h5>🧭 Turn-by-Turn Directions</h5>
                          <ol>
                            {route.steps.map((step, i) => (
                              <li key={i}>
                                <span className="rp-step-num">{i + 1}</span>
                                <span>{step.instruction}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weather Card */}
        {weather && (
          <div className="rp-card rp-weather-card">
            <div className="rp-weather-top">
              <span className="rp-weather-icon">{getWeatherIcon(weather.weather?.[0]?.icon)}</span>
              <div className="rp-weather-info">
                <div className="rp-weather-temp">{Math.round(weather.main?.temp || 0)}°C</div>
                <div className="rp-weather-desc">{weather.weather?.[0]?.description || 'Clear'}</div>
              </div>
            </div>
            <div className="rp-weather-details">
              <div className="rp-weather-detail">
                <span>💧</span>
                <div>
                  <strong>{weather.main?.humidity || 0}%</strong>
                  <span>Humidity</span>
                </div>
              </div>
              <div className="rp-weather-detail">
                <span>💨</span>
                <div>
                  <strong>{Math.round((weather.wind?.speed || 0) * 3.6)} km/h</strong>
                  <span>Wind</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Map Area */}
      <main className="rp-map-area">
        <div ref={mapContainer} className="rp-map"></div>

        {/* Loading Overlay */}
        {loading && (
          <div className="rp-loading">
            <div className="rp-loading-box">
              <div className="rp-loading-circle">
                <svg viewBox="0 0 100 100">
                  <circle className="rp-circle-bg" cx="50" cy="50" r="42" />
                  <circle 
                    className="rp-circle-fill" 
                    cx="50" cy="50" r="42"
                    style={{ strokeDasharray: `${loadingProgress * 2.64} 264` }}
                  />
                </svg>
                <span className="rp-loading-leaf">🌱</span>
              </div>
              <div className="rp-loading-pct">{Math.round(loadingProgress)}%</div>
              <p className="rp-loading-msg">
                {loadingMessages[Math.floor(loadingProgress / 25) % loadingMessages.length]}
              </p>
              <p className="rp-loading-sub">Finding eco-friendly routes for you</p>
            </div>
          </div>
        )}
      </main>

      {/* Transport Modal */}
      {showTransportOptions && (
        <div className="rp-modal-overlay" onClick={() => setShowTransportOptions(false)}>
          <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rp-modal-header">
              <h3>🚦 Choose Transport</h3>
              <button className="rp-modal-close" onClick={() => setShowTransportOptions(false)}>✕</button>
            </div>
            <p className="rp-modal-desc">Select your preferred travel modes for eco-friendly route options.</p>
            
            <div className="rp-transport-grid">
              {transportOptions.map(opt => (
                <button
                  key={opt.id}
                  className={`rp-transport-btn ${selectedTransportModes.includes(opt.id) ? 'selected' : ''}`}
                  onClick={() => toggleTransportMode(opt.id)}
                  style={{ '--accent': opt.color }}
                >
                  <span className="rp-transport-emoji">{opt.icon}</span>
                  <span className="rp-transport-name">{opt.label}</span>
                  <span className="rp-transport-desc">{opt.description}</span>
                  {selectedTransportModes.includes(opt.id) && (
                    <span className="rp-transport-check">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="rp-modal-footer">
              <button className="rp-modal-btn" onClick={() => setShowTransportOptions(false)}>
                Cancel
              </button>
              <button 
                className="rp-modal-btn rp-modal-btn-primary"
                onClick={planRoute}
                disabled={selectedTransportModes.length === 0}
              >
                🔍 Find Routes
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ===================== BASE LAYOUT ===================== */
        .rp-container {
          display: flex;
          height: 100vh;
          width: 100%;
          background: #f1f5f9;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .rp-sidebar {
          width: 400px;
          min-width: 400px;
          height: 100vh;
          overflow-y: auto;
          padding: 20px;
          background: #ffffff;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .rp-sidebar::-webkit-scrollbar {
          width: 6px;
        }
        .rp-sidebar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .rp-map-area {
          flex: 1;
          position: relative;
        }

        .rp-map {
          width: 100%;
          height: 100%;
        }

        /* ===================== CARDS ===================== */
        .rp-card {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        /* ===================== CARBON CARD ===================== */
        .rp-carbon-card {
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          color: #fff;
        }

        .rp-carbon-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .rp-carbon-header span {
          font-size: 24px;
        }

        .rp-carbon-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .rp-carbon-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        .rp-carbon-stat {
          text-align: center;
        }

        .rp-carbon-value {
          font-size: 32px;
          font-weight: 700;
          line-height: 1;
        }

        .rp-carbon-label {
          font-size: 12px;
          opacity: 0.9;
          margin-top: 4px;
        }

        .rp-carbon-goal {
          border-top: 1px solid rgba(255,255,255,0.3);
          padding-top: 12px;
        }

        .rp-goal-header {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 6px;
        }

        .rp-goal-bar {
          height: 6px;
          background: rgba(255,255,255,0.3);
          border-radius: 3px;
          overflow: hidden;
        }

        .rp-goal-fill {
          height: 100%;
          background: #fff;
          border-radius: 3px;
          transition: width 0.5s ease;
        }

        .rp-goal-text {
          font-size: 11px;
          opacity: 0.8;
          margin-top: 4px;
          text-align: right;
        }

        /* ===================== JOURNEY CARD ===================== */
        .rp-journey-card {
          border: 1px solid #e2e8f0;
        }

        .rp-journey-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
        }

        .rp-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ===================== GEOCODER CRITICAL FIX ===================== */
        .rp-geocoder-wrapper {
          position: relative;
          z-index: 100;
          margin-bottom: 12px;
        }

        .rp-geocoder-wrapper:first-of-type {
          z-index: 101;
        }

        .rp-geocoder-box {
          position: relative;
        }

        /* Override Mapbox Geocoder Styles */
        .rp-geocoder-box .mapboxgl-ctrl-geocoder {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 100% !important;
          background: #f8fafc !important;
          border: 2px solid #e2e8f0 !important;
          border-radius: 12px !important;
          box-shadow: none !important;
          font-family: inherit !important;
        }

        .rp-geocoder-box .mapboxgl-ctrl-geocoder:hover {
          border-color: #cbd5e1 !important;
        }

        .rp-geocoder-box .mapboxgl-ctrl-geocoder--input {
          height: 46px !important;
          padding: 0 40px 0 44px !important;
          font-size: 14px !important;
          color: #1e293b !important;
          background: transparent !important;
        }

        .rp-geocoder-box .mapboxgl-ctrl-geocoder--input::placeholder {
          color: #94a3b8 !important;
        }

        .rp-geocoder-box .mapboxgl-ctrl-geocoder--input:focus {
          outline: none !important;
        }

        .rp-geocoder-box .mapboxgl-ctrl-geocoder:focus-within {
          border-color: #10b981 !important;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15) !important;
        }

        .rp-geocoder-box .mapboxgl-ctrl-geocoder--icon {
          fill: #64748b !important;
        }

        .rp-geocoder-box .mapboxgl-ctrl-geocoder--icon-search {
          left: 12px !important;
          top: 13px !important;
          width: 20px !important;
          height: 20px !important;
        }

        .rp-geocoder-box .mapboxgl-ctrl-geocoder--button {
          background: none !important;
          top: 11px !important;
          right: 10px !important;
        }

        /* CRITICAL: Dropdown Suggestions Fix */
        .rp-geocoder-box .mapboxgl-ctrl-geocoder .suggestions-wrapper,
        .rp-geocoder-box .suggestions-wrapper {
          position: absolute !important;
          top: 100% !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 99999 !important;
        }

        .rp-geocoder-box .mapboxgl-ctrl-geocoder .suggestions,
        .rp-geocoder-box .suggestions {
          position: relative !important;
          z-index: 99999 !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.12), 0 2px 10px rgba(0,0,0,0.08) !important;
          margin-top: 8px !important;
          overflow: hidden !important;
          max-height: 280px !important;
          overflow-y: auto !important;
        }

        .rp-geocoder-box .mapboxgl-ctrl-geocoder .suggestions li,
        .rp-geocoder-box .suggestions li {
          padding: 14px 16px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          cursor: pointer !important;
          transition: background 0.15s ease !important;
        }

        .rp-geocoder-box .mapboxgl-ctrl-geocoder .suggestions li:last-child,
        .rp-geocoder-box .suggestions li:last-child {
          border-bottom: none !important;
        }

        .rp-geocoder-box .mapboxgl-ctrl-geocoder .suggestions li:hover,
        .rp-geocoder-box .mapboxgl-ctrl-geocoder .suggestions li.active,
        .rp-geocoder-box .suggestions li:hover,
        .rp-geocoder-box .suggestions li.active {
          background: #f0fdf4 !important;
        }

        .rp-geocoder-box .mapboxgl-ctrl-geocoder .suggestions li a,
        .rp-geocoder-box .suggestions li a {
          color: #1e293b !important;
          font-size: 14px !important;
          text-decoration: none !important;
          display: block !important;
        }

        .rp-geocoder-box .mapboxgl-ctrl-geocoder .suggestions li .mapboxgl-ctrl-geocoder--suggestion-title {
          font-weight: 600 !important;
          color: #1e293b !important;
        }

        .rp-geocoder-box .mapboxgl-ctrl-geocoder .suggestions li .mapboxgl-ctrl-geocoder--suggestion-address {
          font-size: 12px !important;
          color: #64748b !important;
          margin-top: 2px !important;
        }

        /* ===================== SWAP ROW ===================== */
        .rp-swap-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          margin: 4px 0;
          position: relative;
          z-index: 1;
        }

        .rp-btn-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          transition: all 0.2s ease;
        }

        .rp-btn-swap {
          background: #f1f5f9;
          color: #475569;
          border: 2px solid #e2e8f0;
        }

        .rp-btn-swap:hover:not(:disabled) {
          background: #f0fdf4;
          border-color: #10b981;
          color: #10b981;
          transform: scale(1.05);
        }

        .rp-btn-swap:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .rp-btn-clear {
          background: #fef2f2;
          color: #ef4444;
        }

        .rp-btn-clear:hover {
          background: #fee2e2;
          transform: scale(1.05);
        }

        /* ===================== QUICK ACTIONS ===================== */
        .rp-quick-actions {
          background: #f8fafc;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 12px;
          animation: fadeSlideIn 0.3s ease;
        }

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .rp-quick-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .rp-quick-btns {
          display: flex;
          gap: 8px;
        }

        .rp-quick-btn {
          flex: 1;
          padding: 10px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #334155;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .rp-quick-btn:hover {
          border-color: #10b981;
          background: #f0fdf4;
        }

        /* ===================== PRIMARY BUTTON ===================== */
        .rp-btn-primary {
          width: 100%;
          padding: 14px 20px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .rp-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .rp-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .rp-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ===================== ROUTES CARD ===================== */
        .rp-routes-card {
          border: 1px solid #e2e8f0;
          animation: fadeSlideIn 0.4s ease;
        }

        .rp-routes-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
        }

        .rp-routes-icon {
          font-size: 36px;
          animation: bounce 2s ease-in-out infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .rp-routes-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
        }

        .rp-routes-header p {
          margin: 2px 0 0 0;
          font-size: 13px;
          color: #64748b;
        }

        .rp-routes-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ===================== ROUTE CARD ===================== */
        .rp-route-card {
          background: #f8fafc;
          border: 2px solid transparent;
          border-radius: 14px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .rp-route-card:hover {
          background: #fff;
          border-color: #e2e8f0;
        }

        .rp-route-card.selected {
          background: #fff;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.1);
        }

        .rp-route-top {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .rp-route-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .rp-route-info h4 {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .rp-badge {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #78350f;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 20px;
        }

        .rp-route-info span {
          display: block;
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }

        .rp-route-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          padding: 12px;
          background: #f1f5f9;
          border-radius: 10px;
        }

        .rp-stat {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: #475569;
        }

        .rp-stat strong {
          color: #1e293b;
        }

        .rp-stat-eco strong {
          color: #10b981;
        }

        .rp-stat-emoji {
          font-size: 14px;
        }

        .rp-route-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .rp-action-btn {
          flex: 1;
          padding: 10px 12px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .rp-action-btn:hover {
          background: #f8fafc;
        }

        .rp-action-primary {
          background: #10b981;
          border-color: #10b981;
          color: #fff;
        }

        .rp-action-primary:hover {
          background: #059669;
        }

        /* ===================== DIRECTIONS ===================== */
        .rp-directions {
          margin-top: 12px;
          padding: 14px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          animation: fadeSlideIn 0.3s ease;
        }

        .rp-directions h5 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          padding-bottom: 10px;
          border-bottom: 1px solid #f1f5f9;
        }

        .rp-directions ol {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .rp-directions li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px;
          background: #f8fafc;
          border-radius: 8px;
          font-size: 13px;
          color: #334155;
          line-height: 1.5;
        }

        .rp-step-num {
          width: 22px;
          height: 22px;
          min-width: 22px;
          background: #10b981;
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
        }

        /* ===================== WEATHER CARD ===================== */
        .rp-weather-card {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: #fff;
        }

        .rp-weather-top {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 14px;
        }

        .rp-weather-icon {
          font-size: 44px;
        }

        .rp-weather-info {
          display: flex;
          flex-direction: column;
        }

        .rp-weather-temp {
          font-size: 32px;
          font-weight: 700;
          line-height: 1;
        }

        .rp-weather-desc {
          font-size: 14px;
          opacity: 0.9;
          text-transform: capitalize;
          margin-top: 4px;
        }

        .rp-weather-details {
          display: flex;
          gap: 20px;
          padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,0.2);
        }

        .rp-weather-detail {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rp-weather-detail > span {
          font-size: 18px;
        }

        .rp-weather-detail strong {
          display: block;
          font-size: 14px;
        }

        .rp-weather-detail div span {
          font-size: 11px;
          opacity: 0.8;
        }

        /* ===================== LOADING OVERLAY ===================== */
        .rp-loading {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.97), rgba(5, 150, 105, 0.97));
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .rp-loading-box {
          text-align: center;
          color: #fff;
        }

        .rp-loading-circle {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0 auto 20px;
        }

        .rp-loading-circle svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .rp-circle-bg {
          fill: none;
          stroke: rgba(255,255,255,0.2);
          stroke-width: 6;
        }

        .rp-circle-fill {
          fill: none;
          stroke: #fff;
          stroke-width: 6;
          stroke-linecap: round;
          transition: stroke-dasharray 0.3s ease;
        }

        .rp-loading-leaf {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 40px;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
        }

        .rp-loading-pct {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 16px;
        }

        .rp-loading-msg {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 6px 0;
        }

        .rp-loading-sub {
          font-size: 13px;
          opacity: 0.9;
          margin: 0;
        }

        /* ===================== MODAL ===================== */
        .rp-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .rp-modal {
          background: #fff;
          border-radius: 20px;
          padding: 24px;
          width: 90%;
          max-width: 460px;
          box-shadow: 0 25px 50px rgba(0,0,0,0.25);
          animation: modalPop 0.3s ease;
        }

        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .rp-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .rp-modal-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
        }

        .rp-modal-close {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: #f1f5f9;
          color: #64748b;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .rp-modal-close:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .rp-modal-desc {
          color: #64748b;
          font-size: 14px;
          margin: 0 0 20px 0;
          line-height: 1.5;
        }

        .rp-transport-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 20px;
        }

        .rp-transport-btn {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 18px 12px;
          background: #f8fafc;
          border: 2px solid transparent;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .rp-transport-btn:hover {
          background: #fff;
          border-color: #e2e8f0;
          transform: translateY(-2px);
        }

        .rp-transport-btn.selected {
          background: #fff;
          border-color: var(--accent, #10b981);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
        }

        .rp-transport-emoji {
          font-size: 32px;
          margin-bottom: 6px;
          transition: transform 0.2s ease;
        }

        .rp-transport-btn:hover .rp-transport-emoji {
          transform: scale(1.15);
        }

        .rp-transport-name {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }

        .rp-transport-desc {
          font-size: 11px;
          color: #64748b;
          margin-top: 2px;
        }

        .rp-transport-check {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 22px;
          height: 22px;
          background: var(--accent, #10b981);
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          animation: pop 0.2s ease;
        }

        @keyframes pop {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }

        .rp-modal-footer {
          display: flex;
          gap: 10px;
        }

        .rp-modal-btn {
          flex: 1;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #f1f5f9;
          border: none;
          color: #475569;
        }

        .rp-modal-btn:hover {
          background: #e2e8f0;
        }

        .rp-modal-btn-primary {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff;
          box-shadow: 0 4px 12px rgba(16,185,129,0.3);
        }

        .rp-modal-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(16,185,129,0.4);
        }

        .rp-modal-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        /* ===================== MARKERS ===================== */
        .custom-marker {
          font-size: 28px;
          cursor: pointer;
          transition: transform 0.2s ease;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }

        .custom-marker:hover {
          transform: scale(1.2);
        }

        /* ===================== RESPONSIVE ===================== */
        @media (max-width: 900px) {
          .rp-container {
            flex-direction: column;
          }

          .rp-sidebar {
            width: 100%;
            min-width: auto;
            height: auto;
            max-height: 50vh;
            border-right: none;
            border-bottom: 1px solid #e2e8f0;
          }

          .rp-map-area {
            height: 50vh;
          }
        }

        @media (max-width: 480px) {
          .rp-sidebar {
            padding: 14px;
          }

          .rp-carbon-value {
            font-size: 26px;
          }

          .rp-journey-title {
            font-size: 18px;
          }

          .rp-transport-grid {
            gap: 8px;
          }

          .rp-transport-btn {
            padding: 14px 8px;
          }

          .rp-transport-emoji {
            font-size: 26px;
          }
        }
      `}</style>
    </div>
  );
};

export default RoutePlanner;
