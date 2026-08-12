import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SavedPlaces.css';

/* ── Minimalist SVG icons matching the design system ── */
const Icon = ({ name, size = 18, color = 'currentColor' }) => {
  const icons = {
    tree: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22v-6" />
        <path d="M12 16a6 6 0 0 1-6-6c0-2 1-4 3-5 0-3 3-4 6-4s6 1 6 4c2 1 3 3 3 5a6 6 0 0 1-6 6z" />
      </svg>
    ),
    compass: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
    cycling: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18.5" cy="17.5" r="3.5" />
        <circle cx="5.5" cy="17.5" r="3.5" />
        <circle cx="15" cy="5" r="1" />
        <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
      </svg>
    ),
    walking: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m13 4 1 2-2 4 3 4-2 6" />
        <path d="m9 10-3 4 2 6" />
        <circle cx="12" cy="3" r="1.5" />
      </svg>
    ),
    transit: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="16" rx="2" ry="2" />
        <path d="M6 6h12v4H6ZM6 14h2v2H6ZM16 14h2v2h-2ZM8 19v2M16 19v2" />
      </svg>
    ),
    driving: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3C13 6.8 11.8 6 10.5 6H8.2C7.5 6 7 6.5 7 7.2v3.3C7 11.2 7.5 11.7 8.2 11.7h1.6c.7 0 1.2-.5 1.2-1.2V9M2 17h10c1.1 0 2-.9 2-2V9" />
        <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
      </svg>
    ),
    mapPin: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    search: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    bell: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    plus: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    trash: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    ),
    arrowRight: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    ),
    leaf: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 8.5C18 15 15 20 11 20Z" />
        <path d="M19 2c-2.26 4.33-5.27 7.14-8 10" />
      </svg>
    ),
    clock: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    )
  };
  return icons[name] || null;
};

const CATEGORY_META = {
  Home: { color: '#10b981', label: 'Home Base', icon: 'tree' },
  Work: { color: '#3b82f6', label: 'Workplace', icon: 'compass' },
  Studio: { color: '#8b5cf6', label: 'Studio & Office', icon: 'compass' },
  Park: { color: '#059669', label: 'Park & Nature', icon: 'tree' },
  Gym: { color: '#f59e0b', label: 'Fitness & Health', icon: 'cycling' },
  Custom: { color: '#64748b', label: 'Saved Place', icon: 'mapPin' },
};

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_API_KEY || process.env.REACT_APP_MAPBOX_TOKEN || '';

