import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TripHistory = ({ user }) => {
  const [trips, setTrips] = useState([]);
  const [stats, setStats] = useState({
    totalCO2: 0,
    totalTrips: 0,
    totalDistance: 0,
    totalDuration: 0,
    favoriteMode: 'Walking'
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    fetchTripHistory();
  }, []);

  const fetchTripHistory = async () => {
    try {
      const response = await axios.get('/api/history');
      const tripData = response.data;
      setTrips(tripData);
      
      // Calculate comprehensive stats
      const totalCO2 = tripData.reduce((sum, trip) => sum + (parseFloat(trip.co2Saved) || 0), 0);
      const totalTrips = tripData.length;
      const totalDistance = tripData.reduce((sum, trip) => sum + (parseFloat(trip.distance) || 0), 0);
      const totalDuration = tripData.reduce((sum, trip) => sum + (parseInt(trip.duration) || 0), 0);
      
      // Find favorite transport mode
      const modeCount = {};
      tripData.forEach(trip => {
        const mode = trip.mode.toLowerCase();
        modeCount[mode] = (modeCount[mode] || 0) + 1;
      });
      
      const favoriteMode = Object.keys(modeCount).reduce((a, b) => 
        modeCount[a] > modeCount[b] ? a : b, 'walking'
      );
      
      setStats({
        totalCO2,
        totalTrips,
        totalDistance,
        totalDuration,
        favoriteMode: favoriteMode.charAt(0).toUpperCase() + favoriteMode.slice(1)
      });
    } catch (error) {
      console.error('Error fetching trip history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTrips = () => {
    let filtered = trips;
    
    // Filter by transport mode
    if (filter !== 'all') {
      filtered = filtered.filter(trip => 
        trip.mode.toLowerCase() === filter.toLowerCase()
      );
    }
    
    // Filter by time period
    if (timeFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (timeFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        default:
          filterDate.setFullYear(1970);
      }
      
      filtered = filtered.filter(trip => 
        new Date(trip.date) >= filterDate
      );
    }
    
    return filtered;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today at ' + date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffDays === 1) {
      return 'Yesterday at ' + date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffDays < 7) {
      return diffDays + ' days ago';
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getTripIcon = (mode) => {
    switch (mode.toLowerCase()) {
      case 'walking': return '🚶';
      case 'cycling': return '🚴';
      case 'driving': return '🚗';
      case 'mixed': return '🚌';
      case 'public transit': return '🚌';
      case 'transit': return '🚌';
      default: return '🚌';
    }
  };

  const getModeColor = (mode) => {
    switch (mode.toLowerCase()) {
      case 'walking': return '#10b981';
      case 'cycling': return '#3b82f6';
      case 'driving': return '#ef4444';
      case 'mixed':
      case 'public transit':
      case 'transit':
      default: return '#8b5cf6';
    }
  };

  const getEnvironmentalImpact = (co2Saved) => {
    const trees = Math.floor(co2Saved / 20); // Rough estimate: 20kg CO2 = 1 tree
    
    if (trees > 0) {
      return `🌳 Equivalent to ${trees} tree${trees > 1 ? 's' : ''}`;
    } else if (co2Saved > 1) {
      return `🌱 Great eco-friendly choice!`;
    } else {
      return `♻️ Every bit helps!`;
    }
  };

  const clearAllHistory = async () => {
    if (window.confirm('Are you sure you want to delete all trip history? This action cannot be undone.')) {
      try {
        await axios.delete('/api/history');
        setTrips([]);
        setStats({
          totalCO2: 0,
          totalTrips: 0,
          totalDistance: 0,
          totalDuration: 0,
          favoriteMode: 'Walking'
        });
        alert('Trip history cleared successfully!');
      } catch (error) {
        console.error('Error clearing history:', error);
        alert('Failed to clear history. Please try again.');
      }
    }
  };

  const exportHistory = () => {
    if (trips.length === 0) {
      alert('No trips to export!');
      return;
    }

    const csvContent = [
      ['Date', 'From', 'To', 'Mode', 'Distance (km)', 'Duration (min)', 'CO2 Saved (kg)', 'Calories'],
      ...trips.map(trip => [
        new Date(trip.date).toLocaleDateString(),
        trip.originName,
        trip.destinationName,
        trip.mode,
        trip.distance,
        trip.duration,
        trip.co2Saved,
        trip.calories || 0
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greenroute-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredTrips = getFilteredTrips();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading your green journey...</p>
      </div>
    );
  }

  return (
    <div className="trip-history-container">
      {/* Page Header */}
      <div className="page-header">
        <h2 className="page-title">Your Green Journey</h2>
        <p className="page-subtitle">Track your sustainable commuting impact and celebrate your eco-friendly choices</p>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-icon">🌱</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalCO2.toFixed(1)} kg</div>
            <div className="stat-label">Total CO₂ Saved</div>
          </div>
        </div>
        
        <div className="stat-card blue">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalTrips}</div>
            <div className="stat-label">Eco-Friendly Trips</div>
          </div>
        </div>
        
        <div className="stat-card purple">
          <div className="stat-icon">📍</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalDistance.toFixed(1)} km</div>
            <div className="stat-label">Green Distance</div>
          </div>
        </div>
        
        <div className="stat-card orange">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-value">{Math.floor(stats.totalDuration / 60)}h {stats.totalDuration % 60}m</div>
            <div className="stat-label">Time Traveled</div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="filters-section">
        <div className="filters-container">
          <div className="filter-group">
            <label className="filter-label">Filter by mode:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Modes</option>
              <option value="walking">Walking</option>
              <option value="cycling">Cycling</option>
              <option value="driving">Driving</option>
              <option value="transit">Transit</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Time period:</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
            </select>
          </div>
        </div>

        <div className="actions-container">
          <button
            onClick={exportHistory}
            className="btn btn-secondary"
            disabled={trips.length === 0}
          >
            📊 Export CSV
          </button>
          <button
            onClick={clearAllHistory}
            className="btn btn-danger"
            disabled={trips.length === 0}
          >
            🗑️ Clear History
          </button>
        </div>
      </div>

      {/* Trip Results */}
      <div className="trips-section">
        <div className="section-header">
          <h3 className="section-title">
            <span className="section-icon">📅</span>
            {timeFilter === 'all' ? 'All Trips' : 
             timeFilter === 'today' ? 'Today\'s Trips' :
             timeFilter === 'week' ? 'This Week\'s Trips' :
             'This Month\'s Trips'}
          </h3>
          
          {filteredTrips.length > 0 && (
            <div className="results-count">
              {filteredTrips.length} trip{filteredTrips.length !== 1 ? 's' : ''} found
            </div>
          )}
        </div>

        {filteredTrips.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {trips.length === 0 ? '🌱' : '🔍'}
            </div>
            <h3 className="empty-title">
              {trips.length === 0 ? 'No trips yet' : 'No trips match your filters'}
            </h3>
            <p className="empty-description">
              {trips.length === 0 ? 
                'Start planning eco-friendly routes to see your impact here! Every sustainable journey counts towards a greener future.' :
                'Try adjusting your filters to see more results, or plan a new eco-friendly route.'
              }
            </p>
            <a href="/" className="btn btn-primary empty-action">
              {trips.length === 0 ? '🗺️ Plan Your First Route' : '🗺️ Plan New Route'}
            </a>
          </div>
        ) : (
          <div className="trips-list">
            {filteredTrips.map((trip, index) => (
              <div key={trip._id || index} className="trip-card">
                <div className="trip-header">
                  <div className="trip-route">
                    <div className="trip-icon-container">
                      <span className="trip-icon">{getTripIcon(trip.mode)}</span>
                    </div>
                    <div className="trip-details">
                      <h4 className="trip-title">{trip.originName} → {trip.destinationName}</h4>
                      <div className="trip-date">{formatDate(trip.date)}</div>
                      <div className="trip-impact">{getEnvironmentalImpact(parseFloat(trip.co2Saved))}</div>
                    </div>
                  </div>
                  <div className="trip-badges">
                    <span 
                      className="trip-mode-badge"
                      style={{ backgroundColor: getModeColor(trip.mode) }}
                    >
                      {trip.mode}
                    </span>
                    {parseFloat(trip.co2Saved) > 5 && (
                      <span className="high-impact-badge">
                        🏆 High Impact
                      </span>
                    )}
                  </div>
                </div>

                <div className="trip-metrics">
                  <div className="trip-metric">
                    <div className="metric-header">
                      <span className="metric-icon">⏱️</span>
                      <span className="metric-name">Duration</span>
                    </div>
                    <div className="metric-value">{formatDuration(trip.duration)}</div>
                  </div>
                  
                  <div className="trip-metric">
                    <div className="metric-header">
                      <span className="metric-icon">📍</span>
                      <span className="metric-name">Distance</span>
                    </div>
                    <div className="metric-value">{trip.distance} km</div>
                  </div>
                  
                  <div className="trip-metric">
                    <div className="metric-header">
                      <span className="metric-icon">🌱</span>
                      <span className="metric-name">CO₂ Saved</span>
                    </div>
                    <div className="metric-value co2-value">{trip.co2Saved} kg</div>
                  </div>

                  {trip.calories && trip.calories > 0 && (
                    <div className="trip-metric">
                      <div className="metric-header">
                        <span className="metric-icon">🔥</span>
                        <span className="metric-name">Calories</span>
                      </div>
                      <div className="metric-value">{trip.calories}</div>
                    </div>
                  )}
                </div>

                <div className="trip-actions">
                  <button
                    onClick={() => {
                      const tripDetails = `${trip.originName} to ${trip.destinationName} via ${trip.mode} - ${trip.distance}km, ${formatDuration(trip.duration)}, ${trip.co2Saved}kg CO₂ saved`;
                      navigator.clipboard.writeText(tripDetails);
                      alert('Trip details copied to clipboard!');
                    }}
                    className="btn btn-secondary trip-action-btn"
                  >
                    📋 Copy Details
                  </button>
                  
                  <button
                    onClick={() => {
                      // Plan similar route functionality
                      const params = new URLSearchParams({
                        from: trip.originName,
                        to: trip.destinationName,
                        mode: trip.mode
                      });
                      window.location.href = `/?${params.toString()}`;
                    }}
                    className="btn btn-outline trip-action-btn"
                  >
                    🔄 Plan Similar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Environmental Impact Summary */}
        {trips.length > 0 && (
          <div className="impact-summary">
            <div className="impact-header">
              <h3 className="impact-title">🌍 Your Environmental Impact</h3>
            </div>
            
            <div className="impact-grid">
              <div className="impact-item">
                <div className="impact-icon">🌳</div>
                <div className="impact-content">
                  <div className="impact-value">{Math.floor(stats.totalCO2 / 20) || 1} Trees</div>
                  <div className="impact-description">Equivalent planted</div>
                </div>
              </div>
              
              <div className="impact-item">
                <div className="impact-icon">⛽</div>
                <div className="impact-content">
                  <div className="impact-value">{(stats.totalDistance * 0.08).toFixed(1)}L</div>
                  <div className="impact-description">Fuel saved</div>
                </div>
              </div>
              
              <div className="impact-item">
                <div className="impact-icon">🚴</div>
                <div className="impact-content">
                  <div className="impact-value">{stats.favoriteMode}</div>
                  <div className="impact-description">Favorite mode</div>
                </div>
              </div>

              <div className="impact-item">
                <div className="impact-icon">💪</div>
                <div className="impact-content">
                  <div className="impact-value">{trips.reduce((sum, trip) => sum + (trip.calories || 0), 0)}</div>
                  <div className="impact-description">Calories burned</div>
                </div>
              </div>
            </div>

            <div className="impact-message">
              <h4 className="message-title">🎉 Keep up the amazing work!</h4>
              <p className="message-text">
                You've made a real difference with your sustainable travel choices. 
                Every eco-friendly trip helps build a greener future for everyone.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripHistory;
