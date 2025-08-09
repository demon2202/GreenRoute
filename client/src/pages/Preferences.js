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

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await axios.get('/api/preferences');
      setPreferences({ ...preferences, ...response.data });
    } catch (error) {
      console.error('Error fetching preferences:', error);
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
      setSaveMessage('Preferences saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveMessage('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const transportModeOptions = [
    { id: 'Walking', icon: '🚶', label: 'Walking' },
    { id: 'Cycling', icon: '🚴', label: 'Cycling' },
    { id: 'Public Transit', icon: '🚌', label: 'Public Transit' },
    { id: 'Mixed Routes', icon: '🔄', label: 'Mixed Routes' }
  ];

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem' }}>Loading preferences...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h2>Your Preferences</h2>
        <p>Customize your sustainable commuting experience</p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div style={{
          backgroundColor: saveMessage.includes('success') ? 'var(--light-green-bg)' : '#fee2e2',
          color: saveMessage.includes('success') ? 'var(--primary-green)' : '#dc2626',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          {saveMessage}
        </div>
      )}

      {/* Transport Preferences */}
      <div className="card preference-section">
        <h3>🚗 Transport Preferences</h3>
        
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
                <span>{option.label}</span>
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
                padding: '0.9rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                backgroundColor: 'var(--input-bg)',
                fontFamily: 'Be Vietnam Pro, sans-serif',
                fontSize: '1rem'
              }}
            >
              <option value="Eco First">Eco First</option>
              <option value="Balanced">Balanced</option>
              <option value="Speed First">Speed First</option>
            </select>
          </div>

          <div className="form-group">
            <label>Weather Sensitivity</label>
            <select
              value={preferences.weatherSensitivity}
              onChange={(e) => handleInputChange('weatherSensitivity', e.target.value)}
              style={{
                width: '100%',
                padding: '0.9rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                backgroundColor: 'var(--input-bg)',
                fontFamily: 'Be Vietnam Pro, sans-serif',
                fontSize: '1rem'
              }}
            >
              <option value="Low">Low</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Distance Limits */}
      <div className="card preference-section">
        <h3>📍 Distance Limits</h3>
        
        <div className="form-grid">
          <div className="form-group">
            <label>Max Walking Distance (km)</label>
            <input
              type="number"
              min="1"
              max="20"
              value={preferences.maxWalkingDistance}
              onChange={(e) => handleInputChange('maxWalkingDistance', parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Max Cycling Distance (km)</label>
            <input
              type="number"
              min="1"
              max="50"
              value={preferences.maxCyclingDistance}
              onChange={(e) => handleInputChange('maxCyclingDistance', parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Goals & Locations */}
      <div className="card preference-section">
        <h3>🎯 Goals & Locations</h3>
        
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label>Monthly Carbon Savings Goal (kg)</label>
          <input
            type="number"
            min="10"
            max="500"
            value={preferences.monthlyGoal}
            onChange={(e) => handleInputChange('monthlyGoal', parseInt(e.target.value))}
          />
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Home Address</label>
            <input
              type="text"
              placeholder="123 Eco Street, Green District"
              value={preferences.homeAddress}
              onChange={(e) => handleInputChange('homeAddress', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Work Address</label>
            <input
              type="text"
              placeholder="456 Innovation Avenue, Tech Park"
              value={preferences.workAddress}
              onChange={(e) => handleInputChange('workAddress', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="save-prefs-btn">
        <button
          onClick={handleSave}
          className="btn btn-primary"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default Preferences;import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await axios.get('/api/preferences');
      setPreferences({ ...preferences, ...response.data });
    } catch (error) {
      console.error('Error fetching preferences:', error);
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
      setSaveMessage('Preferences saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveMessage('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const transportModeOptions = [
    { id: 'Walking', icon: '🚶', label: 'Walking' },
    { id: 'Cycling', icon: '🚴', label: 'Cycling' },
    { id: 'Public Transit', icon: '🚌', label: 'Public Transit' },
    { id: 'Mixed Routes', icon: '🔄', label: 'Mixed Routes' }
  ];

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem' }}>Loading preferences...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h2>Your Preferences</h2>
        <p>Customize your sustainable commuting experience</p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div style={{
          backgroundColor: saveMessage.includes('success') ? 'var(--light-green-bg)' : '#fee2e2',
          color: saveMessage.includes('success') ? 'var(--primary-green)' : '#dc2626',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          {saveMessage}
        </div>
      )}

      {/* Transport Preferences */}
      <div className="card preference-section">
        <h3>🚗 Transport Preferences</h3>
        
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
                <span>{option.label}</span>
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
                padding: '0.9rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                backgroundColor: 'var(--input-bg)',
                fontFamily: 'Be Vietnam Pro, sans-serif',
                fontSize: '1rem'
              }}
            >
              <option value="Eco First">Eco First</option>
              <option value="Balanced">Balanced</option>
              <option value="Speed First">Speed First</option>
            </select>
          </div>

          <div className="form-group">
            <label>Weather Sensitivity</label>
            <select
              value={preferences.weatherSensitivity}
              onChange={(e) => handleInputChange('weatherSensitivity', e.target.value)}
              style={{
                width: '100%',
                padding: '0.9rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                backgroundColor: 'var(--input-bg)',
                fontFamily: 'Be Vietnam Pro, sans-serif',
                fontSize: '1rem'
              }}
            >
              <option value="Low">Low</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Distance Limits */}
      <div className="card preference-section">
        <h3>📍 Distance Limits</h3>
        
        <div className="form-grid">
          <div className="form-group">
            <label>Max Walking Distance (km)</label>
            <input
              type="number"
              min="1"
              max="20"
              value={preferences.maxWalkingDistance}
              onChange={(e) => handleInputChange('maxWalkingDistance', parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Max Cycling Distance (km)</label>
            <input
              type="number"
              min="1"
              max="50"
              value={preferences.maxCyclingDistance}
              onChange={(e) => handleInputChange('maxCyclingDistance', parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Goals & Locations */}
      <div className="card preference-section">
        <h3>🎯 Goals & Locations</h3>
        
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label>Monthly Carbon Savings Goal (kg)</label>
          <input
            type="number"
            min="10"
            max="500"
            value={preferences.monthlyGoal}
            onChange={(e) => handleInputChange('monthlyGoal', parseInt(e.target.value))}
          />
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Home Address</label>
            <input
              type="text"
              placeholder="123 Eco Street, Green District"
              value={preferences.homeAddress}
              onChange={(e) => handleInputChange('homeAddress', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Work Address</label>
            <input
              type="text"
              placeholder="456 Innovation Avenue, Tech Park"
              value={preferences.workAddress}
              onChange={(e) => handleInputChange('workAddress', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="save-prefs-btn">
        <button
          onClick={handleSave}
          className="btn btn-primary"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default Preferences;
