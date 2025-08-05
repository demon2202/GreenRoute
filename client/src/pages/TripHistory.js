import React from 'react';
import { IoLeafOutline, IoTrendingUp, IoLocation, IoTime, IoSpeedometer, 
         IoBicycle, IoWalk, IoGitNetwork } from 'react-icons/io5';

const TripHistory = () => {
    // Mock data for demonstration
    const statsData = {
        totalCO2Saved: 41.1,
        greenTrips: 4,
        distanceTraveled: 267.6
    };

    const recentTrips = [
        {
            id: 1,
            from: "dehradun",
            to: "delhi",
            date: "Jul 19, 2025 at 1:54 PM",
            mode: "mixed",
            duration: "180m",
            distance: "245 km",
            co2Saved: "35 kg",
            icon: <IoGitNetwork />
        },
        {
            id: 2,
            from: "Downtown Plaza",
            to: "Tech Park",
            date: "Jul 19, 2025 at 1:46 PM",
            mode: "cycling",
            duration: "32m",
            distance: "8.5 km",
            co2Saved: "2.1 kg",
            icon: <IoBicycle />
        }
    ];

    return (
        <div>
            <div className="page-header">
                <h2>Your Green Journey History</h2>
                <p>Track your sustainable commuting impact over time</p>
            </div>

            {/* Stats Overview */}
            <div className="stats-overview">
                <div className="stat-card">
                    <IoLeafOutline className="stat-icon green" />
                    <div className="stat-value green">{statsData.totalCO2Saved} kg</div>
                    <div className="stat-label">Total CO₂ Saved</div>
                </div>
                <div className="stat-card">
                    <IoTrendingUp className="stat-icon blue" />
                    <div className="stat-value blue">{statsData.greenTrips}</div>
                    <div className="stat-label">Green Trips</div>
                </div>
                <div className="stat-card">
                    <IoLocation className="stat-icon purple" />
                    <div className="stat-value purple">{statsData.distanceTraveled} km</div>
                    <div className="stat-label">Distance Traveled</div>
                </div>
            </div>

            {/* Recent Trips */}
            <div className="card">
                <div className="trips-section">
                    <h3>
                        <IoTime style={{color: 'var(--primary-green)'}} />
                        Recent Trips
                    </h3>
                    
                    <div className="trip-list">
                        {recentTrips.map((trip) => (
                            <div key={trip.id} className="trip-card">
                                <div className="trip-header">
                                    <div className="trip-route">
                                        <div className="trip-icon">{trip.icon}</div>
                                        <div className="trip-details">
                                            <h4>{trip.from} → {trip.to}</h4>
                                            <div className="trip-date">{trip.date}</div>
                                        </div>
                                    </div>
                                    <div className={`trip-mode-tag ${trip.mode}`}>
                                        {trip.mode.toUpperCase()}
                                    </div>
                                </div>

                                <div className="trip-stats">
                                    <div className="trip-stat">
                                        <div className="trip-stat-label">
                                            <IoTime /> Duration
                                        </div>
                                        <div className="trip-stat-value">{trip.duration}</div>
                                    </div>
                                    <div className="trip-stat">
                                        <div className="trip-stat-label">
                                            <IoSpeedometer /> Distance
                                        </div>
                                        <div className="trip-stat-value">{trip.distance}</div>
                                    </div>
                                    <div className="trip-stat">
                                        <div className="trip-stat-label">
                                            <IoLeafOutline /> CO₂ Saved
                                        </div>
                                        <div className="trip-stat-value co2-saved">{trip.co2Saved}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TripHistory;