import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

const Map = ({ mapboxToken, route }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    
    mapboxgl.accessToken = mapboxToken;

    useEffect(() => {
        if (map.current) return; // initialize map only once
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11', // A cool dark theme
            center: [-96, 37.8],
            zoom: 3
        });
    });

    useEffect(() => {
        if (!route || !map.current) return;

        const geojson = {
            type: 'Feature',
            properties: {},
            geometry: route.geometry
        };

        if (map.current.getSource('route')) {
            map.current.getSource('route').setData(geojson);
        } else {
            map.current.addSource('route', {
                type: 'geojson',
                data: geojson
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
                    'line-color': '#4CAF50',
                    'line-width': 7,
                    'line-opacity': 0.85,
                    'line-gradient': [
                        'interpolate',
                        ['linear'],
                        ['line-progress'],
                        0, "rgba(76, 175, 80, 0.2)",
                        1, "#4CAF50"
                    ]
                }
            });
        }
        
        // Fit map to route bounds
        const coordinates = route.geometry.coordinates;
        const bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);
        for (const coord of coordinates) {
            bounds.extend(coord);
        }
        map.current.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 420, right: 50 } // Adjust padding for the UI panel
        });

    }, [route]);

    return <div ref={mapContainer} className="map-container" />;
};

export default Map;