const SavedPlaces = ({ user }) => {
  const [places, setPlaces] = useState([]);
  const [userTrips, setUserTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlace, setNewPlace] = useState({ name: '', category: 'Home', address: '', mode: 'cycling' });
  const [toastMsg, setToastMsg] = useState('');
  const navigate = useNavigate();

  // Load places and trip history from backend with localStorage fallback
  const fetchPlaces = useCallback(async () => {
    try {
      const [placesRes, historyRes] = await Promise.allSettled([
        axios.get('/api/saved-places'),
        axios.get('/api/history')
      ]);
      if (placesRes.status === 'fulfilled' && Array.isArray(placesRes.value.data) && placesRes.value.data.length > 0) {
        setPlaces(placesRes.value.data);
        localStorage.setItem('gr_saved_places', JSON.stringify(placesRes.value.data));
      } else {
        const local = JSON.parse(localStorage.getItem('gr_saved_places') || '[]');
        setPlaces(local);
      }
      if (historyRes.status === 'fulfilled' && Array.isArray(historyRes.value.data)) {
        setUserTrips(historyRes.value.data);
      }
    } catch {
      const local = JSON.parse(localStorage.getItem('gr_saved_places') || '[]');
      setPlaces(local);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Launch route navigation to saved place
  const handleNavigateToPlace = (place) => {
    const dest = {
      coordinates: [
        place.coordinates?.lng ?? place.lng,
        place.coordinates?.lat ?? place.lat
      ],
      name: place.name || place.address || 'Saved Destination'
    };
    try {
      sessionStorage.setItem('gr_quick_destination', JSON.stringify(dest));
    } catch {}
    navigate('/');
  };

  // Delete saved place
  const handleDeletePlace = async (id, e) => {
    e.stopPropagation();
    try {
      if (id && !id.toString().startsWith('local_')) {
        await axios.delete(`/api/saved-places/${id}`);
      }
    } catch {}
    
    const updated = places.filter(p => (p._id || p.id) !== id);
    setPlaces(updated);
    localStorage.setItem('gr_saved_places', JSON.stringify(updated));
    showToast('Place removed from saved destinations');
  };

  // Create new place
  const handleCreatePlace = async (e) => {
    e.preventDefault();
    if (!newPlace.name.trim()) return;

    let coords = { lat: 28.6139, lng: 77.2090 };
    if (newPlace.address.trim()) {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(newPlace.address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
        const geoRes = await axios.get(url);
        if (geoRes.data.features?.[0]?.center) {
          const [lng, lat] = geoRes.data.features[0].center;
          coords = { lat, lng };
        }
      } catch {}
    }

    const payload = {
      name: newPlace.name.trim(),
      category: newPlace.category,
      address: newPlace.address.trim() || `${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°`,
      coordinates: coords,
      preferredMode: newPlace.mode || 'cycling'
    };

    try {
      const res = await axios.post('/api/saved-places', payload);
      if (res.data?.place) {
        setPlaces(prev => [res.data.place, ...prev]);
      } else {
        const localObj = { ...payload, id: 'local_' + Date.now(), savedAt: new Date().toISOString() };
        setPlaces(prev => [localObj, ...prev]);
      }
    } catch {
      const localObj = { ...payload, id: 'local_' + Date.now(), savedAt: new Date().toISOString() };
      const updated = [localObj, ...places];
      setPlaces(updated);
      localStorage.setItem('gr_saved_places', JSON.stringify(updated));
    }

    setShowAddModal(false);
    setNewPlace({ name: '', category: 'Home', address: '', mode: 'cycling' });
    showToast('Destination added to Saved Places!');
  };

  // Filter and search
  const filteredPlaces = useMemo(() => {
    return places.filter(p => {
      const matchesSearch =
        (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.address || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedFilter === 'All' || (p.category || 'Custom') === selectedFilter;
      return matchesSearch && matchesCategory;
    });
  }, [places, searchQuery, selectedFilter]);

  // Impact Calculations from actual places and trips data
  const stats = useMemo(() => {
    const totalPlaces = places.length;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Places added this month
    const placesThisMonth = places.filter(p => {
      const d = p.savedAt ? new Date(p.savedAt) : (p.createdAt ? new Date(p.createdAt) : null);
      return d && d >= startOfMonth;
    }).length;

    // Real CO2 saved from user journeys
    const totalCO2 = userTrips.reduce((sum, t) => sum + (parseFloat(t.co2Saved) || 0), 0);
    let thisMonthCO2 = 0;
    let lastMonthCO2 = 0;

    userTrips.forEach(t => {
      const d = t.date ? new Date(t.date) : (t.createdAt ? new Date(t.createdAt) : null);
      const co2 = parseFloat(t.co2Saved) || 0;
      if (d && !isNaN(d.getTime())) {
        if (d >= startOfMonth && d <= now) {
          thisMonthCO2 += co2;
        } else if (d >= startOfLastMonth && d <= endOfLastMonth) {
          lastMonthCO2 += co2;
        }
      }
    });

    let co2Badge = '0 kg this month';
    let co2BadgeClass = 'muted';

    if (lastMonthCO2 > 0) {
      const diff = Math.round(((thisMonthCO2 - lastMonthCO2) / lastMonthCO2) * 100);
      if (diff > 0) {
        co2Badge = `+${diff}% this month`;
        co2BadgeClass = 'green';
      } else if (diff < 0) {
        co2Badge = `${diff}% this month`;
        co2BadgeClass = 'muted';
      } else {
        co2Badge = '0% change this month';
        co2BadgeClass = 'muted';
      }
    } else if (thisMonthCO2 > 0) {
      co2Badge = `+${thisMonthCO2.toFixed(1)} kg this month`;
      co2BadgeClass = 'green';
    }

    // Determine primary mode across saved places
    const modeCounts = {};
    places.forEach(p => {
      const m = (p.preferredMode || p.mode || 'cycling').toLowerCase();
      modeCounts[m] = (modeCounts[m] || 0) + 1;
    });

    let primaryMode = 'None';
    let primaryPct = 0;

    if (totalPlaces > 0) {
      const topMode = Object.keys(modeCounts).sort((a, b) => modeCounts[b] - modeCounts[a])[0];
      if (topMode) {
        primaryMode = topMode.charAt(0).toUpperCase() + topMode.slice(1);
        primaryPct = Math.round((modeCounts[topMode] / totalPlaces) * 100);
      }
    }

    return {
      totalPlaces,
      placesThisMonth,
      totalCO2: totalCO2.toFixed(1),
      co2Badge,
      co2BadgeClass,
      primaryMode,
      primaryPct,
    };
  }, [places, userTrips]);

  return (
    <div className="saved-places-page">
      {/* ── Top Header Navigation Bar ── */}
      <header className="sp-top-bar">
        <div className="sp-breadcrumb">Saved Places</div>
        <div className="sp-top-actions">
          <div className="sp-search-wrap">
            <span className="sp-search-icon"><Icon name="search" size={16} /></span>
            <input
              type="text"
              placeholder="Search saved places..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="sp-search-input"
            />
          </div>
          <button className="sp-icon-btn" title="Notifications">
            <Icon name="bell" size={18} />
          </button>
        </div>
      </header>

      {/* ── Main Scrollable Container ── */}
      <div className="sp-content-body">
        {/* Editorial Page Title */}
        <section className="sp-hero-header">
          <h1 className="sp-main-title">Your Saved Hubs</h1>
          <p className="sp-subtitle">
            Review your frequent commute destinations, favorite spots, and the positive footprint you create.
          </p>
        </section>

        {/* ── 3 Impact Metric Cards ── */}
        <section className="sp-metrics-row">
          {/* Metric 1: Total CO2 Saved */}
          <div className="sp-metric-card">
            <div className="sp-metric-top">
              <div className="sp-metric-icon-wrap emerald">
                <Icon name="tree" size={20} color="#10b981" />
              </div>
              <span className={`sp-badge-pill ${stats.co2BadgeClass}`}>{stats.co2Badge}</span>
            </div>
            <div className="sp-metric-label">TOTAL CO₂ SAVED</div>
            <div className="sp-metric-value emerald">
              {stats.totalCO2} <span className="sp-metric-unit">kg</span>
            </div>
          </div>

          {/* Metric 2: Total Saved Places */}
          <div className="sp-metric-card">
            <div className="sp-metric-top">
              <div className="sp-metric-icon-wrap amber">
                <Icon name="compass" size={20} color="#d97706" />
              </div>
              <span className="sp-badge-pill green">
                {stats.placesThisMonth > 0 ? `+${stats.placesThisMonth} this month` : `${stats.totalPlaces} active`}
              </span>
            </div>
            <div className="sp-metric-label">SAVED DESTINATIONS</div>
            <div className="sp-metric-value neutral">{stats.totalPlaces}</div>
          </div>

          {/* Metric 3: Primary Preferred Mode */}
          <div className="sp-metric-card">
            <div className="sp-metric-top">
              <div className="sp-metric-icon-wrap purple">
                <Icon name={stats.primaryMode.toLowerCase() === 'walking' ? 'walking' : stats.primaryMode.toLowerCase() === 'transit' ? 'transit' : 'cycling'} size={20} color="#8b5cf6" />
              </div>
              <span className="sp-badge-pill muted">
                {stats.totalPlaces > 0 ? `${stats.primaryPct}% of hubs` : '0 hubs'}
              </span>
            </div>
            <div className="sp-metric-label">PRIMARY COMMUTE MODE</div>
            <div className="sp-metric-value serif">{stats.primaryMode}</div>
          </div>
        </section>

        {/* ── Saved Places Timeline Section ── */}
        <section className="sp-list-section">
          <div className="sp-list-header">
            <h2 className="sp-section-title">Saved Destinations</h2>
            <div className="sp-list-header-actions">
              {/* Category Filter Chips */}
              <div className="sp-filter-chips">
                {['All', 'Home', 'Work', 'Studio', 'Park'].map(cat => (
                  <button
                    key={cat}
                    className={`sp-filter-chip ${selectedFilter === cat ? 'active' : ''}`}
                    onClick={() => setSelectedFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button className="sp-add-btn" onClick={() => setShowAddModal(true)}>
                <Icon name="plus" size={16} />
                <span>Add Place</span>
              </button>
            </div>
          </div>

          {/* Timeline & Card List */}
          {loading ? (
            <div className="sp-loading-wrap">
              <div className="sp-spinner" />
              <span>Loading saved destinations...</span>
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="sp-empty-state">
              <div className="sp-empty-icon">
                <Icon name="mapPin" size={32} color="#10b981" />
              </div>
              <h3>No saved places found</h3>
              <p>Bookmark your favorite hubs or home to launch instant 1-tap eco navigation.</p>
              <button className="sp-empty-btn" onClick={() => setShowAddModal(true)}>
                + Save Your First Place
              </button>
            </div>
          ) : (
            <div className="sp-timeline-container">
              {filteredPlaces.map((place, idx) => {
                const lat = place.coordinates?.lat ?? place.lat ?? 28.6139;
                const lng = place.coordinates?.lng ?? place.lng ?? 77.2090;
                const cat = place.category || 'Custom';
                const catMeta = CATEGORY_META[cat] || CATEGORY_META.Custom;
                const mode = place.preferredMode || 'cycling';
                const placeId = place._id || place.id || `p_${idx}`;

                // Static Mapbox thumbnail URL
                const mapThumbUrl = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/pin-s+10b981(${lng},${lat})/${lng},${lat},13,0/200x200@2x?access_token=${MAPBOX_TOKEN}`;

                return (
                  <div key={placeId} className="sp-timeline-item">
                    {/* Glowing Timeline Marker */}
                    <div className="sp-timeline-rail">
                      <div className="sp-timeline-dot" />
                      {idx < filteredPlaces.length - 1 && <div className="sp-timeline-line" />}
                    </div>

                    {/* Rich Destination Card */}
                    <div
                      className="sp-destination-card"
                      onClick={() => handleNavigateToPlace(place)}
                      title="Click to navigate"
                    >
                      {/* Left: Map Preview Snippet */}
                      <div className="sp-card-thumbnail-wrap">
                        <img
                          src={mapThumbUrl}
                          alt={place.name}
                          className="sp-card-map-img"
                          loading="lazy"
                          onError={e => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div className="sp-thumb-mode-badge" style={{ background: catMeta.color }}>
                          <Icon name={mode === 'walking' ? 'walking' : mode === 'transit' ? 'transit' : 'cycling'} size={13} color="#fff" />
                        </div>
                      </div>

                      {/* Middle: Place Details */}
                      <div className="sp-card-content">
                        <div className="sp-card-top-row">
                          <span className="sp-category-pill" style={{ color: catMeta.color, background: `${catMeta.color}15`, borderColor: `${catMeta.color}30` }}>
                            {catMeta.label}
                          </span>
                          <span className="sp-timestamp-tag">
                            {place.savedAt ? new Date(place.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Saved'}
                          </span>
                        </div>

                        <h3 className="sp-card-title">{place.name}</h3>

                        <div className="sp-card-address-line">
                          <span className="sp-addr-pin"><Icon name="mapPin" size={14} color="#5F7163" /></span>
                          <span className="sp-addr-text">{place.address || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`}</span>
                        </div>

                        <div className="sp-card-meta-bar">
                          <span className="sp-meta-pill">
                            <Icon name={mode === 'walking' ? 'walking' : mode === 'transit' ? 'transit' : mode === 'driving' ? 'driving' : 'cycling'} size={13} />
                            <span>{mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : 'Cycling'} Mode</span>
                          </span>
                          <span className="sp-meta-pill eco">
                            <Icon name="tree" size={13} color="#10b981" />
                            <span>{catMeta.label}</span>
                          </span>
                        </div>
                      </div>

                      {/* Right: Navigate CTA Pill */}
                      <div className="sp-card-actions">
                        <button
                          className="sp-navigate-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateToPlace(place);
                          }}
                        >
                          <span>Navigate</span>
                          <Icon name="arrowRight" size={14} />
                        </button>
                        <button
                          className="sp-delete-btn"
                          onClick={(e) => handleDeletePlace(placeId, e)}
                          title="Remove saved destination"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Add Place Modal ── */}
      {showAddModal && (
        <div className="sp-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="sp-modal-window" onClick={e => e.stopPropagation()}>
            <div className="sp-modal-header">
              <h3>Save New Destination</h3>
              <button className="sp-modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreatePlace} className="sp-modal-form">
              <div className="sp-form-group">
                <label>Place Name</label>
                <input
                  type="text"
                  placeholder="e.g. Studio 44, Central Park Hub, Workplace"
                  value={newPlace.name}
                  onChange={e => setNewPlace(p => ({ ...p, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div className="sp-form-row">
                <div className="sp-form-group">
                  <label>Category</label>
                  <select
                    value={newPlace.category}
                    onChange={e => setNewPlace(p => ({ ...p, category: e.target.value }))}
                  >
                    <option value="Home">Home Base</option>
                    <option value="Work">Workplace</option>
                    <option value="Studio">Studio & Office</option>
                    <option value="Park">Park & Nature</option>
                    <option value="Gym">Gym & Fitness</option>
                    <option value="Custom">Custom Destination</option>
                  </select>
                </div>
                <div className="sp-form-group">
                  <label>Preferred Mode</label>
                  <select
                    value={newPlace.mode}
                    onChange={e => setNewPlace(p => ({ ...p, mode: e.target.value }))}
                  >
                    <option value="cycling">Cycling (Eco)</option>
                    <option value="walking">Walking (Zero Footprint)</option>
                    <option value="transit">Public Transit</option>
                    <option value="driving">Driving</option>
                  </select>
                </div>
              </div>

              <div className="sp-form-group">
                <label>Address or Landmark Search</label>
                <input
                  type="text"
                  placeholder="e.g. Times Square, New York or 123 Main St"
                  value={newPlace.address}
                  onChange={e => setNewPlace(p => ({ ...p, address: e.target.value }))}
                />
              </div>

              <div className="sp-modal-actions">
                <button type="button" className="sp-modal-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="sp-modal-submit" disabled={!newPlace.name.trim()}>
                  Save Destination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && <div className="sp-toast">{toastMsg}</div>}
    </div>
  );
};

export default SavedPlaces;
