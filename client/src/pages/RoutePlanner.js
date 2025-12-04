import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_API_KEY || 'apikey here';

const RoutePlanner = ({ user }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [carbonData, setCarbonData] = useState({ today: 2.3, month: 47.8, goal: 60, progress: 96 });
  const [weather, setWeather] = useState(null);
  const [showSteps, setShowSteps] = useState(false);
  const [showTransportOptions, setShowTransportOptions] = useState(false);
  const [selectedTransportModes, setSelectedTransportModes] = useState(['walking', 'cycling', 'driving']);
  const [originMarker, setOriginMarker] = useState(null);
  const [destinationMarker, setDestinationMarker] = useState(null);

  const transportOptions = [
    { id: 'walking', label: 'Walking', icon: '🚶', profile: 'walking', description: 'Eco-friendly & healthy' },
    { id: 'cycling', label: 'Cycling', icon: '🚴', profile: 'cycling', description: 'Fast & sustainable' },
    { id: 'driving', label: 'Driving', icon: '🚗', profile: 'driving-traffic', description: 'Convenient & quick' },
    { id: 'transit', label: 'Public Transit', icon: '🚌', profile: 'driving', description: 'Affordable & green' }
  ];

  useEffect(() => {
    if (map.current) return;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [77.2090, 28.6139], // Delhi coordinates
      zoom: 10
    });

    map.current.on('load', () => {
      initializeGeocoders();
    });

    // Fetch initial data
    fetchWeatherData(28.6139, 77.2090);
    fetchCarbonData();
  }, []);

  const initializeGeocoders = () => {
    // Add geocoder for origin
    const originGeocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      placeholder: 'Enter starting location...',
      marker: false,
      countries: 'in',
      bbox: [68.1766451354, 7.96553477623, 97.4025614766, 35.4940095078] // India bounding box
    });

    const destinationGeocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      placeholder: 'Enter destination...',
      marker: false,
      countries: 'in',
      bbox: [68.1766451354, 7.96553477623, 97.4025614766, 35.4940095078] // India bounding box
    });

    // Add geocoders to the page
    const originContainer = document.getElementById('origin-geocoder');
    const destContainer = document.getElementById('destination-geocoder');
    
    if (originContainer) {
      originContainer.innerHTML = '';
      originContainer.appendChild(originGeocoder.onAdd());
    }
    
    if (destContainer) {
      destContainer.innerHTML = '';
      destContainer.appendChild(destinationGeocoder.onAdd());
    }

    originGeocoder.on('result', (e) => {
      const coords = e.result.center;
      setOrigin({
        coordinates: coords,
        name: e.result.place_name
      });
      
      if (originMarker) {
        originMarker.remove();
      }
      
      const marker = new mapboxgl.Marker({ color: '#10b981' })
        .setLngLat(coords)
        .setPopup(new mapboxgl.Popup().setText('Starting Point'))
        .addTo(map.current);
      setOriginMarker(marker);
      
      map.current.flyTo({
        center: coords,
        zoom: 14,
        duration: 1000
      });
    });

    destinationGeocoder.on('result', (e) => {
      const coords = e.result.center;
      setDestination({
        coordinates: coords,
        name: e.result.place_name
      });
      
      if (destinationMarker) {
        destinationMarker.remove();
      }
      
      const marker = new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat(coords)
        .setPopup(new mapboxgl.Popup().setText('Destination'))
        .addTo(map.current);
      setDestinationMarker(marker);
      
      if (origin) {
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend(origin.coordinates);
        bounds.extend(coords);
        map.current.fitBounds(bounds, { 
          padding: 100,
          duration: 1000
        });
      } else {
        map.current.flyTo({
          center: coords,
          zoom: 14,
          duration: 1000
        });
      }
    });
  };

  const fetchWeatherData = async (lat, lon) => {
    try {
      const response = await axios.get(`/api/weather?lat=${lat}&lon=${lon}`);
      setWeather(response.data);
    } catch (error) {
      console.error('Weather fetch error:', error);
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
        
        if (tripDate.toDateString() === today.toDateString()) {
          todayCarbon += carbon;
        }
        
        if (tripDate >= startOfMonth) {
          monthCarbon += carbon;
        }
      });

      const prefsResponse = await axios.get('/api/preferences');
      const monthlyGoal = prefsResponse.data.monthlyGoal || 60;
      const progress = Math.min((monthCarbon / monthlyGoal) * 100, 100);
      
      setCarbonData({
        today: todayCarbon,
        month: monthCarbon,
        goal: monthlyGoal,
        progress: progress
      });
    } catch (error) {
      console.error('Error fetching carbon data:', error);
      setCarbonData({ today: 0, month: 0, goal: 60, progress: 0 });
    }
  };

  const handleTransportModeToggle = (modeId) => {
    setSelectedTransportModes(prev => {
      if (prev.includes(modeId)) {
        return prev.filter(id => id !== modeId);
      } else {
        return [...prev, modeId];
      }
    });
  };

  const planRoute = async () => {
    if (!origin || !destination) {
      alert('Please select both starting location and destination');
      return;
    }

    if (selectedTransportModes.length === 0) {
      alert('Please select at least one transport mode');
      return;
    }

    setShowTransportOptions(false);
    setLoading(true);
    setRoutes([]);
    setSelectedRoute(null);
    
    try {
      const response = await axios.post('/api/route', {
        origin: {
          coordinates: origin.coordinates,
          name: origin.name
        },
        destination: {
          coordinates: destination.coordinates,
          name: destination.name
        },
        transportModes: selectedTransportModes
      });

      const suggestedRoutes = response.data;
      
      if (suggestedRoutes.length > 0) {
        setRoutes(suggestedRoutes);
        selectRoute(suggestedRoutes[0]);
        fetchWeatherData(destination.coordinates[1], destination.coordinates[0]);
      } else {
        alert('No routes found. Please try different locations or transport modes.');
      }
      
    } catch (error) {
      console.error('Route planning error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to plan route. Please check your internet connection and try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const displayRoute = (route) => {
    if (!map.current || !route?.geometry) return;
  
    const mapInstance = map.current;
  
    // **FIX:** Correctly remove existing layers and source to prevent crash
    if (mapInstance.getSource('route')) {
      if (mapInstance.getLayer('route-animation')) {
        mapInstance.removeLayer('route-animation');
      }
      if (mapInstance.getLayer('route')) {
        mapInstance.removeLayer('route');
      }
      mapInstance.removeSource('route');
    }
  
    mapInstance.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: route.geometry,
      },
    });
  
    mapInstance.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': getRouteColor(route.mode), 'line-width': 6, 'line-opacity': 0.8 },
    });
  
    mapInstance.addLayer({
      id: 'route-animation',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': getRouteColor(route.mode),
        'line-width': 8,
        'line-opacity': 0.3,
        'line-dasharray': [0, 4, 3],
      },
    });
  
    if (origin && destination) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend(origin.coordinates);
      bounds.extend(destination.coordinates);
      mapInstance.fitBounds(bounds, { padding: 100, duration: 1000 });
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
        originCoords: {
          lat: origin.coordinates[1],
          lng: origin.coordinates[0]
        },
        destinationCoords: {
          lat: destination.coordinates[1],
          lng: destination.coordinates[0]
        },
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
      const errorMessage = error.response?.data?.error || 'Failed to save trip. Please try again.';
      alert(errorMessage);
    }
  };

  const swapLocations = () => {
    if (!origin && !destination) return;
    
    setOrigin(destination);
    setDestination(origin);
    
    if (originMarker) originMarker.remove();
    if (destinationMarker) destinationMarker.remove();
    
    if (destination) {
      const newOriginMarker = new mapboxgl.Marker({ color: '#10b981' })
        .setLngLat(destination.coordinates)
        .setPopup(new mapboxgl.Popup().setText('Starting Point'))
        .addTo(map.current);
      setOriginMarker(newOriginMarker);
    }
    
    if (origin) {
      const newDestMarker = new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat(origin.coordinates)
        .setPopup(new mapboxgl.Popup().setText('Destination'))
        .addTo(map.current);
      setDestinationMarker(newDestMarker);
    }
    
    setRoutes([]);
    setSelectedRoute(null);
    
    if (map.current.getSource('route')) {
      map.current.removeLayer('route');
      map.current.removeLayer('route-animation');
      map.current.removeSource('route');
    }
    
    setTimeout(() => {
      const originInput = document.querySelector('#origin-geocoder input');
      const destInput = document.querySelector('#destination-geocoder input');
      if (originInput) originInput.value = destination?.name || '';
      if (destInput) destInput.value = origin?.name || '';
    }, 100);
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
    
    if (map.current.getSource('route')) {
      map.current.removeLayer('route-animation');
      map.current.removeLayer('route');
      map.current.removeSource('route');
    }
    
    const originInput = document.querySelector('#origin-geocoder input');
    const destInput = document.querySelector('#destination-geocoder input');
    if (originInput) originInput.value = '';
    if (destInput) destInput.value = '';
    
    map.current.flyTo({ center: [77.2090, 28.6139], zoom: 10, duration: 1000 });
  };
  
  const getRouteIcon = (mode) => {
    switch (mode?.toLowerCase()) {
      case 'walking': return '🚶';
      case 'cycling': return '🚴';
      case 'driving': return '🚗';
      case 'transit': return '🚌';
      default: return '📍';
    }
  };

  const getRouteColor = (mode) => {
    switch (mode?.toLowerCase()) {
      case 'walking': return '#10b981';
      case 'cycling': return '#3b82f6';
      case 'driving': return '#ef4444';
      case 'transit': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getModeLabel = (mode) => {
    switch (mode?.toLowerCase()) {
      case 'walking': return 'Walking Route';
      case 'cycling': return 'Cycling Route';
      case 'driving': return 'Driving Route';
      case 'transit': return 'Transit Route';
      default: return 'Route';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return '#10b981';
      case 'moderate': return '#f59e0b';
      case 'challenging': return '#ef4444';
      case 'hard': return '#d946ef';
      default: return '#6b7280';
    }
  };

  return (
    <div className="route-planner-layout">
      <div className="controls">
        <div className="card">
          <h3>🗺️ Plan Your Green Route</h3>
          <div className="form-group">
            <label>Starting Point</label>
            <div id="origin-geocoder" className="geocoder-container"></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '1rem 0', gap: '1rem' }}>
            <button 
              onClick={swapLocations}
              disabled={!origin && !destination}
              className="btn-swap"
              title="Swap locations"
            >
              ⇅
            </button>
            {(origin || destination) && (
              <button onClick={clearRoute} className="btn-clear" title="Clear route">
                ✕
              </button>
            )}
          </div>
          <div className="form-group">
            <label>Destination</label>
            <div id="destination-geocoder" className="geocoder-container"></div>
          </div>
          <button 
            onClick={() => setShowTransportOptions(true)} 
            className="btn btn-primary"
            disabled={loading || !origin || !destination}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="spinner" style={{ width: '20px', height: '20px', margin: 0 }}></div>
                Finding Routes...
              </span>
            ) : (
              '🚀 Find Eco Routes'
            )}
          </button>
        </div>

        {showTransportOptions && (
          <div className="card" style={{ border: '2px solid var(--primary-green)' }}>
            <h3>🚦 Choose Your Transport</h3>
            <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Select your preferred modes. We'll find the most eco-friendly options.
            </p>
            <div className="transport-mode-grid">
              {transportOptions.map(option => (
                <div
                  key={option.id}
                  className={`transport-mode-option ${selectedTransportModes.includes(option.id) ? 'selected' : ''}`}
                  onClick={() => handleTransportModeToggle(option.id)}
                >
                  <span className="transport-icon">{option.icon}</span>
                  <span className="transport-label">{option.label}</span>
                  {selectedTransportModes.includes(option.id) && (
                    <span className="checkmark">✓</span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={() => setShowTransportOptions(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={planRoute} className="btn btn-primary" disabled={selectedTransportModes.length === 0} style={{ flex: 1 }}>🔍 Find Routes</button>
            </div>
          </div>
        )}

        {routes.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>🌟 Best Routes Found</h3>
            <div className="route-results-list">
              {routes.map((route, index) => (
                  <div 
                    key={route.id || index}
                    className={`route-option ${selectedRoute?.id === route.id ? 'selected' : ''}`}
                    onClick={() => selectRoute(route)}
                  >
                    <div className="route-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.8rem' }}>{getRouteIcon(route.mode)}</span>
                        <div>
                          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {route.name}
                            {index === 0 && <span className="eco-badge">🏆 Best Eco</span>}
                          </h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                            Est. Arrival: {route.estimatedArrival}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="route-stats">
                      <div className="route-stat"><div className="route-stat-icon">⏱️</div><div className="route-stat-value">{route.duration} min</div><div className="route-stat-label">Time</div></div>
                      <div className="route-stat"><div className="route-stat-icon">📏</div><div className="route-stat-value">{route.distance} km</div><div className="route-stat-label">Distance</div></div>
                      <div className="route-stat"><div className="route-stat-icon">🌱</div><div className="route-stat-value co2-positive">{route.co2Saved} kg</div><div className="route-stat-label">CO₂ Saved</div></div>
                      {route.calories > 0 && <div className="route-stat"><div className="route-stat-icon">🔥</div><div className="route-stat-value">{route.calories}</div><div className="route-stat-label">Calories</div></div>}
                    </div>
                    {selectedRoute?.id === route.id && (
                      <div className="route-actions">
                        <button onClick={(e) => { e.stopPropagation(); setShowSteps(!showSteps); }} className="btn btn-secondary" style={{ flex: 1 }}>{showSteps ? '📖 Hide' : '🧭 Directions'}</button>
                        <button onClick={(e) => { e.stopPropagation(); saveTrip(); }} className="btn btn-primary" style={{ flex: 1 }}>💾 Save Trip</button>
                      </div>
                    )}
                    {selectedRoute?.id === route.id && showSteps && route.steps && (
                      <div className="route-directions">
                        <h4>🧭 Step-by-Step</h4>
                        <ul className="route-steps">{route.steps.map((step, i) => <li key={i}>{step.instruction}</li>)}</ul>
                      </div>
                    )}
                  </div>
              ))}
            </div>
          </div>
        )}

        {weather && (
          <div className="card weather-widget">
            <div className="widget-header">
              <span className="widget-icon">🌤️</span>
              <h4>Current Conditions</h4>
            </div>
            <div className="weather-info">
                <div className="weather-temp">
                    <span className="temp-value">{Math.round(weather.main.temp)}°C</span>
                    <span className="weather-desc">{weather.weather[0].description}</span>
                </div>
                <div className="weather-details">
                    <div className="weather-detail"><span className="detail-icon">💧</span><span>Humidity: {weather.main.humidity}%</span></div>
                    <div className="weather-detail"><span className="detail-icon">💨</span><span>Wind: {Math.round(weather.wind?.speed * 3.6 || 0)} km/h</span></div>
                </div>
            </div>
          </div>
        )}
      </div>

      <div className="map-container">
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }}></div>
        {loading && (
          <div className="map-loading-overlay">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Finding the best eco-friendly routes...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutePlanner;
