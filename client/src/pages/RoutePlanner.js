import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';

// Set Mapbox access token
mapboxgl.accessToken = 'place your key here';

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

  useEffect(() => {
    if (map.current) return;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [77.2090, 28.6139], // Delhi coordinates
      zoom: 10
    });

    // Add geocoder for origin
    const originGeocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      placeholder: 'Enter origin...',
      marker: false
    });

    const destinationGeocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      placeholder: 'Enter destination...',
      marker: false
    });

    // Add geocoders to the page (not the map)
    document.getElementById('origin-geocoder').appendChild(originGeocoder.onAdd());
    document.getElementById('destination-geocoder').appendChild(destinationGeocoder.onAdd());

    originGeocoder.on('result', (e) => {
      setOrigin({
        coordinates: e.result.center,
        name: e.result.place_name
      });
    });

    destinationGeocoder.on('result', (e) => {
      setDestination({
        coordinates: e.result.center,
        name: e.result.place_name
      });
    });

    // Fetch weather data for Delhi
    fetchWeatherData(28.6139, 77.2090);
    fetchCarbonData();
  }, []);

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

      // Get user's monthly goal
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
    }
  };

  const planRoute = async () => {
    if (!origin || !destination) {
      alert('Please select both origin and destination');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/route', {
        origin: origin.coordinates,
        destination: destination.coordinates
      });
      
      setRoutes(response.data);
      if (response.data.length > 0) {
        setSelectedRoute(response.data[0]);
        displayRoute(response.data[0]);
      }
    } catch (error) {
      console.error('Route planning error:', error);
      alert('Failed to plan route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const displayRoute = (route) => {
    // Clear existing routes
    if (map.current.getSource('route')) {
      map.current.removeLayer('route');
      map.current.removeSource('route');
    }

    // Add route to map
    map.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: route.geometry
      }
    });

    map.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#10b981',
        'line-width': 6
      }
    });

    // Add markers
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend(origin.coordinates);
    bounds.extend(destination.coordinates);
    
    // Clear existing markers
    document.querySelectorAll('.mapboxgl-marker').forEach(marker => marker.remove());
    
    // Add origin marker
    new mapboxgl.Marker({ color: '#10b981' })
      .setLngLat(origin.coordinates)
      .addTo(map.current);
    
    // Add destination marker
    new mapboxgl.Marker({ color: '#ef4444' })
      .setLngLat(destination.coordinates)
      .addTo(map.current);

    map.current.fitBounds(bounds, { padding: 50 });
  };

  const selectRoute = (route) => {
    setSelectedRoute(route);
    displayRoute(route);
  };

  const saveTrip = async () => {
    if (!selectedRoute || !origin || !destination) return;

    try {
      await axios.post('/api/history', {
        originName: origin.name,
        destinationName: destination.name,
        mode: selectedRoute.mode.toUpperCase(),
        distance: parseFloat(selectedRoute.distance),
        duration: parseInt(selectedRoute.duration),
        co2Saved: parseFloat(selectedRoute.co2Saved)
      });
      
      alert('Trip saved successfully!');
      fetchCarbonData(); // Refresh carbon data
    } catch (error) {
      console.error('Save trip error:', error);
      alert('Failed to save trip');
    }
  };

  const quickRoute = (type) => {
    if (type === 'home-office') {
      // Use user's home and work addresses from preferences
      // This would require fetching user preferences first
      alert('Please set your home and work addresses in preferences first');
    }
  };

  const getRouteIcon = (mode) => {
    switch (mode.toLowerCase()) {
      case 'walking': return '🚶';
      case 'cycling': return '🚴';
      case 'driving': return '🚗';
      default: return '🚌';
    }
  };

  const getRouteColor = (mode) => {
    switch (mode.toLowerCase()) {
      case 'walking': return '#10b981';
      case 'cycling': return '#3b82f6';
      case 'driving': return '#ef4444';
      default: return '#8b5cf6';
    }
  };

  return (
    <div className="route-planner-layout">
      <div className="controls">
        {/* Route Planning Card */}
        <div className="card input-card">
          <h3>🗺️ Plan Your Green Route</h3>
          
          <div className="form-group">
            <label>From</label>
            <div id="origin-geocoder" className="geocoder-container"></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
            <button 
              onClick={() => {
                const temp = origin;
                setOrigin(destination);
                setDestination(temp);
              }}
              style={{
                background: 'none',
                border: '2px solid var(--border-color)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}
            >
              ⇅
            </button>
          </div>

          <div className="form-group">
            <label>To</label>
            <div id="destination-geocoder" className="geocoder-container"></div>
          </div>

          <button 
            onClick={planRoute} 
            className="btn btn-primary"
            disabled={loading || !origin || !destination}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {loading ? 'Planning Route...' : '⚡ Plan Eco-Friendly Route'}
          </button>

          {/* Quick Routes */}
          <div className="quick-routes">
            <h4>Quick Routes</h4>
            <div className="quick-route-item" onClick={() => quickRoute('home-office')}>
              <span className="route-icon">⏰</span>
              <div>
                <strong>Home → Office</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  Your daily commute
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Routes Results */}
        {routes.length > 0 && (
          <div className="card">
            <h3>Recommended Green Routes</h3>
            <div className="route-results-list">
              {routes.map((route, index) => (
                <div 
                  key={index}
                  className={`route-option ${selectedRoute === route ? 'selected' : ''}`}
                  onClick={() => selectRoute(route)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>{getRouteIcon(route.mode)}</span>
                      <div>
                        <h4 style={{ margin: 0, textTransform: 'capitalize' }}>{route.mode} Route</h4>
                        {index === 0 && <span className="route-tag">Most Eco-Friendly</span>}
                      </div>
                    </div>
                    <div style={{ 
                      backgroundColor: 'var(--light-green-bg)', 
                      color: 'var(--primary-green)', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      ✓
                    </div>
                  </div>

                  <div className="route-stats">
                    <div className="route-stat">
                      <div className="route-stat-value">⏱️ {route.duration}m</div>
                      <div className="route-stat-label">Duration</div>
                    </div>
                    <div className="route-stat">
                      <div className="route-stat-value">📍 {route.distance} km</div>
                      <div className="route-stat-label">Distance</div>
                    </div>
                    <div className="route-stat">
                      <div className="route-stat-value" style={{ color: 'var(--primary-green)' }}>
                        🌱 {route.co2Saved} kg
                      </div>
                      <div className="route-stat-label">CO₂ Saved</div>
                    </div>
                  </div>

                  {selectedRoute === route && (
                    <div style={{ marginTop: '1rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSteps(!showSteps);
                        }}
                        style={{
                          background: 'none',
                          border: '1px solid var(--border-color)',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          marginRight: '0.5rem',
                          fontSize: '0.9rem'
                        }}
                      >
                        {showSteps ? 'Hide' : 'Show'} Directions
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveTrip();
                        }}
                        className="btn btn-primary"
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                      >
                        Save Trip
                      </button>

                      {showSteps && route.steps && (
                        <div style={{ marginTop: '1rem' }}>
                          <h4>🧭 Step-by-Step Directions</h4>
                          <ul className="route-steps">
                            {route.steps.map((step, stepIndex) => (
                              <li key={stepIndex}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Carbon Impact Widget */}
        <div className="carbon-impact-widget">
          <div className="widget-header">
            <span className="widget-icon">🌱</span>
            <h4>Your Carbon Impact</h4>
          </div>
          
          <div className="carbon-stats">
            <div className="carbon-stat">
              <div className="carbon-value">{carbonData.today.toFixed(1)} kg</div>
              <div className="carbon-label">↗ Today</div>
            </div>
            <div className="carbon-stat">
              <div className="carbon-value">{carbonData.month.toFixed(1)} kg</div>
              <div className="carbon-label">🗓 This Month</div>
            </div>
          </div>

          <div className="progress-section">
            <div className="progress-label">
              <span>Monthly Goal Progress</span>
              <span style={{ color: 'var(--primary-green)', fontWeight: 'bold' }}>
                {carbonData.progress.toFixed(0)}%
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-bar-inner" 
                style={{ width: `${Math.min(carbonData.progress, 100)}%` }}
              ></div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', textAlign: 'center' }}>
              {(carbonData.goal - carbonData.month).toFixed(1)} kg to reach your goal
            </div>
          </div>

          <div className="impact-message">
            <span>🌳</span>
            <span>Equivalent to planting 2 trees this month</span>
          </div>
        </div>

        {/* Weather Widget */}
        {weather && (
          <div className="card widget weather-widget">
            <div className="widget-header">
              <span className="widget-icon">☀️</span>
              <h4>Weather Impact</h4>
            </div>
            
            <div className="weather-details">
              <div>
                <div className="weather-value">{Math.round(weather.main.temp)}°C</div>
                <p>🌡 Temp</p>
              </div>
              <div>
                <div className="weather-value">{weather.main.humidity}%</div>
                <p>💧 Humidity</p>
              </div>
              <div>
                <div className="weather-value">{Math.round(weather.wind.speed * 3.6)} km/h</div>
                <p>💨 Wind</p>
              </div>
            </div>

            <div className="weather-message">
              Perfect weather for cycling and walking!
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="map-container" ref={mapContainer}></div>
    </div>
  );
};

export default RoutePlanner;
