import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import './Preferences.css';

// ─── SVG Icon Components ───────────────────────────────────────────────────────

const SvgIcon = ({ name, size = 24, color = 'currentColor' }) => {
  const icons = {
    // Transport Modes
    walking: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2" />
        <path d="m14 12-1-2-3-1-3 3" />
        <path d="m4 18 4-2v-4" />
        <path d="m9 13v-3h3l2.5 3" />
        <path d="M12 16v5" />
        <path d="M15 21v-4l-2-2" />
      </svg>
    ),
    cycling: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5.5" cy="17.5" r="2.5" />
        <circle cx="18.5" cy="17.5" r="2.5" />
        <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-3 11.5 1-4.5 2-2.5h3.5" />
        <path d="M12 17.5 8 13.5l3-3.5 1 2" />
      </svg>
    ),
    transit: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="16" rx="2" />
        <path d="M8 7h8M8 11h8" />
        <path d="M6 19l-2 2M18 19l2 2" />
        <path d="M10 15h4" />
      </svg>
    ),
    mixed: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M9 18h5a3 3 0 0 0 3-3V9" />
        <path d="m14 15 3 3 3-3" />
        <path d="M6 15v-5a3 3 0 0 1 3-3h5" />
      </svg>
    ),
    // Priorities
    eco: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 8.5C18 15 15 20 11 20Z" />
        <path d="M19 2c-2.26 4.33-5.27 7.14-8 10" />
      </svg>
    ),
    balanced: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="3" x2="12" y2="21" />
        <line x1="2" y1="7" x2="22" y2="7" />
        <path d="M5 7l-2 6h4Z" />
        <path d="m19 7-2 6h4Z" />
        <path d="M12 21a6 6 0 0 0 6-6H6a6 6 0 0 0 6 6Z" />
      </svg>
    ),
    speed: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    // Weather
    weatherLow: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    ),
    weatherModerate: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M19.07 4.93l-1.41 1.41" />
        <path d="M15.9 16A5 5 0 0 0 18 11.5a5.5 5.5 0 0 0-11-1 4.5 4.5 0 0 0-3.5 4.5v.5A4.5 4.5 0 0 0 8 20h7.5a4.5 4.5 0 0 0 .4-4Z" />
      </svg>
    ),
    weatherHigh: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 16.58A5 5 0 0 0 18 7.5a8.5 8.5 0 0 0-16 2.5a5 5 0 0 0 4 9.6h11a3.5 3.5 0 0 0 3-3Z" />
        <path d="M8 14v4M12 16v4M16 14v4" />
      </svg>
    ),
    // Address Icons
    home: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    work: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    // Categories
    transport: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    priority: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    distance: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    ),
    goal: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    location: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    actions: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    // System Actions
    reset: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <polyline points="3 3 3 8 8 8" />
      </svg>
    ),
    export: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    import: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    close: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    )
  };

  return icons[name] || null;
};

// ─── Forest Visualizer Components ──────────────────────────────────────────────

const SingleTree = ({ height = 50, delay = 0 }) => (
  <svg
    width={height * 0.6}
    height={height}
    viewBox="0 0 40 65"
    className="pref-single-tree"
    style={{ animationDelay: `${delay}s`, flexShrink: 0 }}
  >
    <rect x="17" y="45" width="6" height="20" rx="2" fill="#78350f" />
    <path d="M20 5 L5 25 L35 25 Z" fill="#047857" />
    <path d="M20 15 L8 35 L32 35 Z" fill="#059669" />
    <path d="M20 25 L10 48 L30 48 Z" fill="#10b981" />
  </svg>
);

const SeedlingTree = ({ height = 35 }) => (
  <svg
    width={height * 0.8}
    height={height}
    viewBox="0 0 24 24"
    className="pref-single-tree"
    style={{ animationDelay: '0s', flexShrink: 0 }}
  >
    <path d="M4 22h16" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 22V12" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 14c-1.5-1.5-3.5-.8-4 .8a3.5 3.5 0 0 0 4-.8Z" fill="#10b981" />
    <path d="M12 12c1.5-1.5 3.5-.8 4 .8a3.5 3.5 0 0 1-4-.8Z" fill="#059669" />
  </svg>
);

