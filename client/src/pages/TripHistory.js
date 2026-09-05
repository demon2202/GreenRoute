import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getCachedData, setCachedData } from '../utils/cache';

/* ── Minimalist SVG icons matching the reference designs ── */
const Icon = ({ name, size = 18 }) => {
  const icons = {
    tree: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22v-6" />
        <path d="M12 16a6 6 0 0 1-6-6c0-2 1-4 3-5 0-3 3-4 6-4s6 1 6 4c2 1 3 3 3 5a6 6 0 0 1-6 6z" />
      </svg>
    ),
    compass: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
    cycling: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18.5" cy="17.5" r="3.5" />
        <circle cx="5.5" cy="17.5" r="3.5" />
        <circle cx="15" cy="5" r="1" />
        <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
      </svg>
    ),
    walking: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m13 4 1 2-2 4 3 4-2 6" />
        <path d="m9 10-3 4 2 6" />
        <circle cx="12" cy="3" r="1.5" />
      </svg>
    ),
    driving: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3C13 6.8 11.8 6 10.5 6H8.2C7.5 6 7 6.5 7 7.2v3.3C7 11.2 7.5 11.7 8.2 11.7h1.6c.7 0 1.2-.5 1.2-1.2V9M2 17h10c1.1 0 2-.9 2-2V9" />
        <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
      </svg>
    ),
    transit: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="16" rx="2" ry="2" /><path d="M6 6h12v4H6ZM6 14h2v2H6ZM16 14h2v2h-2ZM8 19v2M16 19v2" />
      </svg>
    ),
    clock: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    leaf: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    ),
    filter: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
    ),
    trash: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4h6v2" />
      </svg>
    ),
    download: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    mapPin: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  };
  return icons[name] || null;
};

const MODE_META = {
  walking: { label: 'Walking', icon: 'walking', badge: 'Zero Emission' },
  cycling: { label: 'Cycling', icon: 'cycling', badge: 'Eco Commute' },
  driving: { label: 'Driving', icon: 'driving', badge: 'Vehicle Trip' },
  transit: { label: 'Transit', icon: 'transit', badge: 'Public Transit' },
};

