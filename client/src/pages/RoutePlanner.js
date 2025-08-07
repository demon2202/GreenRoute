import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { planRoute, fetchWeather } from '../services/api';
import { IoWalk, IoCarSport, IoBicycle, IoTime, IoLocation, IoSunnyOutline, IoWaterOutline, IoSpeedometer, IoSunny } from 'react-icons/io5';
import CarbonImpact from '../components/CarbonImpact';

mapboxgl.accessToken = 'kk';

const RoutePlanner = () => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [loading, setLoading] = useState(false);
    const [weatherData, setWeatherData] = useState(null);

    const getModeIcon = (mode) => {
        switch (mode) {
            case 'walking': return <IoWalk />;
            case 'cycling': return <IoBicycle />;
            case 'driving': return <IoCarSport />;
            default: return <IoWalk />;
        }
    };

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
            geocoder.on('result', (e) => {
                const coords = e.result.geometry.coordinates;
                setter(coords);
                if (id === 'origin') {
                    fetchWeatherData(coords[1], coords[0]);
                }
            });
            document.getElementById(id).appendChild(geocoder.onAdd(map.current));
        };

        setupGeocoder('origin-geocoder', 'Enter starting point...', setOrigin);
        setupGeocoder('destination-geocoder', 'Enter destination...', setDestination);

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

    const fetchWeatherData = async (lat, lon) => {
        try {
            const { data } = await fetchWeather(lat, lon);
            setWeatherData({
                temp: data.main.temp,
                humidity: data.main.humidity,
                wind: data.wind.speed,
                condition: `Weather: ${data.weather[0].description}`
            });
        } catch (error) {
            console.error("Failed to fetch weather data", error);
        }
    };

    const handlePlanRoute = async () => {
        if (!origin || !destination) return alert("Please set origin and destination.");
        setLoading(true);
        setRoutes([]);
        setSelectedRoute(null);

        try {
            const { data } = await planRoute(origin, destination);
            setRoutes(data);
            if (data.length > 0) {
                setSelectedRoute(data[0]);
            }
        } catch (error) {
            console.error("Error planning route:", error);
            alert("Failed to plan route. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedRoute && map.current && map.current.getSource('route')) {
            const geojson = {
                type: 'Feature',
                properties: {},
                geometry: selectedRoute.geometry,
            };
            map.current.getSource('route').setData(geojson);
            
            const bounds = new mapboxgl.LngLatBounds();
            selectedRoute.geometry.coordinates.forEach(coord => {
                bounds.extend(coord);
            });
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
                        <h3>Plan Your Green Route</h3>
                        
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
                            {loading ? 'Calculating...' : 'Plan Eco-Friendly Route'}
                        </button>

                        {routes.length > 0 && (
                            <div className="recommended-routes">
                                <h3>Recommended Routes</h3>
                                {routes.map((route, index) => (
                                    <div
                                        key={index}
                                        className={`recommended-route-card ${selectedRoute === route ? 'selected' : ''}`}
                                        onClick={() => setSelectedRoute(route)}
                                    >
                                        <div className="route-header">
                                            {getModeIcon(route.mode)}
                                            <h4>{route.mode}</h4>
                                        </div>
                                        <div className="route-stats">
                                            <div>
                                                <IoTime /> {route.duration} min
                                            </div>
                                            <div>
                                                <IoLocation /> {route.distance} km
                                            </div>
                                            <div>
                                                CO₂ Saved: {route.co2Saved} kg
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                    <CarbonImpact />

                    {weatherData && (
                        <div className="card weather-widget">
                            <div className="widget-header">
                                <IoSunnyOutline className="widget-icon" />
                                <h4>Weather Impact</h4>
                            </div>
                            <div className="weather-details">
                                <div>
                                    <div className="weather-value">{weatherData.temp}°C</div>
                                    <p><IoSunny /> Temp</p>
                                </div>
                                <div>
                                    <div className="weather-value">{weatherData.humidity}%</div>
                                    <p><IoWaterOutline /> Humidity</p>
                                </div>
                                <div>
                                    <div className="weather-value">{weatherData.wind} m/s</div>
                                    <p><IoSpeedometer /> Wind</p>
                                </div>
                            </div>
                            <div className="weather-message">
                                {weatherData.condition}
                            </div>
                        </div>
                    )}

                    <div className="map-container" ref={mapContainer} />
                </div>
            </div>
        </div>
    );
};

export default RoutePlanner;
