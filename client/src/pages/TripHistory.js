import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (dateString) => {
  const date = new Date(dateString);
  // FIX: use date-only comparison to avoid timezone drift making "today" show as "1 day ago"
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tripDay = new Date(date);
  tripDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - tripDay) / (1000 * 60 * 60 * 24));

  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Today at ${time}`;
  if (diffDays === 1) return `Yesterday at ${time}`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDuration = (minutes) => {
  // FIX: guard against NaN/undefined so the UI never shows "NaNh NaNm"
  const mins = parseInt(minutes, 10);
  if (!mins || mins < 0) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const getTripIcon = (mode = '') => {
  switch (mode.toLowerCase()) {
    case 'walking':       return '🚶';
    case 'cycling':       return '🚴';
    case 'driving':       return '🚗';
    // FIX: 'mixed' was mapped to the bus icon (same as transit) — give it its own
    case 'mixed':         return '🔄';
    case 'public transit':
    case 'transit':       return '🚌';
    default:              return '🚌';
  }
};

const getModeColor = (mode = '') => {
  switch (mode.toLowerCase()) {
    case 'walking':       return '#10b981';
    case 'cycling':       return '#3b82f6';
    case 'driving':       return '#ef4444';
    case 'mixed':         return '#f59e0b';
    case 'public transit':
    case 'transit':
    default:              return '#8b5cf6';
  }
};

const getEnvironmentalImpact = (co2Saved) => {
  const val = parseFloat(co2Saved) || 0;
  const trees = Math.floor(val / 20);
  if (trees > 0) return `🌳 Equivalent to ${trees} tree${trees > 1 ? 's' : ''}`;
  if (val > 1)   return '🌱 Great eco-friendly choice!';
  return '♻️ Every bit helps!';
};

const DEFAULT_STATS = {
  totalCO2: 0,
  totalTrips: 0,
  totalDistance: 0,
  totalDuration: 0,
  favoriteMode: 'Walking',
};

const computeStats = (tripData) => {
  const totalCO2      = tripData.reduce((s, t) => s + (parseFloat(t.co2Saved)  || 0), 0);
  const totalDistance = tripData.reduce((s, t) => s + (parseFloat(t.distance)  || 0), 0);
  const totalDuration = tripData.reduce((s, t) => s + (parseInt(t.duration, 10)|| 0), 0);

  const modeCount = {};
  tripData.forEach(t => {
    const m = (t.mode || '').toLowerCase();
    modeCount[m] = (modeCount[m] || 0) + 1;
  });

  // FIX: Object.keys on empty object returns [], so .reduce needs a fallback
  const rawFavorite = Object.keys(modeCount).length
    ? Object.keys(modeCount).reduce((a, b) => modeCount[a] >= modeCount[b] ? a : b)
    : 'walking';

  return {
    totalCO2,
    totalTrips: tripData.length,
    totalDistance,
    totalDuration,
    favoriteMode: rawFavorite.charAt(0).toUpperCase() + rawFavorite.slice(1),
  };
};

// ─── Sub-components ────────────────────────────────────────────────────────────

// FIX: replace both window.confirm and alert() calls with this inline dialog.
// window.confirm/alert are synchronous, block the JS thread, and are suppressed
// entirely inside sandboxed iframes (the call returns null / undefined silently).
const Dialog = ({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) => (
  <div style={{
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000,
    animation: 'fadeIn 0.15s ease'
  }}>
    <div style={{
      background: 'var(--bg-primary)',
      borderRadius: 'var(--radius-lg)',
      padding: '2rem',
      maxWidth: '380px', width: '90%',
      boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      animation: 'scaleIn 0.2s ease'
    }}>
      {title && <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: '700' }}>{title}</h4>}
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.95rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem' }}>
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="btn btn-primary"
          style={{
            padding: '0.6rem 1.25rem',
            ...(danger ? { background: '#ef4444', borderColor: '#ef4444' } : {})
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

const Toast = ({ message, type, onDismiss }) => {
  if (!message) return null;
  const colors = {
    success: { bg: 'var(--light-green-bg)', color: 'var(--primary-green)', border: 'var(--primary-green)' },
    error:   { bg: '#fee2e2',              color: '#dc2626',              border: '#dc2626' },
  };
  const s = colors[type] || colors.success;
  return (
    <div
      role="alert"
      onClick={onDismiss}
      style={{
        backgroundColor: s.bg, color: s.color,
        border: `2px solid ${s.border}`,
        padding: '1rem 1.5rem',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '1.5rem',
        fontWeight: '600', fontSize: '0.95rem',
        boxShadow: 'var(--shadow-md)',
        cursor: 'pointer',
        animation: 'slideUp 0.3s ease'
      }}
    >
      {message}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const TripHistory = ({ user }) => {
  const [trips, setTrips]           = useState([]);
  const [stats, setStats]           = useState(DEFAULT_STATS);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [toast, setToast]           = useState({ message: '', type: 'success' });
  const [dialog, setDialog]         = useState(null); // { title, message, confirmLabel, danger, onConfirm }
  // FIX: track which trip had its details copied so we can show inline feedback
  // instead of calling alert()
  const [copiedId, setCopiedId]     = useState(null);

  const toastTimerRef = useRef(null);
  const copyTimerRef  = useRef(null);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (copyTimerRef.current)  clearTimeout(copyTimerRef.current);
    };
  }, []);

  // ── Data fetching ─────────────────────────────────────────────────────────────

  // FIX: wrap in useCallback so it's stable and can be listed as a dep if needed
  const fetchTripHistory = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/history');
      setTrips(data);
      setStats(computeStats(data));
    } catch (error) {
      console.error('Error fetching trip history:', error);
      showToast('Failed to load trip history. Please refresh.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTripHistory();
  }, [fetchTripHistory]);

  // ── Filtering ─────────────────────────────────────────────────────────────────

  const filteredTrips = (() => {
    let result = trips;

    if (filter !== 'all') {
      result = result.filter(t => (t.mode || '').toLowerCase() === filter.toLowerCase());
    }

    if (timeFilter !== 'all') {
      const cutoff = new Date();
      // FIX: 'today' previously used setHours(0,0,0,0) on `filterDate` which was
      // a copy of `now` — so it correctly zeroed the time, but only by coincidence
      // because filterDate was set to `new Date()` before the switch, not `now`.
      // Rewritten clearly to avoid the confusion.
      if (timeFilter === 'today') {
        cutoff.setHours(0, 0, 0, 0);
      } else if (timeFilter === 'week') {
        cutoff.setDate(cutoff.getDate() - 7);
      } else if (timeFilter === 'month') {
        cutoff.setMonth(cutoff.getMonth() - 1);
      }
      result = result.filter(t => new Date(t.date) >= cutoff);
    }

    return result;
  })();

  // ── Actions ───────────────────────────────────────────────────────────────────

  const clearAllHistory = () => {
    setDialog({
      title: 'Clear trip history',
      message: 'Are you sure you want to delete all trip history? This cannot be undone.',
      confirmLabel: 'Delete all',
      danger: true,
      onConfirm: async () => {
        setDialog(null);
        try {
          await axios.delete('/api/history');
          setTrips([]);
          setStats(DEFAULT_STATS);
          showToast('Trip history cleared.', 'success');
        } catch (error) {
          console.error('Error clearing history:', error);
          showToast('Failed to clear history. Please try again.', 'error');
        }
      },
    });
  };

  // FIX: same deferred-revoke fix as Preferences — Firefox needs a tick before revoke
  const exportHistory = () => {
    if (trips.length === 0) {
      showToast('No trips to export.', 'error');
      return;
    }

    const csvContent = [
      ['Date', 'From', 'To', 'Mode', 'Distance (km)', 'Duration (min)', 'CO2 Saved (kg)', 'Calories'],
      ...trips.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.originName,
        t.destinationName,
        t.mode,
        t.distance,
        t.duration,
        t.co2Saved,
        t.calories || 0,
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `greenroute-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100); // FIX: deferred revoke
    showToast('📊 History exported successfully.', 'success');
  };

  // FIX: replace alert('Trip details copied!') with inline button feedback
  const copyTripDetails = (trip) => {
    const text = `${trip.originName} to ${trip.destinationName} via ${trip.mode} — ${trip.distance}km, ${formatDuration(trip.duration)}, ${trip.co2Saved}kg CO₂ saved`;
    navigator.clipboard.writeText(text).then(() => {
      const id = trip._id || trip.date;
      setCopiedId(id);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      showToast('Could not copy to clipboard.', 'error');
    });
  };

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p className="loading-text">Loading your green journey...</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const sectionTitle =
    timeFilter === 'today' ? "Today's Trips" :
    timeFilter === 'week'  ? "This Week's Trips" :
    timeFilter === 'month' ? "This Month's Trips" :
    'All Trips';

  const totalCalories = trips.reduce((s, t) => s + (t.calories || 0), 0);

  return (
    <div className="trip-history-container">
      {dialog && (
        <Dialog
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          danger={dialog.danger}
          onConfirm={dialog.onConfirm}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* Page Header */}
      <div className="page-header">
        <h2 className="page-title">Your Green Journey</h2>
        <p className="page-subtitle">
          Track your sustainable commuting impact and celebrate your eco-friendly choices
        </p>
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
            {/* FIX: was computing hours/minutes inline with no guard against 0 duration */}
            <div className="stat-value">{formatDuration(stats.totalDuration)}</div>
            <div className="stat-label">Time Traveled</div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="filters-section">
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast({ message: '' })} />

        <div className="filters-container">
          <div className="filter-group">
            <label className="filter-label">Filter by mode:</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
              <option value="all">All Modes</option>
              <option value="walking">Walking</option>
              <option value="cycling">Cycling</option>
              <option value="driving">Driving</option>
              {/* FIX: filter value 'transit' now matches getModeColor/getTripIcon which
                  handle both 'transit' and 'public transit' */}
              <option value="transit">Transit</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Time period:</label>
            <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="filter-select">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
            </select>
          </div>
        </div>

        <div className="actions-container">
          <button onClick={exportHistory} className="btn btn-secondary" disabled={trips.length === 0}>
            📊 Export CSV
          </button>
          <button onClick={clearAllHistory} className="btn btn-danger" disabled={trips.length === 0}>
            🗑️ Clear History
          </button>
        </div>
      </div>

      {/* Trip Results */}
      <div className="trips-section">
        <div className="section-header">
          <h3 className="section-title">
            <span className="section-icon">📅</span>
            {sectionTitle}
          </h3>
          {filteredTrips.length > 0 && (
            <div className="results-count">
              {filteredTrips.length} trip{filteredTrips.length !== 1 ? 's' : ''} found
            </div>
          )}
        </div>

        {filteredTrips.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{trips.length === 0 ? '🌱' : '🔍'}</div>
            <h3 className="empty-title">
              {trips.length === 0 ? 'No trips yet' : 'No trips match your filters'}
            </h3>
            <p className="empty-description">
              {trips.length === 0
                ? 'Start planning eco-friendly routes to see your impact here! Every sustainable journey counts.'
                : 'Try adjusting your filters to see more results, or plan a new eco-friendly route.'}
            </p>
            <a href="/" className="btn btn-primary empty-action">
              {trips.length === 0 ? '🗺️ Plan Your First Route' : '🗺️ Plan New Route'}
            </a>
          </div>
        ) : (
          <div className="trips-list">
            {filteredTrips.map((trip, index) => {
              // FIX: key prefers _id but falls back to a stable composite, not just index
              // (index-only keys break React's reconciler when the list is filtered/sorted)
              const tripKey = trip._id || `${trip.date}-${trip.originName}-${index}`;
              const isCopied = copiedId === (trip._id || trip.date);

              return (
                <div key={tripKey} className="trip-card">
                  <div className="trip-header">
                    <div className="trip-route">
                      <div className="trip-icon-container">
                        <span className="trip-icon">{getTripIcon(trip.mode)}</span>
                      </div>
                      <div className="trip-details">
                        <h4 className="trip-title">{trip.originName} → {trip.destinationName}</h4>
                        <div className="trip-date">{formatDate(trip.date)}</div>
                        <div className="trip-impact">{getEnvironmentalImpact(trip.co2Saved)}</div>
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
                        <span className="high-impact-badge">🏆 High Impact</span>
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
                      {/* FIX: raw trip.distance may be a string — parseFloat then toFixed */}
                      <div className="metric-value">{parseFloat(trip.distance).toFixed(1)} km</div>
                    </div>

                    <div className="trip-metric">
                      <div className="metric-header">
                        <span className="metric-icon">🌱</span>
                        <span className="metric-name">CO₂ Saved</span>
                      </div>
                      <div className="metric-value co2-value">
                        {parseFloat(trip.co2Saved).toFixed(2)} kg
                      </div>
                    </div>

                    {trip.calories > 0 && (
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
                    {/* FIX: replace alert() with inline copied feedback */}
                    <button
                      onClick={() => copyTripDetails(trip)}
                      className="btn btn-secondary trip-action-btn"
                      style={isCopied ? { color: 'var(--primary-green)' } : {}}
                    >
                      {isCopied ? '✅ Copied!' : '📋 Copy Details'}
                    </button>

                    <button
                      onClick={() => {
                        const params = new URLSearchParams({
                          from: trip.originName,
                          to:   trip.destinationName,
                          mode: trip.mode,
                        });
                        window.location.href = `/?${params.toString()}`;
                      }}
                      className="btn btn-outline trip-action-btn"
                    >
                      🔄 Plan Similar
                    </button>
                  </div>
                </div>
              );
            })}
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
                  {/* FIX: original had `|| 1` which made 0 CO2 show as "1 Trees" */}
                  <div className="impact-value">{Math.max(0, Math.floor(stats.totalCO2 / 20))} Trees</div>
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
                  <div className="impact-value">{totalCalories.toLocaleString()}</div>
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

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
};

export default TripHistory;
