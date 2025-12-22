import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Preferences = ({ user }) => {
  const [preferences, setPreferences] = useState({
    transportModes: ['Walking', 'Cycling', 'Public Transit', 'Mixed Routes'],
    sustainabilityPriority: 'Eco First',
    weatherSensitivity: 'Moderate',
    maxWalkingDistance: 3,
    maxCyclingDistance: 15,
    monthlyGoal: 60,
    homeAddress: '',
    workAddress: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalPreferences, setOriginalPreferences] = useState({});

  useEffect(() => {
    fetchPreferences();
  }, []);

  useEffect(() => {
    const changed = JSON.stringify(preferences) !== JSON.stringify(originalPreferences);
    setHasChanges(changed);
  }, [preferences, originalPreferences]);

  const fetchPreferences = async () => {
    try {
      const response = await axios.get('/api/preferences');
      const fetchedPrefs = { ...preferences, ...response.data };
      setPreferences(fetchedPrefs);
      setOriginalPreferences(fetchedPrefs);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      setOriginalPreferences(preferences);
    } finally {
      setLoading(false);
    }
  };

  const handleTransportModeToggle = (mode) => {
    const updatedModes = preferences.transportModes.includes(mode)
      ? preferences.transportModes.filter(m => m !== mode)
      : [...preferences.transportModes, mode];
    
    setPreferences({ ...preferences, transportModes: updatedModes });
  };

  const handleInputChange = (field, value) => {
    setPreferences({ ...preferences, [field]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    
    try {
      await axios.post('/api/preferences', preferences);
      setOriginalPreferences(preferences);
      setSaveMessage('✅ Preferences saved! Your routes are now personalized.');
      setTimeout(() => setSaveMessage(''), 4000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveMessage('❌ Failed to save. Please check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (window.confirm('🔄 Reset all preferences to default values? This will undo your customizations.')) {
      const defaultPrefs = {
        transportModes: ['Walking', 'Cycling', 'Public Transit', 'Mixed Routes'],
        sustainabilityPriority: 'Eco First',
        weatherSensitivity: 'Moderate',
        maxWalkingDistance: 3,
        maxCyclingDistance: 15,
        monthlyGoal: 60,
        homeAddress: '',
        workAddress: ''
      };
      setPreferences(defaultPrefs);
    }
  };

  const transportModeOptions = [
    { id: 'Walking', icon: '🚶', label: 'Walking', description: 'Zero emissions', color: '#10b981' },
    { id: 'Cycling', icon: '🚴', label: 'Cycling', description: 'Fast & eco-friendly', color: '#3b82f6' },
    { id: 'Public Transit', icon: '🚌', label: 'Public Transit', description: 'Shared transport', color: '#8b5cf6' },
    { id: 'Mixed Routes', icon: '🔄', label: 'Mixed Routes', description: 'Combine modes', color: '#f59e0b' }
  ];

  const priorityOptions = [
    { value: 'Eco First', label: 'Eco First', icon: '🌱', description: 'Lowest carbon footprint' },
    { value: 'Balanced', label: 'Balanced', icon: '⚖️', description: 'Balance time & sustainability' },
    { value: 'Speed First', label: 'Speed First', icon: '⚡', description: 'Fastest with green options' }
  ];

  const weatherOptions = [
    { value: 'Low', label: 'Low', icon: '☀️', description: 'Weather rarely affects me' },
    { value: 'Moderate', label: 'Moderate', icon: '🌤️', description: 'Some consideration' },
    { value: 'High', label: 'High', icon: '🌧️', description: 'Strongly influences choice' }
  ];

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
        <div className="spinner" style={{ width: '60px', height: '60px' }}></div>
        <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Loading your preferences...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Enhanced Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '2.5rem' }}>⚙️</span>
          <div>
            <h2 style={{ margin: 0 }}>Your Preferences</h2>
            <p style={{ margin: 0 }}>Customize GreenRoute to match your travel style</p>
          </div>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div style={{
          margin: '0 2rem 2rem',
          backgroundColor: saveMessage.includes('❌') ? '#fee2e2' : 'var(--light-green-bg)',
          color: saveMessage.includes('❌') ? '#dc2626' : 'var(--primary-green)',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center',
          border: `2px solid ${saveMessage.includes('❌') ? '#dc2626' : 'var(--primary-green)'}`,
          fontWeight: '600',
          boxShadow: 'var(--shadow-md)',
          animation: 'slideUp 0.3s ease'
        }}>
          {saveMessage}
        </div>
      )}

      <div style={{ padding: '0 2rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Transport Preferences */}
        <div className="card card-elevated preference-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🚗</span>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Transport Preferences</h3>
          </div>
          <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
            Select your preferred ways to travel. We'll prioritize these modes in route suggestions.
          </p>
          
          <div className="transport-options" style={{ marginBottom: '2rem' }}>
            {transportModeOptions.map(option => (
              <div
                key={option.id}
                className={`transport-option ${preferences.transportModes.includes(option.id) ? 'selected' : ''}`}
                onClick={() => handleTransportModeToggle(option.id)}
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all var(--transition-normal)'
                }}
              >
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>
                  {option.icon}
                </span>
                <div style={{ fontWeight: '700', marginBottom: '0.25rem', fontSize: '1rem' }}>
                  {option.label}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                  {option.description}
                </div>
                {preferences.transportModes.includes(option.id) && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: option.color,
                    color: 'white',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    fontWeight: '700',
                    boxShadow: 'var(--shadow-md)'
                  }}>
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="form-grid" style={{ gap: '2rem' }}>
            <div className="form-group">
              <label style={{ fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                Sustainability Priority
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {priorityOptions.map(option => (
                  <label
                    key={option.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      border: preferences.sustainabilityPriority === option.value 
                        ? '2px solid var(--primary-green)' 
                        : '2px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      background: preferences.sustainabilityPriority === option.value 
                        ? 'var(--light-green-bg)' 
                        : 'var(--bg-secondary)'
                    }}
                    onMouseOver={(e) => {
                      if (preferences.sustainabilityPriority !== option.value) {
                        e.currentTarget.style.transform = 'translateX(4px)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                      }
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={option.value}
                      checked={preferences.sustainabilityPriority === option.value}
                      onChange={(e) => handleInputChange('sustainabilityPriority', e.target.value)}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontSize: '1.5rem' }}>{option.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', marginBottom: '0.125rem' }}>{option.label}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{option.description}</div>
                    </div>
                    {preferences.sustainabilityPriority === option.value && (
                      <div style={{
                        background: 'var(--primary-green)',
                        color: 'white',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                        fontWeight: '700'
                      }}>
                        ✓
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                Weather Sensitivity
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {weatherOptions.map(option => (
                  <label
                    key={option.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      border: preferences.weatherSensitivity === option.value 
                        ? '2px solid var(--primary-green)' 
                        : '2px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      background: preferences.weatherSensitivity === option.value 
                        ? 'var(--light-green-bg)' 
                        : 'var(--bg-secondary)'
                    }}
                    onMouseOver={(e) => {
                      if (preferences.weatherSensitivity !== option.value) {
                        e.currentTarget.style.transform = 'translateX(4px)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                      }
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <input
                      type="radio"
                      name="weather"
                      value={option.value}
                      checked={preferences.weatherSensitivity === option.value}
                      onChange={(e) => handleInputChange('weatherSensitivity', e.target.value)}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontSize: '1.5rem' }}>{option.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', marginBottom: '0.125rem' }}>{option.label}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{option.description}</div>
                    </div>
                    {preferences.weatherSensitivity === option.value && (
                      <div style={{
                        background: 'var(--primary-green)',
                        color: 'white',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                        fontWeight: '700'
                      }}>
                        ✓
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Distance Limits */}
        <div className="card card-elevated preference-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.75rem' }}>📏</span>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Distance Limits</h3>
          </div>
          <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
            Set your comfort limits for walking and cycling.
          </p>
          
          <div className="form-grid">
            <div className="form-group">
              <label style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '1rem', display: 'block' }}>
                <span style={{ fontSize: '1.25rem', marginRight: '0.5rem' }}>🚶</span>
                Maximum Walking Distance: <span style={{ color: 'var(--primary-green)' }}>{preferences.maxWalkingDistance} km</span>
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={preferences.maxWalkingDistance}
                onChange={(e) => handleInputChange('maxWalkingDistance', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, var(--primary-green) 0%, var(--primary-green) ${(preferences.maxWalkingDistance / 20) * 100}%, var(--border-color) ${(preferences.maxWalkingDistance / 20) * 100}%, var(--border-color) 100%)`,
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer'
                }}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '0.85rem', 
                color: 'var(--text-light)',
                marginTop: '0.75rem'
              }}>
                <span>1 km</span>
                <span style={{ 
                  background: 'var(--light-green-bg)',
                  color: 'var(--primary-green)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: '600',
                  border: '2px solid var(--primary-green)'
                }}>
                  ~{Math.round(preferences.maxWalkingDistance * 12)} min walk
                </span>
                <span>20 km</span>
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '1rem', display: 'block' }}>
                <span style={{ fontSize: '1.25rem', marginRight: '0.5rem' }}>🚴</span>
                Maximum Cycling Distance: <span style={{ color: 'var(--accent-blue)' }}>{preferences.maxCyclingDistance} km</span>
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={preferences.maxCyclingDistance}
                onChange={(e) => handleInputChange('maxCyclingDistance', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, var(--accent-blue) 0%, var(--accent-blue) ${(preferences.maxCyclingDistance / 50) * 100}%, var(--border-color) ${(preferences.maxCyclingDistance / 50) * 100}%, var(--border-color) 100%)`,
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer'
                }}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '0.85rem', 
                color: 'var(--text-light)',
                marginTop: '0.75rem'
              }}>
                <span>1 km</span>
                <span style={{ 
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: 'var(--accent-blue)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: '600',
                  border: '2px solid var(--accent-blue)'
                }}>
                  ~{Math.round(preferences.maxCyclingDistance * 3)} min ride
                </span>
                <span>50 km</span>
              </div>
            </div>
          </div>
        </div>

        {/* Goals & Locations */}
        <div className="card card-elevated preference-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🎯</span>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Goals & Locations</h3>
          </div>
          <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
            Set your sustainability goals and save frequent destinations.
          </p>
          
          <div className="form-group" style={{ marginBottom: '2.5rem' }}>
            <label style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '1rem', display: 'block' }}>
              <span style={{ fontSize: '1.25rem', marginRight: '0.5rem' }}>🌱</span>
              Monthly Carbon Savings Goal: <span style={{ color: 'var(--primary-green)' }}>{preferences.monthlyGoal} kg CO₂</span>
            </label>
            <input
              type="range"
              min="10"
              max="200"
              step="10"
              value={preferences.monthlyGoal}
              onChange={(e) => handleInputChange('monthlyGoal', parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                background: `linear-gradient(to right, var(--primary-green) 0%, var(--primary-green) ${(preferences.monthlyGoal / 200) * 100}%, var(--border-color) ${(preferences.monthlyGoal / 200) * 100}%, var(--border-color) 100%)`,
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
                marginBottom: '1rem'
              }}
            />
            <div style={{ 
              fontSize: '0.95rem', 
              color: 'white',
              background: 'linear-gradient(135deg, var(--primary-green), var(--primary-green-light))',
              marginTop: '1rem',
              textAlign: 'center',
              fontWeight: '700',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '2rem' }}>🌳</span>
              <span>
                Equivalent to planting <span style={{ fontSize: '1.5rem' }}>{Math.floor(preferences.monthlyGoal / 20)}</span> tree{Math.floor(preferences.monthlyGoal / 20) !== 1 ? 's' : ''} per month
              </span>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label style={{ fontWeight: '700', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🏠</span>
                Home Address
              </label>
              <input
                type="text"
                placeholder="Enter your home address..."
                value={preferences.homeAddress}
                onChange={(e) => handleInputChange('homeAddress', e.target.value)}
                style={{ fontSize: '1rem' }}
              />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                Quick planning for "Home to..." routes
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: '700', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>💼</span>
                Work Address
              </label>
              <input
                type="text"
                placeholder="Enter your work address..."
                value={preferences.workAddress}
                onChange={(e) => handleInputChange('workAddress', e.target.value)}
                style={{ fontSize: '1rem' }}
              />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                Quick planning for "Work to..." routes
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card preference-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>⚡</span>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Quick Actions</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <button
              onClick={resetToDefaults}
              className="btn btn-secondary"
              style={{ 
                flexDirection: 'column',
                padding: '1.5rem',
                height: 'auto',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}
            >
              <span style={{ fontSize: '2rem' }}>🔄</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>Reset Defaults</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: '400' }}>
                  Restore original settings
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                const data = JSON.stringify(preferences, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `greenroute-preferences-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="btn btn-secondary"
              style={{ 
                flexDirection: 'column',
                padding: '1.5rem',
                height: 'auto',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}
            >
              <span style={{ fontSize: '2rem' }}>📥</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>Export Settings</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: '400' }}>
                  Download as JSON
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Fixed Save Button */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        background: 'var(--bg-secondary)',
        borderTop: '2px solid var(--border-color)',
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {hasChanges && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              fontWeight: '600'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: 'var(--primary-green)',
                animation: 'pulse 2s infinite',
                boxShadow: '0 0 0 0 var(--primary-green)'
              }}></div>
              Unsaved changes
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {hasChanges && (
            <button
              onClick={() => setPreferences(originalPreferences)}
              className="btn btn-secondary"
              disabled={saving}
              style={{ minWidth: '120px' }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={saving || !hasChanges}
            style={{ 
              minWidth: '200px',
              background: hasChanges 
                ? 'linear-gradient(135deg, var(--primary-green), var(--primary-green-light))'
                : undefined,
              opacity: !hasChanges ? 0.5 : 1
            }}
          >
            {saving ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '3px' }}></div>
                Saving...
              </div>
            ) : (
              <>💾 Save All Preferences</>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
        
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--primary-green);
          cursor: pointer;
          box-shadow: var(--shadow-md);
          transition: transform 0.2s;
        }
        
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
};

export default Preferences;
