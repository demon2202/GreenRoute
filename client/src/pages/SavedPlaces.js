import React, { useState, useEffect, useCallback } from 'react';

/* ── SVG icons ── */
const Ico = ({ d, w = 18, vb = '0 0 24 24', fill = false, color = 'currentColor' }) => (
  <svg width={w} height={w} viewBox={vb} fill={fill ? color : 'none'}
    stroke={fill ? 'none' : color} strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    {d}
  </svg>
);

const Pin = ({ w = 18, color = 'currentColor' }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const NavArrow = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const TrashIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);

const SearchIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const MapIcon = ({ w = 48 }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" y1="3" x2="9" y2="18"/>
    <line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
);

/* ── Helpers ── */
const STORAGE_KEY = 'gr_saved_places';

function loadPlaces() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    return JSON.parse(data);
  } catch { return []; }
}

function savePlaces(places) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso), now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Saved today';
  if (diff === 1) return 'Saved yesterday';
  if (diff < 7)  return `Saved ${diff} days ago`;
  return `Saved ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function fmtCoords(lng, lat) {
  if (lng == null || lat == null) return '';
  return `${parseFloat(lat).toFixed(4)}°, ${parseFloat(lng).toFixed(4)}°`;
}

/* ── Place Card ── */
const PlaceCard = ({ place, onRemove, onNavigate, removing }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: 'var(--bg-secondary, #fff)',
        borderRadius: 20,
        border: `1.5px solid ${hover ? 'var(--primary, #10b981)' : 'var(--border-color, #f1f5f9)'}`,
        padding: '1.25rem',
        boxShadow: hover
          ? '0 8px 32px rgba(16,185,129,0.12), 0 2px 8px rgba(0,0,0,0.06)'
          : '0 2px 12px rgba(0,0,0,0.04)',
        transition: 'all 0.2s ease',
        transform: hover ? 'translateY(-2px)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg,#10b981,#34d399)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
        }}>
          <Pin w={18} color="white" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)',
            lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {place.name || place.place_name || 'Unnamed place'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 500, marginTop: 3 }}>
            {fmtCoords(place.lng || place.center?.[0], place.lat || place.center?.[1])}
          </div>
        </div>
        {/* Remove button */}
        <button
          onClick={() => onRemove(place.id)}
          disabled={removing === place.id}
          title="Remove"
          style={{
            width: 28, height: 28, borderRadius: 8, border: 'none',
            background: hover ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
            color: '#ef4444', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          <TrashIcon />
        </button>
      </div>

      {/* Date */}
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 500 }}>
        {fmtDate(place.savedAt)}
      </div>

      {/* Action */}
      <button
        onClick={() => onNavigate(place)}
        style={{
          width: '100%', padding: '0.6rem 1rem',
          borderRadius: 12, border: 'none',
          background: hover
            ? 'linear-gradient(135deg,#10b981,#059669)'
            : 'var(--bg-tag, #f0fdf4)',
          color: hover ? 'white' : 'var(--primary, #10b981)',
          fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.4rem', transition: 'all 0.2s ease',
          fontFamily: 'inherit',
          boxShadow: hover ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
        }}
      >
        Navigate here
        <NavArrow />
      </button>
    </div>
  );
};

/* ── Empty State ── */
const EmptyState = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center', padding: '5rem 2rem',
    background: 'var(--bg-secondary, #fff)',
    borderRadius: 24, border: '1px solid var(--border-color, #f1f5f9)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  }}>
    <div style={{
      width: 80, height: 80, borderRadius: 22,
      background: 'rgba(16, 185, 129, 0.12)',
      border: '1.5px solid var(--border-color, #bbf7d0)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: '1.5rem', color: '#10b981',
    }}>
      <MapIcon w={40} />
    </div>
    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
      No saved places yet
    </h3>
    <p style={{ margin: '0 0 1.75rem', color: 'var(--text-secondary, #64748b)', maxWidth: 320, lineHeight: 1.6, fontSize: '0.9rem' }}>
      While planning routes, tap the bookmark icon on any location to save it here for quick access.
    </p>
    <a href="/" style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.75rem 1.5rem', borderRadius: 14,
      background: 'linear-gradient(135deg,#10b981,#059669)',
      color: 'white', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
      boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
    }}>
      Plan a Route
      <NavArrow />
    </a>
  </div>
);

/* ── Main component ── */
const SavedPlaces = () => {
  const [places,  setPlaces]  = useState([]);
  const [query,   setQuery]   = useState('');
  const [removing, setRemoving] = useState(null);
  const [toast,   setToast]   = useState(null);

  useEffect(() => { setPlaces(loadPlaces()); }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRemove = useCallback((id) => {
    setRemoving(id);
    setTimeout(() => {
      const updated = places.filter(p => p.id !== id);
      setPlaces(updated);
      savePlaces(updated);
      setRemoving(null);
      showToast('Place removed');
    }, 280);
  }, [places]);

  const handleNavigate = useCallback((place) => {
    const dest = place.name || place.place_name || '';
    const params = new URLSearchParams({ to: dest });
    window.location.href = `/?${params}`;
  }, []);

  const filtered = query.trim()
    ? places.filter(p => (p.name || p.place_name || '').toLowerCase().includes(query.toLowerCase()))
    : places;

  return (
    <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto', fontFamily: 'inherit', paddingBottom: '3rem', paddingLeft: '2rem', paddingRight: '2rem' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? '#fee2e2' : '#ecfdf5',
          color: toast.type === 'error' ? '#dc2626' : '#065f46',
          border: `1.5px solid ${toast.type === 'error' ? '#fca5a5' : '#6ee7b7'}`,
          borderRadius: 14, padding: '0.75rem 1.25rem',
          fontWeight: 700, fontSize: '0.88rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          animation: 'spToastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap',
      }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary, #0f172a)' }}>
            Saved Places
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary, #64748b)', fontSize: '0.92rem' }}>
            {places.length > 0 ? `${places.length} saved location${places.length !== 1 ? 's' : ''}` : 'Your favourite spots at a glance'}
          </p>
        </div>
      </div>

      {/* Search */}
      {places.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'var(--bg-secondary, #fff)', border: '1.5px solid var(--border-color, #e2e8f0)',
          borderRadius: 14, padding: '0.6rem 1rem', marginBottom: '1.25rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <span style={{ color: 'var(--text-muted, #94a3b8)', flexShrink: 0 }}><SearchIcon /></span>
          <input
            type="text"
            placeholder="Search saved places…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: '0.9rem', background: 'transparent',
              color: 'var(--text-primary, #0f172a)',
              fontFamily: 'inherit',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted, #94a3b8)', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Count bar */}
      {places.length > 0 && query && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', marginBottom: '0.75rem', fontWeight: 600 }}>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of {places.length} places
        </div>
      )}

      {/* Grid or empty */}
      {places.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '3rem 2rem',
          background: 'var(--bg-secondary, #fff)', borderRadius: 20,
          border: '1px solid var(--border-color, #f1f5f9)', color: 'var(--text-secondary, #64748b)',
        }}>
          <p style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '1rem' }}>No places match "{query}"</p>
          <button onClick={() => setQuery('')} style={{ border: 'none', background: 'none', color: '#10b981', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'inherit' }}>
            Clear search
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {filtered.map(place => (
            <PlaceCard
              key={place.id}
              place={place}
              onRemove={handleRemove}
              onNavigate={handleNavigate}
              removing={removing}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes spToastIn {
          from { opacity:0; transform:translateY(-12px) scale(0.95); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default SavedPlaces;
