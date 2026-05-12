import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

// ─── Reusable Components ───────────────────────────────────────────────────────

const RangeSlider = ({ 
  label, 
  icon, 
  value, 
  min, 
  max, 
  step = 1, 
  unit, 
  color = 'var(--primary-green)',
  onChange,
  formatLabel,
  extraInfo
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="form-group">
      <label style={{ 
        fontWeight: '700', 
        fontSize: '0.95rem', 
        marginBottom: '1rem', 
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        {icon && <span style={{ fontSize: '1.25rem' }}>{icon}</span>}
        {label}: <span style={{ color }}>{value} {unit}</span>
      </label>
      
      <div style={{ position: 'relative' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            background: `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, var(--border-color) ${percentage}%, var(--border-color) 100%)`,
            outline: 'none',
            appearance: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={label}
        />
      </div>

      {(formatLabel || extraInfo) && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          fontSize: '0.85rem', 
          color: 'var(--text-light)',
          marginTop: '0.75rem'
        }}>
          <span>{min} {unit}</span>
          {formatLabel && (
            <span style={{ 
              background: `${color}15`,
              color: color,
              padding: '0.3rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              fontWeight: '600',
              fontSize: '0.8rem',
              border: `1.5px solid ${color}`
            }}>
              {formatLabel(value)}
            </span>
          )}
          {extraInfo && <span>{extraInfo}</span>}
          <span>{max} {unit}</span>
        </div>
      )}
    </div>
  );
};

const RadioGroup = ({ options, value, onChange, name }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
    {options.map((option) => {
      const isSelected = value === option.value;
      return (
        <label
          key={option.value}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.25rem',
            border: `2px solid ${isSelected ? 'var(--primary-green)' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: isSelected ? 'var(--light-green-bg)' : 'var(--bg-secondary)',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.borderColor = 'var(--primary-green)';
              e.currentTarget.style.transform = 'translateX(3px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.transform = 'translateX(0)';
            }
          }}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={isSelected}
            onChange={(e) => onChange(e.target.value)}
            style={{ position: 'absolute', opacity: 0 }}
            aria-label={option.label}
          />
          <span style={{ fontSize: '1.5rem' }}>{option.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', marginBottom: '0.15rem', fontSize: '0.95rem' }}>
              {option.label}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-light)' }}>
              {option.description}
            </div>
          </div>
          {isSelected && (
            <div style={{
              background: 'var(--primary-green)',
              color: 'white',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: '700',
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

const TransportModeCard = ({ mode, isSelected, onToggle }) => (
  <button
    onClick={onToggle}
    aria-pressed={isSelected}
    style={{
      position: 'relative',
      cursor: 'pointer',
      padding: '1.5rem',
      border: `2.5px solid ${isSelected ? mode.color : 'var(--border-color)'}`,
      borderRadius: 'var(--radius-lg)',
      background: isSelected ? `${mode.color}10` : 'var(--bg-secondary)',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      textAlign: 'left',
      width: '100%',
      outline: 'none'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      if (!isSelected) e.currentTarget.style.borderColor = mode.color;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
      if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-color)';
    }}
    onFocus={(e) => {
      e.currentTarget.style.boxShadow = `0 0 0 3px ${mode.color}30`;
    }}
    onBlur={(e) => {
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <span style={{ 
      fontSize: '2.5rem', 
      display: 'block', 
      marginBottom: '0.75rem',
      filter: isSelected ? 'none' : 'grayscale(0.3)'
    }}>
      {mode.icon}
    </span>
    <div style={{ fontWeight: '700', marginBottom: '0.3rem', fontSize: '1rem', color: 'var(--text-primary)' }}>
      {mode.label}
    </div>
    <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: '1.4' }}>
      {mode.description}
    </div>
    
    {isSelected && (
      <div style={{
        position: 'absolute',
        top: '0.75rem',
        right: '0.75rem',
        background: mode.color,
        color: 'white',
        borderRadius: '50%',
        width: '26px',
        height: '26px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.9rem',
        fontWeight: '700',
        animation: 'scaleIn 0.3s ease'
      }}>
        ✓
      </div>
    )}
  </button>
);

const SectionCard = ({ icon, title, subtitle, children }) => (
  <div className="card card-elevated" style={{ marginBottom: '1.5rem' }}>
    <div style={{ marginBottom: subtitle ? '0.5rem' : '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>{title}</h3>
      </div>
      {subtitle && (
        <p style={{ 
          margin: '0.5rem 0 1.5rem 2.25rem', 
          fontSize: '0.9rem', 
          color: 'var(--text-light)',
          lineHeight: '1.5'
        }}>
          {subtitle}
        </p>
      )}
    </div>
    {children}
  </div>
);

const Toast = ({ message, type }) => {
  if (!message) return null;

  const config = {
    success: { bg: 'var(--light-green-bg)', color: 'var(--primary-green)', border: 'var(--primary-green)' },
    error: { bg: '#fee2e2', color: '#dc2626', border: '#dc2626' }
  };

  const style = config[type] || config.success;

  return (
    <div
      role="alert"
      style={{
        backgroundColor: style.bg,
        color: style.color,
        border: `2px solid ${style.border}`,
        padding: '1rem 1.5rem',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '1.5rem',
        fontWeight: '600',
        fontSize: '0.95rem',
        boxShadow: 'var(--shadow-md)',
        animation: 'slideUp 0.3s ease'
      }}
    >
      {message}
    </div>
  );
};

// ─── Configuration ─────────────────────────────────────────────────────────────

const TRANSPORT_MODES = [
  { id: 'Walking', icon: '🚶', label: 'Walking', description: 'Zero emissions, keep fit', color: '#10b981' },
  { id: 'Cycling', icon: '🚴', label: 'Cycling', description: 'Fast & eco-friendly', color: '#3b82f6' },
  { id: 'Public Transit', icon: '🚌', label: 'Public Transit', description: 'Shared & efficient', color: '#8b5cf6' },
  { id: 'Mixed Routes', icon: '🔄', label: 'Mixed Routes', description: 'Combine multiple modes', color: '#f59e0b' }
];

const PRIORITY_OPTIONS = [
  { value: 'Eco First', label: 'Eco First', icon: '🌱', description: 'Minimize carbon footprint above all' },
  { value: 'Balanced', label: 'Balanced', icon: '⚖️', description: 'Balance time and sustainability' },
  { value: 'Speed First', label: 'Speed First', icon: '⚡', description: 'Fastest route with green options' }
];

const WEATHER_OPTIONS = [
  { value: 'Low', label: 'Low', icon: '☀️', description: 'I'll travel in any weather' },
  { value: 'Moderate', label: 'Moderate', icon: '🌤️', description: 'Some weather consideration' },
  { value: 'High', label: 'High', icon: '🌧️', description: 'Weather strongly influences my choice' }
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
  const [originalPreferences, setOriginalPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const hasChanges = useMemo(() => 
    JSON.stringify(preferences) !== JSON.stringify(originalPreferences),
    [preferences, originalPreferences]
  );

  // ── API Calls ────────────────────────────────────────────────────────────────

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
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  }, []);

  const updatePreference = useCallback((field, value) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleTransportToggle = useCallback((modeId) => {
    setPreferences(prev => ({
      ...prev,
      transportModes: prev.transportModes.includes(modeId)
        ? prev.transportModes.filter(m => m !== modeId)
        : [...prev.transportModes, modeId]
    }));
  }, []);

  const handleSave = async () => {
    if (saving || !hasChanges) return;

    setSaving(true);
    try {
      await axios.post('/api/preferences', preferences);
      setOriginalPreferences(preferences);
      showToast('✨ Preferences saved! Your routes are now personalized.', 'success');
    } catch (error) {
      console.error('Save failed:', error);
      showToast('Failed to save. Please check your connection.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all preferences to defaults?')) {
      setPreferences(DEFAULT_PREFERENCES);
    }
  };

  const handleExport = () => {
    try {
      const blob = new Blob(
        [JSON.stringify(preferences, null, 2)], 
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `greenroute-prefs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('📦 Settings exported successfully', 'success');
    } catch (error) {
      showToast('Export failed', 'error');
    }
  };

  const handleCancel = () => setPreferences(originalPreferences);

  // ── Loading State ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ 
        padding: '4rem 2rem', 
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem'
      }}>
        <div className="spinner" style={{ width: '50px', height: '50px' }} />
        <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Loading your preferences...
        </p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ paddingBottom: '120px' }}>
      {/* Header */}
      <div style={{ padding: '0 2rem', marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.75rem', fontWeight: '800' }}>
          Your Preferences
        </h2>
        <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.95rem' }}>
          Customize how GreenRoute plans your journeys
        </p>
      </div>

      <div style={{ padding: '0 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <Toast message={toast.message} type={toast.type} />

        {/* Transport Modes */}
        <SectionCard
          icon="🚗"
          title="Transport Modes"
          subtitle="Select your preferred ways to travel. We'll prioritize these in route suggestions."
        >
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '1rem' 
          }}>
            {TRANSPORT_MODES.map(mode => (
              <TransportModeCard
                key={mode.id}
                mode={mode}
                isSelected={preferences.transportModes.includes(mode.id)}
                onToggle={() => handleTransportToggle(mode.id)}
              />
            ))}
          </div>
        </SectionCard>

        {/* Priority & Weather */}
        <SectionCard
          icon="🎯"
          title="Route Priorities"
          subtitle="Tell us what matters most when planning your routes."
        >
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '2rem' 
          }}>
            <div>
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Sustainability Priority
              </h4>
              <RadioGroup
                name="priority"
                options={PRIORITY_OPTIONS}
                value={preferences.sustainabilityPriority}
                onChange={(val) => updatePreference('sustainabilityPriority', val)}
              />
            </div>

            <div>
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Weather Sensitivity
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

        {/* Distance Limits */}
        <SectionCard
          icon="📏"
          title="Distance Comfort Zones"
          subtitle="Set your maximum distances for walking and cycling routes."
        >
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '2rem' 
          }}>
            <RangeSlider
              icon="🚶"
              label="Max Walking Distance"
              value={preferences.maxWalkingDistance}
              min={1}
              max={20}
              unit="km"
              color="var(--primary-green)"
              onChange={(val) => updatePreference('maxWalkingDistance', val)}
              formatLabel={(val) => `~${Math.round(val * 12)} min walk`}
            />

            <RangeSlider
              icon="🚴"
              label="Max Cycling Distance"
              value={preferences.maxCyclingDistance}
              min={1}
              max={50}
              unit="km"
              color="#3b82f6"
              onChange={(val) => updatePreference('maxCyclingDistance', val)}
              formatLabel={(val) => `~${Math.round(val * 3)} min ride`}
            />
          </div>
        </SectionCard>

        {/* Goals */}
        <SectionCard
          icon="🌱"
          title="Sustainability Goal"
          subtitle="Challenge yourself to reduce your carbon footprint."
        >
          <RangeSlider
            icon="🎯"
            label="Monthly CO₂ Savings Target"
            value={preferences.monthlyGoal}
            min={10}
            max={200}
            step={10}
            unit="kg"
            color="var(--primary-green)"
            onChange={(val) => updatePreference('monthlyGoal', val)}
          />

          <div style={{ 
            marginTop: '1.5rem',
            background: 'linear-gradient(135deg, var(--primary-green), var(--primary-green-light))',
            color: 'white',
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            boxShadow: 'var(--shadow-green)'
          }}>
            <span style={{ fontSize: '2.5rem' }}>🌳</span>
            <span style={{ fontSize: '1rem' }}>
              That's like planting{' '}
              <span style={{ fontSize: '1.4rem', fontWeight: '800' }}>
                {Math.floor(preferences.monthlyGoal / 20)}
              </span>
              {' '}tree{Math.floor(preferences.monthlyGoal / 20) !== 1 ? 's' : ''} monthly
            </span>
          </div>
        </SectionCard>

        {/* Saved Locations */}
        <SectionCard
          icon="📍"
          title="Saved Locations"
          subtitle="Save your most frequent destinations for quick route planning."
        >
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '1.25rem' 
          }}>
            <div className="form-group">
              <label style={{ 
                fontWeight: '700', 
                marginBottom: '0.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                fontSize: '0.9rem'
              }}>
                <span style={{ fontSize: '1.2rem' }}>🏠</span>
                Home Address
              </label>
              <input
                type="text"
                placeholder="123 Green Street..."
                value={preferences.homeAddress}
                onChange={(e) => updatePreference('homeAddress', e.target.value)}
                style={{ fontSize: '0.95rem' }}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: '0.5rem 0 0' }}>
                Quick access to "Home to..." routes
              </p>
            </div>

            <div className="form-group">
              <label style={{ 
                fontWeight: '700', 
                marginBottom: '0.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                fontSize: '0.9rem'
              }}>
                <span style={{ fontSize: '1.2rem' }}>💼</span>
                Work Address
              </label>
              <input
                type="text"
                placeholder="456 Eco Avenue..."
                value={preferences.workAddress}
                onChange={(e) => updatePreference('workAddress', e.target.value)}
                style={{ fontSize: '0.95rem' }}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: '0.5rem 0 0' }}>
                Quick access to commute planning
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Quick Actions */}
        <SectionCard icon="⚡" title="Quick Actions">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem' 
          }}>
            <button
              onClick={handleReset}
              className="btn btn-secondary"
              style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '1.25rem',
                height: 'auto',
                gap: '0.5rem'
              }}
            >
              <span style={{ fontSize: '1.75rem' }}>🔄</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                  Reset to Defaults
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: '400' }}>
                  Restore original settings
                </div>
              </div>
            </button>

            <button
              onClick={handleExport}
              className="btn btn-secondary"
              style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '1.25rem',
                height: 'auto',
                gap: '0.5rem'
              }}
            >
              <span style={{ fontSize: '1.75rem' }}>📥</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                  Export Settings
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: '400' }}>
                  Download as JSON
                </div>
              </div>
            </button>
          </div>
        </SectionCard>
      </div>

      {/* Floating Save Bar */}
      {hasChanges && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-primary)',
          border: '2px solid var(--primary-green)',
          borderRadius: 'var(--radius-full)',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          zIndex: 1000,
          animation: 'slideUp 0.3s ease',
          maxWidth: 'calc(100vw - 4rem)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            fontSize: '0.9rem',
            fontWeight: '600',
            color: 'var(--text-primary)'
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--primary-green)',
              animation: 'pulse 2s infinite'
            }} />
            Unsaved changes
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleCancel}
              className="btn btn-secondary"
              disabled={saving}
              style={{ 
                padding: '0.6rem 1.25rem',
                fontSize: '0.9rem',
                minWidth: '90px'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary"
              disabled={saving}
              style={{ 
                padding: '0.6rem 1.5rem',
                fontSize: '0.9rem',
                minWidth: '140px',
                background: 'linear-gradient(135deg, var(--primary-green), var(--primary-green-light))'
              }}
            >
              {saving ? (
                <>
                  <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', marginRight: '0.5rem' }} />
                  Saving...
                </>
              ) : (
                '💾 Save Changes'
              )}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        input[type="range"] {
          -webkit-appearance: none;
        }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--primary-green);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 3px 12px rgba(16, 185, 129, 0.4);
        }

        input[type="range"]::-webkit-slider-thumb:active {
          transform: scale(1.05);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--primary-green);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          transition: transform 0.2s ease;
        }
        
        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.15);
        }

        input[type="range"]:focus {
          outline: none;
        }

        input[type="range"]:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
        }
      `}</style>
    </div>
  );
};

export default Preferences;