const TripHistory = ({ user }) => {
  const cachedTrips = getCachedData('trips', []);
  const [trips, setTrips] = useState(cachedTrips);
  const [loading, setLoading] = useState(cachedTrips.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const { data } = await axios.get('/api/history');
      if (Array.isArray(data)) {
        setTrips(data);
        setCachedData('trips', data);
      }
    } catch (e) {
      console.warn('History fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your trip history?')) return;
    try {
      await axios.delete('/api/history');
      setTrips([]);
    } catch (e) {
      console.error('Clear history error:', e);
    }
  };

  const exportCSV = () => {
    if (!trips.length) return;
    const rows = [
      ['Date', 'Origin', 'Destination', 'Mode', 'Distance (km)', 'Duration (min)', 'CO2 Saved (kg)', 'Calories'],
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
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `greenroute-impact-history-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aggregated Stats
  const stats = useMemo(() => {
    const totalCount = trips.length;
    const totalCO2 = trips.reduce((sum, t) => sum + (parseFloat(t.co2Saved) || 0), 0);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    let thisMonthCO2 = 0;
    let lastMonthCO2 = 0;
    let thisMonthTrips = 0;

    const modeCounts = {};

    trips.forEach(t => {
      const co2 = parseFloat(t.co2Saved) || 0;
      const d = t.date ? new Date(t.date) : (t.createdAt ? new Date(t.createdAt) : null);

      if (d && !isNaN(d.getTime())) {
        if (d >= startOfCurrentMonth && d <= now) {
          thisMonthCO2 += co2;
          thisMonthTrips += 1;
        } else if (d >= startOfLastMonth && d <= endOfLastMonth) {
          lastMonthCO2 += co2;
        }
      }

      const m = (t.mode || 'cycling').toLowerCase();
      modeCounts[m] = (modeCounts[m] || 0) + 1;
    });

    // Calculate month-over-month trend
    let co2BadgeText = '0 kg this month';
    let co2BadgeType = 'neutral';

    if (lastMonthCO2 > 0) {
      const diffPct = Math.round(((thisMonthCO2 - lastMonthCO2) / lastMonthCO2) * 100);
      if (diffPct > 0) {
        co2BadgeText = `+${diffPct}% this month`;
        co2BadgeType = 'green';
      } else if (diffPct < 0) {
        co2BadgeText = `${diffPct}% this month`;
        co2BadgeType = 'neutral';
      } else {
        co2BadgeText = '0% change this month';
        co2BadgeType = 'neutral';
      }
    } else if (thisMonthCO2 > 0) {
      co2BadgeText = `+${thisMonthCO2.toFixed(1)} kg this month`;
      co2BadgeType = 'green';
    }

    // Determine primary mode
    let primaryMode = 'None';
    let primaryPct = 0;

    if (totalCount > 0) {
      const sortedModes = Object.keys(modeCounts).sort((a, b) => modeCounts[b] - modeCounts[a]);
      const topMode = sortedModes[0];
      if (topMode) {
        primaryMode = topMode.charAt(0).toUpperCase() + topMode.slice(1);
        primaryPct = Math.round((modeCounts[topMode] / totalCount) * 100);
      }
    }

    return {
      totalCO2: totalCO2.toFixed(1),
      totalCount,
      thisMonthTrips,
      co2BadgeText,
      co2BadgeType,
      primaryMode,
      primaryPct,
    };
  }, [trips]);

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const mode = (t.mode || '').toLowerCase();
      if (activeFilter !== 'all' && mode !== activeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const origin = (t.originName || '').toLowerCase();
        const dest = (t.destinationName || '').toLowerCase();
        return origin.includes(q) || dest.includes(q);
      }
      return true;
    });
  }, [trips, activeFilter, searchQuery]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (diffDays === 0) return `Today, ${timeStr}`;
    if (diffDays === 1) return `Yesterday, ${timeStr}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  const handleRepeatTrip = (trip) => {
    const params = new URLSearchParams();
    if (trip.originName) params.set('from', trip.originName);
    if (trip.destinationName) params.set('to', trip.destinationName);
    if (trip.originCoords?.lat && trip.originCoords?.lng) {
      params.set('from_coords', `${trip.originCoords.lng},${trip.originCoords.lat}`);
    }
    if (trip.destinationCoords?.lat && trip.destinationCoords?.lng) {
      params.set('to_coords', `${trip.destinationCoords.lng},${trip.destinationCoords.lat}`);
    }
    if (trip.mode) params.set('mode', trip.mode);
    navigate(`/?${params.toString()}`);
  };

  return (
    <div className="impact-page-wrapper">
      {/* ── Top Header & Breadcrumb ── */}
      <div className="impact-top-bar">
        <div className="impact-top-title">Trip History</div>
        <div className="impact-top-actions">
          <div className="impact-search-input-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search trips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="impact-search-input"
            />
          </div>
          {trips.length > 0 && (
            <>
              <button onClick={exportCSV} className="impact-action-btn" title="Export CSV">
                <Icon name="download" size={16} />
              </button>
              <button onClick={handleClearHistory} className="impact-action-btn danger" title="Clear History">
                <Icon name="trash" size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="impact-container">
        {/* ── Headline Section ── */}
        <div className="impact-hero-header">
          <h1 className="impact-main-title">Your Impact Journey</h1>
          <p className="impact-subtitle">
            Review your past travels and the positive trace you've left behind.
          </p>
        </div>

        {/* ── 3 High-Impact KPI Stat Cards ── */}
        <div className="impact-stats-grid">
          {/* Card 1: Total CO2 Saved */}
          <div className="impact-stat-card">
            <div className="stat-card-top">
              <div className="stat-icon-emblem green">
                <Icon name="tree" size={22} />
              </div>
              <span className={`stat-badge-pill ${stats.co2BadgeType}`}>{stats.co2BadgeText}</span>
            </div>
            <div className="stat-card-body">
              <div className="stat-label-text">TOTAL CO2 SAVED</div>
              <div className="stat-number-display green">
                {stats.totalCO2} <span className="stat-unit">kg</span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Journeys */}
          <div className="impact-stat-card">
            <div className="stat-card-top">
              <div className="stat-icon-emblem amber">
                <Icon name="compass" size={22} />
              </div>
              <span className="stat-badge-pill neutral">{stats.totalCount > 0 ? `${stats.thisMonthTrips} this month` : '0 this month'}</span>
            </div>
            <div className="stat-card-body">
              <div className="stat-label-text">TOTAL JOURNEYS</div>
              <div className="stat-number-display">
                {stats.totalCount}
              </div>
            </div>
          </div>

          {/* Card 3: Primary Mode */}
          <div className="impact-stat-card">
            <div className="stat-card-top">
              <div className="stat-icon-emblem blue">
                <Icon name={stats.primaryMode.toLowerCase() === 'walking' ? 'walking' : 'cycling'} size={22} />
              </div>
              <span className="stat-badge-pill neutral">{stats.totalCount > 0 ? `${stats.primaryPct}% of trips` : '0 trips'}</span>
            </div>
            <div className="stat-card-body">
              <div className="stat-label-text">PRIMARY MODE</div>
              <div className="stat-mode-display">
                {stats.primaryMode}
              </div>
            </div>
          </div>
        </div>

        {/* ── Recent Journeys Section ── */}
        <div className="recent-journeys-section">
          <div className="recent-journeys-header">
            <h2 className="recent-title">Recent Journeys</h2>

            {/* Filter Pills */}
            <div className="mode-filter-pills">
              {['all', 'walking', 'cycling', 'driving', 'transit'].map((mode) => (
                <button
                  key={mode}
                  className={`filter-pill-btn ${activeFilter === mode ? 'active' : ''}`}
                  onClick={() => setActiveFilter(mode)}
                >
                  {mode === 'all' ? 'All Modes' : MODE_META[mode]?.label || mode}
                </button>
              ))}
            </div>
          </div>

          {/* Trip Cards List */}
          {loading ? (
            <div className="impact-loading-skeleton">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-trip-card" />
              ))}
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="impact-empty-card">
              <div className="empty-icon-wrap">
                <Icon name="leaf" size={32} />
              </div>
              <h3 className="empty-title">No Journeys Recorded Yet</h3>
              <p className="empty-desc">
                Plan your first eco-friendly journey to begin tracking your positive carbon offset.
              </p>
              <button onClick={() => navigate('/')} className="empty-cta-btn">
                Plan a Route
              </button>
            </div>
          ) : (
            <div className="journey-cards-list">
              {filteredTrips.map((trip, idx) => {
                const modeMeta = MODE_META[trip.mode?.toLowerCase()] || MODE_META.cycling;
                const tripTitle = `${trip.originName?.split(',')[0]} to ${trip.destinationName?.split(',')[0]}`;

                return (
                  <div key={trip._id || idx} className="journey-card">
                    {/* Left snapshot thumbnail / map tile preview */}
                    <div className="journey-map-thumbnail">
                      <div className="thumb-map-pattern">
                        <Icon name="mapPin" size={24} />
                      </div>
                      <div className="thumb-mode-badge">
                        <Icon name={modeMeta.icon} size={14} />
                      </div>
                    </div>

                    {/* Middle Details */}
                    <div className="journey-content">
                      <div className="journey-meta-row">
                        <div className="journey-timestamp">
                          <span className="dot-indicator" />
                          <span>{formatDate(trip.date)}</span>
                        </div>
                        <span className="journey-eco-tag">{modeMeta.badge}</span>
                      </div>

                      <h3 className="journey-title">{tripTitle}</h3>

                      <div className="journey-waypoints">
                        <span className="waypoint-origin">{trip.originName?.split(',')[0]}</span>
                        <span className="waypoint-sep">···</span>
                        <span className="waypoint-dest">{trip.destinationName?.split(',')[0]}</span>
                      </div>

                      <div className="journey-telemetry">
                        <div className="telemetry-item">
                          <Icon name="clock" size={15} />
                          <span>{trip.duration ? `${trip.duration} min` : (trip.durationSeconds ? `${Math.max(1, Math.round(trip.durationSeconds / 60))} min` : '1 min')}</span>
                        </div>
                        <div className="telemetry-item eco">
                          <Icon name="leaf" size={15} />
                          <span>{parseFloat(trip.co2Saved) > 0 ? `-${parseFloat(trip.co2Saved).toFixed(2)} kg CO2` : '0.0 kg CO2'}</span>
                        </div>
                        {trip.distance ? (
                          <div className="telemetry-item">
                            <span>{parseFloat(trip.distance).toFixed(1)} km</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Right Action Button */}
                    <div className="journey-actions">
                      <button
                        onClick={() => handleRepeatTrip(trip)}
                        className="view-details-btn"
                        title="Repeat or View Details"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .impact-page-wrapper {
          min-height: 100vh;
          background: var(--bg-primary, #FBF9F4);
          color: var(--text-primary, #1C281F);
          padding: 1.5rem 2.5rem 3rem;
          box-sizing: border-box;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        /* ── Top Bar ── */
        .impact-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          padding-bottom: 1.25rem;
          border-bottom: 1.5px solid var(--border-color, #EAE4DA);
        }

        .impact-top-title {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--primary, #4A7C59);
        }

        .impact-top-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .impact-search-input-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-secondary, #FFFFFF);
          border: 1.5px solid var(--border-color, #EAE4DA);
          border-radius: 9999px;
          padding: 0.45rem 1rem;
          width: 240px;
          transition: border-color 0.2s ease;
        }

        .impact-search-input-wrap:focus-within {
          border-color: var(--primary, #4A7C59);
        }

        .impact-search-input {
          background: transparent;
          border: none;
          outline: none;
          font-family: inherit;
          font-size: 0.85rem;
          color: var(--text-primary, #1C281F);
          width: 100%;
        }

        .impact-action-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1.5px solid var(--border-color, #EAE4DA);
          background: var(--bg-secondary, #FFFFFF);
          color: var(--text-secondary, #5F7163);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .impact-action-btn:hover {
          border-color: var(--primary, #4A7C59);
          color: var(--primary, #4A7C59);
          background: var(--primary-soft, #E8EFE9);
        }

        .impact-action-btn.danger:hover {
          border-color: #EF4444;
          color: #EF4444;
          background: #FEE2E2;
        }

        /* ── Container ── */
        .impact-container {
          max-width: 1120px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 2.25rem;
        }

        .impact-hero-header {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .impact-main-title {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--text-primary, #1C281F);
          letter-spacing: -0.02em;
          margin: 0;
        }

        .impact-subtitle {
          font-size: 1rem;
          color: var(--text-secondary, #5F7163);
          margin: 0;
        }

        /* ── Stat Cards Grid ── */
        .impact-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        .impact-stat-card {
          background: var(--bg-secondary, #FFFFFF);
          border: 1.5px solid var(--border-color, #EAE4DA);
          border-radius: 20px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 140px;
          box-shadow: 0 4px 16px rgba(28, 40, 31, 0.03);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .impact-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(28, 40, 31, 0.06);
        }

        .stat-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
        }

        .stat-icon-emblem {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon-emblem.green {
          background: #EAF1EB;
          color: #4A7C59;
        }

        .stat-icon-emblem.amber {
          background: #FEF3C7;
          color: #D97706;
        }

        .stat-icon-emblem.blue {
          background: #EFF6FF;
          color: #2563EB;
        }

        .stat-badge-pill {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
        }

        .stat-badge-pill.green {
          background: #EAF1EB;
          color: #2D5334;
        }

        .stat-badge-pill.neutral {
          background: var(--bg-input, #F3EFE8);
          color: var(--text-secondary, #5F7163);
        }

        .stat-label-text {
          font-size: 0.72rem;
          font-weight: 800;
          color: var(--text-secondary, #5F7163);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 0.35rem;
        }

        .stat-number-display {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 2.2rem;
          font-weight: 700;
          color: var(--text-primary, #1C281F);
          line-height: 1;
        }

        .stat-number-display.green {
          color: var(--primary, #4A7C59);
        }

        .stat-unit {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-secondary, #5F7163);
        }

        .stat-mode-display {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 2.1rem;
          font-weight: 700;
          color: var(--text-primary, #1C281F);
          line-height: 1;
        }

        /* ── Recent Journeys ── */
        .recent-journeys-section {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .recent-journeys-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .recent-title {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--text-primary, #1C281F);
          margin: 0;
        }

        .mode-filter-pills {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
        }

        .filter-pill-btn {
          padding: 0.4rem 0.9rem;
          border-radius: 9999px;
          border: 1.5px solid var(--border-color, #EAE4DA);
          background: var(--bg-secondary, #FFFFFF);
          color: var(--text-secondary, #5F7163);
          font-family: inherit;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .filter-pill-btn:hover {
          border-color: var(--primary, #4A7C59);
          color: var(--primary, #4A7C59);
        }

        .filter-pill-btn.active {
          background: var(--primary, #4A7C59);
          color: #FFFFFF;
          border-color: var(--primary, #4A7C59);
          box-shadow: 0 2px 8px var(--primary-glow);
        }

        /* ── Journey Cards ── */
        .journey-cards-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .journey-card {
          background: var(--bg-secondary, #FFFFFF);
          border: 1.5px solid var(--border-color, #EAE4DA);
          border-radius: 20px;
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          box-shadow: 0 4px 14px rgba(28, 40, 31, 0.03);
          transition: all 0.2s ease;
        }

        .journey-card:hover {
          border-color: var(--primary, #4A7C59);
          box-shadow: 0 6px 20px rgba(74, 124, 89, 0.08);
          transform: translateY(-1px);
        }

        .journey-map-thumbnail {
          width: 72px;
          height: 72px;
          border-radius: 16px;
          background: #EAF1EB;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #7DAF87;
          border: 1px solid var(--border-color, #EAE4DA);
          overflow: hidden;
        }

        .thumb-mode-badge {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #FFFFFF;
          color: var(--primary, #4A7C59);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }

        .journey-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .journey-meta-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .journey-timestamp {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary, #5F7163);
        }

        .dot-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4A7C59;
        }

        .journey-eco-tag {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.15rem 0.55rem;
          border-radius: 9999px;
          background: #EAF1EB;
          color: #2D5334;
        }

        .journey-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary, #1C281F);
          margin: 0;
        }

        .journey-waypoints {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--text-secondary, #5F7163);
        }

        .waypoint-sep {
          letter-spacing: 0.1em;
          color: var(--text-muted, #95A599);
        }

        .journey-telemetry {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          margin-top: 0.25rem;
        }

        .telemetry-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary, #5F7163);
        }

        .telemetry-item.eco {
          color: var(--primary, #4A7C59);
          font-weight: 700;
        }

        .journey-actions {
          flex-shrink: 0;
        }

        .view-details-btn {
          height: 38px;
          padding: 0 1.25rem;
          border-radius: 9999px;
          border: 1.5px solid var(--border-color, #EAE4DA);
          background: var(--bg-input, #F3EFE8);
          color: var(--text-primary, #1C281F);
          font-family: inherit;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-details-btn:hover {
          background: var(--primary, #4A7C59);
          color: #FFFFFF;
          border-color: var(--primary, #4A7C59);
          box-shadow: 0 4px 12px var(--primary-glow);
        }

        .impact-empty-card {
          background: var(--bg-secondary, #FFFFFF);
          border: 1.5px solid var(--border-color, #EAE4DA);
          border-radius: 20px;
          padding: 3.5rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .empty-icon-wrap {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #EAF1EB;
          color: #4A7C59;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
        }

        .empty-title {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 1.4rem;
          font-weight: 700;
          margin: 0;
        }

        .empty-desc {
          font-size: 0.92rem;
          color: var(--text-secondary, #5F7163);
          max-width: 380px;
          margin: 0;
        }

        .empty-cta-btn {
          margin-top: 0.75rem;
          height: 42px;
          padding: 0 1.5rem;
          border-radius: 9999px;
          border: none;
          background: var(--primary, #4A7C59);
          color: #FFFFFF;
          font-family: inherit;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 14px var(--primary-glow);
          transition: all 0.2s ease;
        }

        .empty-cta-btn:hover {
          background: var(--primary-hover, #3B6647);
          transform: translateY(-1px);
        }

        @media (max-width: 900px) {
          .impact-page-wrapper {
            padding: 1.25rem 1rem;
          }
          .impact-stats-grid {
            grid-template-columns: 1fr;
          }
          .journey-card {
            flex-direction: column;
            align-items: flex-start;
          }
          .journey-actions {
            width: 100%;
          }
          .view-details-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default TripHistory;
