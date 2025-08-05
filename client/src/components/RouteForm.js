import React, { useEffect, useRef } from 'react';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';

const RouteForm = ({ mapboxToken, onOriginSelect, onDestinationSelect }) => {
    const originRef = useRef(null);
    const destRef = useRef(null);

    useEffect(() => {
        const geocoderOptions = {
            accessToken: mapboxToken,
            types: 'country,region,place,postcode,locality,neighborhood,address',
        };
        
        const originGeocoder = new MapboxGeocoder({
            ...geocoderOptions,
            placeholder: 'Enter your starting point...'
        });
        originGeocoder.addTo(originRef.current);
        originGeocoder.on('result', e => onOriginSelect(e.result));
        originGeocoder.on('clear', () => onOriginSelect(null));

        const destGeocoder = new MapboxGeocoder({
            ...geocoderOptions,
            placeholder: 'Enter your destination...'
        });
        destGeocoder.addTo(destRef.current);
        destGeocoder.on('result', e => onDestinationSelect(e.result));
        destGeocoder.on('clear', () => onDestinationSelect(null));

    }, [mapboxToken, onOriginSelect, onDestinationSelect]);

    return (
        <div className="route-form space-y-4">
            <div ref={originRef}></div>
            <div ref={destRef}></div>
        </div>
    );
};

export default RouteForm;