// ─── Reusable Input & Control Components ───────────────────────────────────────

const RangeSlider = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  color = 'var(--primary)',
  onChange,
  formatLabel,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="pref-slider-group">
      <div className="pref-slider-label-row">
        <span className="pref-slider-label">{label}</span>
        <span className="pref-slider-value" style={{ color }}>
          {value} {unit}
        </span>
      </div>

      <div className="pref-slider-container">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="pref-slider-input"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, var(--border-color) ${percentage}%, var(--border-color) 100%)`,
          }}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={label}
        />
      </div>

      <div className="pref-slider-info-row">
        <span>{min} {unit}</span>
        {formatLabel && (
          <span className="pref-slider-badge-info">
            {formatLabel(value)}
          </span>
        )}
        <span>{max} {unit}</span>
      </div>
    </div>
  );
};

const RadioGroup = ({ options, value, onChange, name }) => (
  <div className="pref-radio-stack">
    {options.map((option) => {
      const isSelected = value === option.value;
      return (
        <label
          key={option.value}
          className={`pref-radio-card ${isSelected ? 'active' : ''}`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={isSelected}
            onChange={(e) => onChange(e.target.value)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
            aria-label={option.label}
          />
          <div className="pref-radio-icon">
            <SvgIcon name={option.iconName} size={20} color={isSelected ? 'var(--text-inverse)' : 'currentColor'} />
          </div>
          <div className="pref-radio-content">
            <div className="pref-radio-title">{option.label}</div>
            <div className="pref-radio-desc">{option.description}</div>
          </div>
          {isSelected && (
            <div style={{
              background: 'var(--primary)',
              color: 'white',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: '800',
              flexShrink: 0
            }}>
              ✓
            </div>
          )}
        </label>
      );
    })}
  </div>
);

const TransportModeCard = ({ mode, isSelected, onToggle, isOnlySelected }) => (
  <button
    onClick={onToggle}
    aria-pressed={isSelected}
    title={isOnlySelected ? 'At least one transport mode must be selected' : undefined}
    className="pref-mode-button"
    disabled={isOnlySelected && isSelected}
    style={{
      borderColor: isSelected ? mode.color : 'var(--border-color)',
      background: isSelected ? `${mode.color}08` : 'var(--bg-secondary)',
    }}
  >
    <div className="pref-mode-icon-box" style={{
      background: isSelected ? `${mode.color}18` : 'var(--hover-bg)',
      color: mode.color
    }}>
      <SvgIcon name={mode.iconName} size={22} color={mode.color} />
    </div>
    <div className="pref-mode-name">{mode.label}</div>
    <div className="pref-mode-desc">{mode.description}</div>

    {isSelected && (
      <div className="pref-select-badge" style={{ background: mode.color }}>
        ✓
      </div>
    )}
  </button>
);

const SectionCard = ({ icon, title, subtitle, spanFull = false, children }) => (
  <div className={`pref-card ${spanFull ? 'pref-span-full' : ''}`}>
    <div className="pref-card-header">
      <div className="pref-icon-wrap">
        <SvgIcon name={icon} size={22} />
      </div>
      <div className="pref-header-text">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
    <div className="pref-card-body">
      {children}
    </div>
  </div>
);

const Toast = ({ message, type, onClose }) => {
  if (!message) return null;

  const config = {
    success: { bg: 'var(--green-50)', color: 'var(--primary)', border: 'var(--green-200)' },
    error: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' }
  };

  const style = config[type] || config.success;

  return (
    <div
      role="alert"
      style={{
        backgroundColor: style.bg,
        color: style.color,
        border: `1.5px solid ${style.border}`,
        padding: '0.85rem 1.25rem',
        borderRadius: 'var(--r-lg)',
        marginBottom: '1.5rem',
        fontWeight: '600',
        fontSize: '0.9rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'between',
        width: '100%',
        animation: 'stSlideUp var(--dur-normal) var(--ease-smooth)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
        {type === 'success' ? '🌱' : '⚠️'} {message}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.7
          }}
        >
          <SvgIcon name="close" size={16} />
        </button>
      )}
    </div>
  );
};



// ─── Configuration ─────────────────────────────────────────────────────────────

const TRANSPORT_MODES = [
  { id: 'Walking',        label: 'Walking',        description: 'Zero emissions, keep active', color: '#10b981', iconName: 'walking' },
  { id: 'Cycling',        label: 'Cycling',        description: 'Speedy & zero footprint',     color: '#3b82f6', iconName: 'cycling' },
  { id: 'Public Transit', label: 'Public Transit', description: 'Shared & city-efficient',     color: '#8b5cf6', iconName: 'transit' },
  { id: 'Mixed Routes',   label: 'Mixed Routes',   description: 'Combine multiple modes',      color: '#f59e0b', iconName: 'mixed' }
];

const PRIORITY_OPTIONS = [
  { value: 'Eco First',   label: 'Eco First',   description: 'Prioritize lowest emissions', iconName: 'eco' },
  { value: 'Balanced',    label: 'Balanced',    description: 'Optimal balance of time & CO₂', iconName: 'balanced' },
  { value: 'Speed First', label: 'Speed First', description: 'Fastest transit with green check', iconName: 'speed' }
];

const WEATHER_OPTIONS = [
  { value: 'Low',      label: 'Ignore weather',   description: 'I will travel in rain or shine', iconName: 'weatherLow' },
  { value: 'Moderate', label: 'Moderate sensitivity', description: 'Prefer shelter in bad weather', iconName: 'weatherModerate' },
  { value: 'High',     label: 'High sensitivity',     description: 'Strictly dry/safe routes only', iconName: 'weatherHigh' }
];

const DEFAULT_PREFERENCES = {
  transportModes: ['Walking', 'Cycling', 'Public Transit', 'Mixed Routes'],
  sustainabilityPriority: 'Eco First',
  weatherSensitivity: 'Moderate',
  maxWalkingDistance: 3,
  maxCyclingDistance: 15,
  monthlyGoal: 60,
  homeAddress: '',
  workAddress: ''
};

// ─── Main Component ────────────────────────────────────────────────────────────

const Preferences = ({ user }) => {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [originalPreferences, setOriginalPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const toastTimerRef = useRef(null);

  const hasChanges = useMemo(() =>
    originalPreferences !== null &&
    JSON.stringify(preferences) !== JSON.stringify(originalPreferences),
    [preferences, originalPreferences]
  );

  // ── Toast System ─────────────────────────────────────────────────────────────

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast({ message: '', type: 'success' }), 4500);
  }, []);

  const handleCloseToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message: '', type: 'success' });
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ── Fetch Preferences ────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const { data } = await axios.get('/api/preferences');
        const merged = { ...DEFAULT_PREFERENCES, ...data };
        setPreferences(merged);
        setOriginalPreferences(merged);
      } catch (error) {
        console.error('Failed to fetch preferences:', error);
        showToast('Unable to load preferences. Using defaults.', 'error');
        setOriginalPreferences(DEFAULT_PREFERENCES);
      } finally {
        setLoading(false);
      }
    };
    fetchPreferences();
  }, [showToast]);

  // ── State Updates ────────────────────────────────────────────────────────────

  const updatePreference = useCallback((field, value) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleTransportToggle = useCallback((modeId) => {
    setPreferences(prev => {
      const isCurrentlySelected = prev.transportModes.includes(modeId);
      if (isCurrentlySelected && prev.transportModes.length === 1) return prev;
      return {
        ...prev,
        transportModes: isCurrentlySelected
          ? prev.transportModes.filter(m => m !== modeId)
          : [...prev.transportModes, modeId]
      };
    });
  }, []);

  // ── System Event Handlers ────────────────────────────────────────────────────

  const handleSave = async () => {
    if (saving || !hasChanges) return;

    setSaving(true);
    try {
      await axios.post('/api/preferences', preferences);
      setOriginalPreferences(preferences);
      showToast('Preferences saved successfully!', 'success');
    } catch (error) {
      console.error('Save failed:', error);
      showToast('Failed to save preferences. Please check connection.', 'error');
    } finally {
      setSaving(false);
    }
  };



  const handleCancel = () => {
    setPreferences(originalPreferences);
    showToast('Changes discarded.', 'success');
  };

  // ── Render Helpers ───────────────────────────────────────────────────────────

  const treeCount = Math.floor(preferences.monthlyGoal / 20);

  // ── Loading Spinner ──

  if (loading) {
    return (
      <div style={{
        padding: '8rem 2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem'
      }}>
        <div className="spinner" style={{ width: '48px', height: '48px' }} />
        <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Loading your preferences...
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '130px', paddingTop: '1rem' }}>


      {/* Header Panel */}
      <div className="pref-header">
        <div className="pref-title-group">
          <h2>Your Preferences</h2>
          <p>Customize travel options, route priority rules, goals, and locations</p>
        </div>

        {/* Quick summary status pills */}
        <div className="pref-quick-badges">
          <div className="pref-badge-pill">
            <span>🌱</span> Priority: {preferences.sustainabilityPriority}
          </div>
          <div className="pref-badge-pill">
            <span>🚗</span> Modes: {preferences.transportModes.length} Active
          </div>
          <div className="pref-badge-pill">
            <span>🏆</span> Goal: {preferences.monthlyGoal} kg CO₂
          </div>
        </div>
      </div>

      {/* Main Grid Dashboard */}
      <div className="pref-dashboard-grid">
        
        {/* Toast Notification Container */}
        {toast.message && (
          <div style={{ gridColumn: 'span 2' }}>
            <Toast message={toast.message} type={toast.type} onClose={handleCloseToast} />
          </div>
        )}

        {/* Transport Modes Card */}
        <SectionCard
          icon="transport"
          title="Transport Options"
          subtitle="Select your preferred ways to commute. GreenRoute plans paths based on these choices."
        >
          <div className="pref-modes-grid">
            {TRANSPORT_MODES.map(mode => {
              const isSelected = preferences.transportModes.includes(mode.id);
              const isOnlySelected = isSelected && preferences.transportModes.length === 1;
              return (
                <TransportModeCard
                  key={mode.id}
                  mode={mode}
                  isSelected={isSelected}
                  isOnlySelected={isOnlySelected}
                  onToggle={() => handleTransportToggle(mode.id)}
                />
              );
            })}
          </div>
        </SectionCard>

        {/* Route Priorities Card */}
        <SectionCard
          icon="priority"
          title="Route Priorities"
          subtitle="Configure default planning factors to optimize travel pathways."
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div>
              <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Sustainability Focus
              </h4>
              <RadioGroup
                name="priority"
                options={PRIORITY_OPTIONS}
                value={preferences.sustainabilityPriority}
                onChange={(val) => updatePreference('sustainabilityPriority', val)}
              />
            </div>

            <div>
              <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Weather Influence
              </h4>
              <RadioGroup
                name="weather"
                options={WEATHER_OPTIONS}
                value={preferences.weatherSensitivity}
                onChange={(val) => updatePreference('weatherSensitivity', val)}
              />
            </div>
          </div>
        </SectionCard>

        {/* Distance Comfort Limits Card */}
        <SectionCard
          icon="distance"
          title="Comfort Limits"
          subtitle="Determine your comfort thresholds. Routes exceeding these lengths will prefer alternatives."
        >
          <div className="pref-sliders-grid">
            <RangeSlider
              label="Max Walking Distance"
              value={preferences.maxWalkingDistance}
              min={1}
              max={20}
              unit="km"
              color="var(--primary)"
              onChange={(val) => updatePreference('maxWalkingDistance', val)}
              formatLabel={(val) => `~${Math.round(val * 12)} min walking duration`}
            />

            <RangeSlider
              label="Max Cycling Distance"
              value={preferences.maxCyclingDistance}
              min={1}
              max={50}
              unit="km"
              color="#3b82f6"
              onChange={(val) => updatePreference('maxCyclingDistance', val)}
              formatLabel={(val) => `~${Math.round(val * 3)} min cycling duration`}
            />
          </div>
        </SectionCard>

        {/* Saved Locations Addresses Card */}
        <SectionCard
          icon="location"
          title="Saved Addresses"
          subtitle="Store home and work destinations to enable quick single-click route planning."
        >
          <div className="pref-address-grid">
            <div className="form-group">
              <label style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Home Location
              </label>
              <div className="pref-input-wrapper">
                <span className="pref-input-icon">
                  <SvgIcon name="home" size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Enter home address..."
                  value={preferences.homeAddress}
                  onChange={(e) => updatePreference('homeAddress', e.target.value)}
                />
                {preferences.homeAddress && (
                  <button className="pref-clear-btn" onClick={() => updatePreference('homeAddress', '')} title="Clear address">
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Work Location
              </label>
              <div className="pref-input-wrapper">
                <span className="pref-input-icon">
                  <SvgIcon name="work" size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Enter office address..."
                  value={preferences.workAddress}
                  onChange={(e) => updatePreference('workAddress', e.target.value)}
                />
                {preferences.workAddress && (
                  <button className="pref-clear-btn" onClick={() => updatePreference('workAddress', '')} title="Clear address">
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Sustainability Goals Card (Full Width) */}
        <SectionCard
          icon="goal"
          title="Eco Target & Impact"
          subtitle="Define monthly CO₂ reduction goals and track your collective environmental impact in real-time."
          spanFull
        >
          <div className="pref-goal-card-content">
            {/* Slider Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <RangeSlider
                label="Monthly CO₂ Reduction Target"
                value={preferences.monthlyGoal}
                min={10}
                max={200}
                step={10}
                unit="kg"
                color="var(--primary)"
                onChange={(val) => updatePreference('monthlyGoal', val)}
              />
              
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Setting a target of <strong style={{ color: 'var(--primary)' }}>{preferences.monthlyGoal} kg CO₂</strong> helps combat global emissions. GreenRoute evaluates every route to maximize your savings.
              </div>
            </div>

            {/* Tree forest visualization panel */}
            <div className="pref-tree-forest-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8 }}>
                  Forest Equivalency Visualizer
                </span>
                <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.12)', padding: '0.2rem 0.6rem', borderRadius: 'var(--r-full)', fontWeight: 600 }}>
                  {treeCount} tree{treeCount !== 1 ? 's' : ''} / month
                </span>
              </div>

              {/* Dynamic Tree Row */}
              <div className="pref-tree-row">
                {treeCount > 0 ? (
                  Array.from({ length: treeCount }).map((_, idx) => (
                    <SingleTree key={idx} height={idx % 2 === 0 ? 55 : 45} delay={idx * 0.08} />
                  ))
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem' }}>
                    <SeedlingTree height={30} />
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginBottom: '2px' }}>
                      Seedling state (Increase target to grow trees!)
                    </span>
                  </div>
                )}
              </div>

              <div className="pref-tree-stats">
                Target matches planting <span>{treeCount || 'a seedling'}</span> tree{treeCount !== 1 ? 's' : ''} monthly
              </div>
            </div>
          </div>
        </SectionCard>



      </div>

      {/* Floating Save changes notification bar */}
      {hasChanges && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '2px solid var(--primary)',
          borderRadius: 'var(--r-full)',
          padding: '0.65rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          boxShadow: 'var(--shadow-lg), 0 8px 32px rgba(16, 185, 129, 0.18)',
          zIndex: 1000,
          animation: 'pref-savebar-in var(--dur-normal) var(--ease-spring) forwards',
          maxWidth: 'calc(100vw - 3rem)',
          width: 'max-content'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.88rem',
            fontWeight: '700',
            color: 'var(--text-primary)'
          }}>
            <div style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              background: 'var(--primary)',
              boxShadow: '0 0 8px var(--primary)',
              animation: 'pref-pulse 2s infinite'
            }} />
            Unsaved Changes
          </div>

          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button
              onClick={handleCancel}
              className="btn btn-secondary"
              disabled={saving}
              style={{
                padding: '0.5rem 1.15rem',
                fontSize: '0.85rem',
                borderRadius: 'var(--r-full)',
                height: 'auto'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary"
              disabled={saving}
              style={{
                padding: '0.5rem 1.4rem',
                fontSize: '0.85rem',
                borderRadius: 'var(--r-full)',
                background: 'linear-gradient(135deg, var(--green-600) 0%, var(--green-500) 100%)',
                height: 'auto'
              }}
            >
              {saving ? (
                <>
                  <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px', marginRight: '0.4rem' }} />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Local keyframe animations style block */}
      <style>{`
        @keyframes pref-savebar-in {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pref-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.5; }
        }
      `}</style>

    </div>
  );
};

export default Preferences;
