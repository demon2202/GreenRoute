import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TripHistory = ({ user }) => {
  const [trips, setTrips] = useState([]);
  const [stats, setStats] = useState({
    totalCO2: 0,
    totalTrips: 0,
    totalDistance: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTripHistory();
  }, []);

  const fetchTripHistory = async () => {
    try {
      const response = await axios.get('/api/history');
      const tripData = response.data;
      setTrips(tripData);
      
      // Calculate stats
      const totalCO2 = tripData.reduce((sum, trip) => sum + (parseFloat(trip.co2Saved) || 0), 0);
      const totalTrips = tripData.length;
      const totalDistance = tripData.reduce((sum, trip) => sum + (parseFloat(trip.distance) || 0), 0);
      
      setStats({
        totalCO2: totalCO2,
        totalTrips: totalTrips,
        totalDistance: totalDistance
      });
    } catch (error) {
      console.error('Error fetching trip history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) + ' at ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getTripIcon = (mode) => {
    switch (mode.toLowerCase()) {
      case 'walking': return '🚶';
      case 'cycling': return '🚴';
      case 'driving': return '🚗';
      case 'mixed': return '🚌';
      case 'public transit': return '🚌';
      default: return '🚌';
    }
  };

  const getModeTag = (mode) => {
    const modeClass = mode.toLowerCase().replace(/\s+/g, '-');
    return (
      <span className={`trip-mode-tag ${modeClass}`}>
        {mode}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem' }}>Loading your green journey...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h2>Your Green Journey History</h2>
        <p>Track your sustainable commuting impact over time</p>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon green">🌱</div>
          <div className="stat-value green">{stats.totalCO2.toFixed(1)} kg</div>
          <div className="stat-label">Total CO₂ Saved</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon blue">📈</div>
          <div className="stat-value blue">{stats.totalTrips}</div>
          <div className="stat-label">Green Trips</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon purple">📍</div>
          <div className="stat-value purple">{stats.totalDistance.toFixed(1)} km</div>
          <div className="stat-label">Distance Traveled</div>
        </div>
      </div>

      {/* Recent Trips */}
      <div className="trips-section">
        <h3>
          <span className="nav-icon">📅</span>
          Recent Trips
        </h3>

        {trips.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌱</div>
            <h3>No trips yet</h3>
            <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
              Start planning eco-friendly routes to see your impact here!
            </p>
            <a 
              href="/"
              className="btn btn-primary"
              style={{ textDecoration: 'none' }}
            >
              Plan Your First Route
            </a>
          </div>
        ) : (
          <div className="trip-list">
            {trips.map((trip, index) => (
              <div key={trip._id || index} className="trip-card">
                <div className="trip-header">
                  <div className="trip-route">
                    <span className="trip-icon">{getTripIcon(trip.mode)}</span>
                    <div className="trip-details">
                      <h4>{trip.originName} → {trip.destinationName}</h4>
                      <div className="trip-date">{formatDate(trip.date)}</div>
                    </div>
                  </div>
                  {getModeTag(trip.mode)}
                </div>

                <div className="trip-stats">
                  <div className="trip-stat">
                    <div className="trip-stat-label">
                      <span>⏱️</span> Duration
                    </div>
                    <div className="trip-stat-value">{formatDuration(trip.duration)}</div>
                  </div>
                  
                  <div className="trip-stat">
                    <div className="trip-stat-label">
                      <span>📍</span> Distance
                    </div>
                    <div className="trip-stat-value">{trip.distance} km</div>
                  </div>
                  
                  <div className="trip-stat">
                    <div className="trip-stat-label">
                      <span>🌱</span> CO₂ Saved
                    </div>
                    <div className="trip-stat-value co2-saved">{trip.co2Saved} kg</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TripHistory;
