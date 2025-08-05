import React from 'react';

const RouteList = ({ routes, selectedRoute, onSelectRoute }) => {
    if (routes.length === 0) {
        return <div className="mt-6 text-center text-gray-400">Your sustainable routes will appear here.</div>;
    }
    
    const getIcon = (mode) => {
        switch (mode) {
            case 'driving': return '🚗';
            case 'transit': return '🚌';
            case 'cycling': return '🚲';
            case 'walking': return '🚶';
            default: return '📍';
        }
    };
    
    return (
        <div className="route-list">
            {routes.map((route, index) => (
                <div
                    key={index}
                    className={`route-item ${selectedRoute?.geometry === route.geometry ? 'selected' : ''}`}
                    onClick={() => onSelectRoute(route)}
                >
                    <div className="route-header">
                        <div className="flex items-center">
                            <span className="icon">{getIcon(route.mode)}</span>
                            <h3>{route.mode}</h3>
                        </div>
                        <div className="font-bold text-lg">
                            {route.emissions} <span className="text-sm font-normal text-gray-300">kg CO₂e</span>
                        </div>
                    </div>
                    <div className="route-details">
                        <div className="detail-item">
                            <span>{route.duration}</span> min
                        </div>
                        <div className="detail-item">
                            <span>{route.distance}</span> km
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default RouteList;