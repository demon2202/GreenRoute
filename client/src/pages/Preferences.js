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
    // Check if there are unsaved changes
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
      // Set original preferences to current defaults if fetch fails
      setOriginalPreferences(preferences);
    } finally {
      setLoading(false);
    }
  };

  const handleTransportModeToggle = (mode) => {
    const updatedModes = preferences.transportModes.includes(mode)
      ? preferences.transportModes.filter(m => m !== mode)
      : [...preferences.transportModes, mode];
    
    setPreferences({
      ...preferences,
      transportModes: updatedModes
    });
  };

  const handleInputChange = (field, value) => {
    setPreferences({
      ...preferences,
      [field]: value
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    
    try {
      await axios.post('/api/preferences', preferences);
      setOriginalPreferences(preferences);
      setSaveMessage('Preferences saved successfully! Your route recommendations will now be personalized.');
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveMessage('Failed to save preferences. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (window.confirm('Reset all preferences to default values? This will undo any customizations you\'ve made.')) {
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
    { id: 'Walking', icon: '🚶', label: 'Walking', description: 'Zero emissions, great exercise' },
    { id: 'Cycling', icon: '🚴', label: 'Cycling', description: 'Fast and eco-friendly' },
    { id: 'Public Transit', icon: '🚌', label: 'Public Transit', description: 'Shared sustainable transport' },
    { id: 'Mixed Routes', icon: '🔄', label: 'Mixed Routes', description: 'Combine multiple modes' }
  ];

  const priorityOptions = [
    { value: 'Eco First', label: 'Eco First', description: 'Prioritize lowest carbon footprint' },
    { value: 'Balanced', label: 'Balanced', description: 'Balance time and sustainability' },
    { value: 'Speed First', label: 'Speed First', description: 'Fastest route with green options' }
  ];

  const weatherOptions = [
    { value: 'Low', label: 'Low', description: 'Weather rarely affects my choices' },
    { value: 'Moderate', label: 'Moderate', description: 'Some weather consideration' },
    { value: 'High', label: 'High', description: 'Weather strongly influences transport' }
  ];

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h2>Your Preferences</h2>
        <p>Customize GreenRoute to match your sustainable travel style and get personalized recommendations</p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div style={{
          margin: '2rem',
          backgroundColor: saveMessage.includes('success') ? 'var(--light-green-bg)' : '#fee2e2',
          color: saveMessage.includes('success') ? 'var(--primary-green)' : '#dc2626',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          textAlign: 'center',
          border: `1px solid ${saveMessage.includes('success') ? 'var(--primary-green)' : '#dc2626'}`,
          fontWeight: '500'
        }}>
          {saveMessage}
        </div>
      )}

      <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Transport Preferences */}
        <div className="card preference-section">
          <h3>🚗 Transport Preferences</h3>
          <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
            Select your preferred ways to travel. We'll prioritize these modes in route suggestions.
          </p>
          
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600' }}>
              Preferred Transport Modes
            </label>
            <div className="transport-options">
              {transportModeOptions.map(option => (
                <div
                  key={option.id}
                  className={`transport-option ${preferences.transportModes.includes(option.id) ? 'selected' : ''}`}
                  onClick={() => handleTransportModeToggle(option.id)}
                >
                  <span className="icon">{option.icon}</span>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                      {option.label}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      {option.description}
                    </span>
                  </div>
                  {preferences.transportModes.includes(option.id) && (
                    <div style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: 'var(--primary-green)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem'
                    }}>
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Sustainability Priority</label>
              <select
                value={preferences.sustainabilityPriority}
                onChange={(e) => handleInputChange('sustainabilityPriority', e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  backgroundColor: 'var(--input-bg)',
                  fontFamily: 'Be Vietnam Pro, sans-serif',
                  fontSize: '1rem',
                  color: 'var(--text-primary)'
                }}
              >
                {priorityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Weather Sensitivity</label>
              <select
                value={preferences.weatherSensitivity}
                onChange={(e) => handleInputChange('weatherSensitivity', e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  backgroundColor: 'var(--input-bg)',
                  fontFamily: 'Be Vietnam Pro, sans-serif',
                  fontSize: '1rem',
                  color: 'var(--text-primary)'
                }}
              >
                {weatherOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Distance Limits */}
        <div className="card preference-section">
          <h3>📍 Distance Limits</h3>
          <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
            Set your comfort limits for walking and cycling to get realistic route suggestions.
          </p>
          
          <div className="form-grid">
            <div className="form-group">
              <label>
                Maximum Walking Distance: {preferences.maxWalkingDistance} km
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={preferences.maxWalkingDistance}
                onChange={(e) => handleInputChange('maxWalkingDistance', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: 'var(--border-color)',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer'
                }}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '0.8rem', 
                color: 'var(--text-light)',
                marginTop: '0.5rem'
              }}>
                <span>1 km</span>
                <span>20 km</span>
              </div>
              <div style={{ 
                fontSize: '0.85rem', 
                color: 'var(--text-secondary)', 
                marginTop: '0.5rem',
                textAlign: 'center'
              }}>
                About {Math.round(preferences.maxWalkingDistance * 12)} minutes walk
              </div>
            </div>

            <div className="form-group">
              <label>
                Maximum Cycling Distance: {preferences.maxCyclingDistance} km
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={preferences.maxCyclingDistance}
                onChange={(e) => handleInputChange('maxCyclingDistance', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: 'var(--border-color)',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer'
                }}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '0.8rem', 
                color: 'var(--text-light)',
                marginTop: '0.5rem'
              }}>
                <span>1 km</span>
                <span>50 km</span>
              </div>
              <div style={{ 
                fontSize: '0.85rem', 
                color: 'var(--text-secondary)', 
                marginTop: '0.5rem',
                textAlign: 'center'
              }}>
                About {Math.round(preferences.maxCyclingDistance * 3)} minutes ride
              </div>
            </div>
          </div>
        </div>

        {/* Goals & Locations */}
        <div className="card preference-section">
          <h3>🎯 Goals & Favorite Locations</h3>
          <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
            Set your sustainability goals and save frequent destinations for quick route planning.
          </p>
          
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label>
              Monthly Carbon Savings Goal: {preferences.monthlyGoal} kg CO₂
            </label>
            <input
              type="range"
              min="10"
              max="200"
              value={preferences.monthlyGoal}
              onChange={(e) => handleInputChange('monthlyGoal', parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: 'var(--border-color)',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer'
              }}
            />
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '0.8rem', 
              color: 'var(--text-light)',
              marginTop: '0.5rem'
            }}>
              <span>10 kg</span>
              <span>200 kg</span>
            </div>
            <div style={{ 
              fontSize: '0.85rem', 
              color: 'var(--primary-green)', 
              marginTop: '0.75rem',
              textAlign: 'center',
              fontWeight: '600',
              padding: '0.75rem',
              background: 'var(--light-green-bg)',
              borderRadius: '8px',
              border: '1px solid var(--primary-green)'
            }}>
              🌳 Equivalent to planting {Math.floor(preferences.monthlyGoal / 20)} tree{Math.floor(preferences.monthlyGoal / 20) !== 1 ? 's' : ''} per month
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Home Address</label>
              <input
                type="text"
                placeholder="e.g., 123 Green Street, Eco District, Delhi"
                value={preferences.homeAddress}
                onChange={(e) => handleInputChange('homeAddress', e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem'
                }}
              />
              <div style={{ 
                fontSize: '0.8rem', 
                color: 'var(--text-light)', 
                marginTop: '0.5rem' 
              }}>
                Used for quick "Home to..." route planning
              </div>
            </div>

            <div className="form-group">
              <label>Work Address</label>
              <input
                type="text"
                placeholder="e.g., 456 Innovation Avenue, Tech Park, Mumbai"
                value={preferences.workAddress}
                onChange={(e) => handleInputChange('workAddress', e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem'
                }}
              />
              <div style={{ 
                fontSize: '0.8rem', 
                color: 'var(--text-light)', 
                marginTop: '0.5rem' 
              }}>
                Used for quick "Work to..." route planning
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Data */}
        <div className="card preference-section">
          <h3>🔒 Privacy & Data Settings</h3>
          <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
            Control how your data is used to improve GreenRoute while keeping your privacy protected.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '0.75rem', 
              cursor: 'pointer',
              padding: '1rem',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              background: 'var(--bg-secondary)',
              transition: 'all var(--transition-fast)'
            }}>
              <input 
                type="checkbox" 
                defaultChecked 
                style={{ marginTop: '0.25rem' }}
              />
              <div>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                  Share anonymized data for route improvements
                </span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                  Help us improve route suggestions by sharing anonymous usage patterns. 
                  No personal information is ever shared.
                </div>
              </div>
            </label>
            
            <label style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '0.75rem', 
              cursor: 'pointer',
              padding: '1rem',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              background: 'var(--bg-secondary)',
              transition: 'all var(--transition-fast)'
            }}>
              <input 
                type="checkbox" 
                defaultChecked
                style={{ marginTop: '0.25rem' }}
              />
              <div>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                  Receive sustainability tips and achievements
                </span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                  Get personalized tips to maximize your environmental impact and celebrate milestones.
                </div>
              </div>
            </label>
            
            <label style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '0.75rem', 
              cursor: 'pointer',
              padding: '1rem',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              background: 'var(--bg-secondary)',
              transition: 'all var(--transition-fast)'
            }}>
              <input 
                type="checkbox"
                style={{ marginTop: '0.25rem' }}
              />
              <div>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                  Location-based weather and transit alerts
                </span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                  Get real-time alerts about weather conditions and transit disruptions that might affect your routes.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card preference-section">
          <h3>⚡ Quick Actions</h3>
          <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
            Manage your preferences and data with these quick actions.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <button
              onClick={resetToDefaults}
              className="btn btn-secondary"
              style={{ 
                justifyContent: 'flex-start',
                padding: '1rem',
                height: 'auto',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🔄</span>
                <span style={{ fontWeight: '600' }}>Reset to Defaults</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                Restore original settings
              </span>
            </button>

            <button
              onClick={() => {
                const data = JSON.stringify(preferences, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'greenroute-preferences.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="btn btn-secondary"
              style={{ 
                justifyContent: 'flex-start',
                padding: '1rem',
                height: 'auto',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📁</span>
                <span style={{ fontWeight: '600' }}>Export Preferences</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                Download as JSON file
              </span>
            </button>

            <button
              onClick={() => {
                alert('Feature coming soon! You\'ll be able to import preferences from a JSON file.');
              }}
              className="btn btn-secondary"
              style={{ 
                justifyContent: 'flex-start',
                padding: '1rem',
                height: 'auto',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📂</span>
                <span style={{ fontWeight: '600' }}>Import Preferences</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                Load from JSON file
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Fixed Save Button */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {hasChanges && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--primary-green)',
                animation: 'pulse 2s infinite'
              }}></div>
              Unsaved changes
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {hasChanges && (
            <button
              onClick={() => {
                setPreferences(originalPreferences);
              }}
              className="btn btn-secondary"
              disabled={saving}
            >
              Cancel Changes
            </button>
          )}
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={saving || !hasChanges}
            style={{ 
              minWidth: '150px',
              background: hasChanges 
                ? 'linear-gradient(135deg, var(--primary-green), var(--primary-green-light))'
                : undefined
            }}
          >
            {saving ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                Saving...
              </div>
            ) : (
              <>💾 Save Preferences</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Preferences;
