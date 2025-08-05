import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { planRoute } from '../services/api';
import { IoWalk, IoCarSport, IoBicycle, IoTime, IoLocation, 
         IoLeafOutline, IoSunnyOutline, IoWaterOutline, IoSpeedometer, IoSunny } from 'react-icons/io5';

mapboxgl.accessToken = 'pk.eyJ1IjoiZGF5YXc3ODQ1IiwiYSI6ImNtZGE1YTh1bjBmZ3Yya3IyY2VubzdrY24ifQ.MRVCnGb5LqZ5uA3hC1DcUQ';

const RoutePlanner = () => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [loading, setLoading] = useState(false);

    // Mock data for demonstration
    const mockWeatherData = {
        temp: 22,
        humidity: 65,
        wind: 8,
        condition: "Perfect weather for cycling and walking!"
    };

    const mockCarbonData = {
        today: 2.3,
        thisMonth: 47.8,
        monthlyGoal: 50,
        progress: 96,
        treeEquivalent: 2
    };

    // Function to get icon for each travel mode
    const getModeIcon = (mode) => {
        switch (mode) {
            case 'walking': return <IoWalk />;
            case 'cycling': return <IoBicycle />;
            case 'driving': return <IoCarSport />;
            case 'mixed': return <IoLeafOutline />;
            default: return <IoLeafOutline />;
        }
    };

    // Initialize map and geocoders
    useEffect(() => {
        if (map.current) return;
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [78.0322, 30.3165],
            zoom: 12,
        });

        const setupGeocoder = (id, placeholder, setter) => {
            const geocoder = new MapboxGeocoder({
                accessToken: mapboxgl.accessToken,
                mapboxgl: mapboxgl,
                marker: { color: id === 'origin' ? '#28a745' : '#e74c3c' },
                placeholder: placeholder,
            });
            geocoder.on('result', (e) => setter(e.result.geometry.coordinates));
            document.getElementById(id).appendChild(geocoder.onAdd(map.current));
        };

        setupGeocoder('origin-geocoder', 'Enter starting point...', setOrigin);
        setupGeocoder('destination-geocoder', 'Enter destination...', setDestination);

        // Add source and layer for drawing routes
        map.current.on('load', () => {
            map.current.addSource('route', { type: 'geojson', data: null });
            map.current.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#28a745', 'line-width': 6, 'line-opacity': 0.8 }
            });
        });
    }, []);
    
    // Mock route planning function for demonstration
    const handlePlanRoute = async () => {
        if (!origin || !destination) return alert("Please set origin and destination.");
        setLoading(true);
        setRoutes([]);
        setSelectedRoute(null);
        
        // Simulate API call with mock data
        setTimeout(() => {
            const mockRoutes = [
                {
                    mode: 'mixed',
                    duration: 180,
                    distance: 245,
                    co2Saved: 35,
                    geometry: {
                        type: 'LineString',
                        coordinates: [origin, destination]
                    },
                    steps: [
                        "Start walking from Dehradun Railway Station to the nearest bus stop (5 minutes).",
                        "Take the bus towards Delhi, bus departs every 30 minutes. Enjoy the scenic ride (6 hours).",
                        "Walk from Delhi bus station to your destination (10 minutes)."
                    ]
                },
                {
                    mode: 'cycling',
                    duration: 32,
                    distance: 8.5,
                    co2Saved: 2.1,
                    geometry: {
                        type: 'LineString',
                        coordinates: [origin, destination]
                    },
                    steps: [
                        "Head north on Main Street for 2.5 km",
                        "Turn right onto Green Avenue and continue for 4 km",
                        "Follow the bike path along the river for 2 km"
                    ]
                }
            ];
            setRoutes(mockRoutes);
            setSelectedRoute(mockRoutes[0]);
            setLoading(false);
        }, 1000);
    };

    // Effect to draw the selected route on the map
    useEffect(() => {
        if (selectedRoute && map.current && map.current.getSource('route')) {
            const geojson = {
                type: 'Feature',
                properties: {},
                geometry: selectedRoute.geometry,
            };
            map.current.getSource('route').setData(geojson);
            
            // Fit map to route bounds
            const bounds = new mapboxgl.LngLatBounds(
                selectedRoute.geometry.coordinates[0],
                selectedRoute.geometry.coordinates[0]
            );
            for (const coord of selectedRoute.geometry.coordinates) {
                bounds.extend(coord);
            }
            map.current.fitBounds(bounds, { padding: { top: 50, bottom: 50, left: 450, right: 50 } });
        }
    }, [selectedRoute]);

    return (
        <div>
            <div className="page-header">
                <h2>Plan Your Green Journey</h2>
                <p>Discover sustainable routes that reduce your carbon footprint</p>
            </div>

            <div className="route-planner-layout">
                <div className="controls">
                    <div className="card">
                        <h3><IoLeafOutline style={{color: 'var(--primary-green)'}}/> Plan Your Green Route</h3>
                        
                        <div className="form-group">
                            <label>From</label>
                            <div id="origin-geocoder" className="geocoder-container"></div>
                        </div>

                        <div className="form-group">
                            <label>To</label>
                            <div id="destination-geocoder" className="geocoder-container"></div>
                        </div>

                        <button 
                            onClick={handlePlanRoute} 
                            className="btn btn-primary" 
                            style={{ width: '100%' }} 
                            disabled={loading}
                        >
                            {loading ? 'Calculating...' : '⚡ Plan Eco-Friendly Route'}
                        </button>

                        <div className="quick-routes">
                            <h4>Quick Routes</h4>
                            <div className="quick-route-item">
                                <IoTime className="route-icon" />
                                <div>
                                    <strong>Home → Office</strong>
                                    <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>Your daily commute</p>
                                </div>
                            </div>
                        </div>

                        {routes.length > 0 && (
                            <div className="recommended-routes">
                                <h3>Recommended Green Routes</h3>
                                {routes.map((route, index) => (
                                    <div
                                        key={index}
                                        className={`recommended-route-card ${selectedRoute === route ? 'selected' : ''}`}
                                        onClick={() => setSelectedRoute(route)}
                                        style={{cursor: 'pointer'}}
                                    >
                                        <div className="route-header">
                                            <div className="route-title">
                                                <span className="route-icon">{getModeIcon(route.mode)}</span>
                                                <h4 style={{margin: 0, textTransform: 'capitalize'}}>{route.mode} Route</h4>
                                            </div>
                                            <span className="route-tag">
                                                {route.mode === 'mixed' ? 'Most Eco-Friendly' : 'CYCLING'}
                                            </span>
                                        </div>

                                        <div className="route-stats">
                                            <div className="route-stat">
                                                <div className="route-stat-value">{route.duration}m</div>
                                                <div className="route-stat-label"><IoTime /> Duration</div>
                                            </div>
                                            <div className="route-stat">
                                                <div className="route-stat-value">{route.distance} km</div>
                                                <div className="route-stat-label"><IoLocation /> Distance</div>
                                            </div>
                                            <div className="route-stat">
                                                <div className="route-stat-value" style={{color: 'var(--primary-green)'}}>{route.co2Saved} kg</div>
                                                <div className="route-stat-label"><IoLeafOutline /> CO₂ Saved</div>
                                            </div>
                                        </div>

                                        {route.steps && (
                                            <div className="route-overview">
                                                <h4>Route Overview:</h4>
                                                <ul className="route-steps">
                                                    {route.steps.map((step, stepIndex) => (
                                                        <li key={stepIndex}>{step}</li>
                                                    ))}
                                                    {route.steps.length > 2 && <li>+1 more steps</li>}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                    <div className="carbon-impact-widget">
                        <div className="widget-header">
                            <IoLeafOutline className="widget-icon" />
                            <h4>Your Carbon Impact</h4>
                        </div>
                        
                        <div className="carbon-stats">
                            <div className="carbon-stat">
                                <div className="carbon-value">{mockCarbonData.today} kg</div>
                                <div className="carbon-label">Today</div>
                            </div>
                            <div className="carbon-stat">
                                <div className="carbon-value">{mockCarbonData.thisMonth} kg</div>
                                <div className="carbon-label">This Month</div>
                            </div>
                        </div>

                        <div className="progress-section">
                            <div className="progress-label">
                                <span>Monthly Goal Progress</span>
                                <span>{mockCarbonData.progress}%</span>
                            </div>
                            <div className="progress-bar">
                                <div 
                                    className="progress-bar-inner" 
                                    style={{width: `${mockCarbonData.progress}%`}}
                                ></div>
                            </div>
                            <p style={{fontSize: '0.8rem', color: 'var(--text-light)', margin: '0.5rem 0 0 0'}}>
                                {mockCarbonData.monthlyGoal - mockCarbonData.thisMonth} kg to reach your goal
                            </p>
                        </div>

                        <div className="impact-message">
                            <IoLeafOutline />
                            <span>Equivalent to planting {mockCarbonData.treeEquivalent} trees this month</span>
                        </div>
                    </div>

                    <div className="card weather-widget">
                        <div className="widget-header">
                            <IoSunnyOutline className="widget-icon" style={{color: 'var(--info-yellow)'}} />
                            <h4>Weather Impact</h4>
                        </div>
                        
                        <div className="weather-details">
                            <div>
                                <div className="weather-value">{mockWeatherData.temp}°C</div>
                                <p><IoSunny /> Temp</p>
                            </div>
                            <div>
                                <div className="weather-value">{mockWeatherData.humidity}%</div>
                                <p><IoWaterOutline /> Humidity</p>
                            </div>
                            <div>
                                <div className="weather-value">{mockWeatherData.wind} km/h</div>
                                <p><IoSpeedometer /> Wind</p>
                            </div>
                        </div>
                        
                        <div className="weather-message">
                            {mockWeatherData.condition}
                        </div>
                    </div>

                    <div className="map-container" ref={mapContainer} />
                </div>
            </div>
        </div>
    );
};

export default RoutePlanner;