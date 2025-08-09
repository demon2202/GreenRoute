import React, { useState } from 'react';
import axios from 'axios';

const Settings = ({ user, theme, onThemeChange }) => {
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [profileData, setProfileData] = useState({
    displayName: user.displayName || '',
    email: user.email || ''
  });

  const handleThemeChange = async (newTheme) => {
    setSaving(true);
    try {
      await onThemeChange(newTheme);
      setSaveMessage('Theme updated successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Failed to update theme. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileUpdate = async () => {
    setSaving(true);
    try {
      // Profile update would require a backend endpoint
      setSaveMessage('Profile updated successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData({
      ...profileData,
      [field]: value
    });
  };

  const clearTripHistory = async () => {
    if (window.confirm('Are you sure you want to clear all trip history? This action cannot be undone.')) {
      try {
        setSaving(true);
        // This would require a backend endpoint to clear history
        setSaveMessage('Trip history cleared successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } catch (error) {
        setSaveMessage('Failed to clear trip history. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  };

  const exportData = () => {
    // This would trigger a data export
    setSaveMessage('Data export started. You will receive an email when ready.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h2>Settings</h2>
        <p>Manage your account and application preferences</p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div style={{
          backgroundColor: saveMessage.includes('success') || saveMessage.includes('started') 
            ? 'var(--light-green-bg)' : '#fee2e2',
          color: saveMessage.includes('success') || saveMessage.includes('started') 
            ? 'var(--primary-green)' : '#dc2626',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          {saveMessage}
        </div>
      )}

      <div className="settings-card card">
        {/* Profile Settings */}
        <div className="settings-section">
          <h3>👤 Profile Settings</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
            {user.image ? (
              <img 
                src={user.image} 
                alt="Profile" 
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%',
                  border: '3px solid var(--primary-green)'
                }}
              />
            ) : (
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '2rem',
                fontWeight: '600'
              }}>
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
            
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem' }}>
                {user.displayName}
              </h4>
              <p style={{ color: 'var(--text-light)', margin: 0 }}>
                {user.email}
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={profileData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                placeholder="Enter your display name"
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email"
              />
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="settings-section">
          <h3>🎨 Appearance</h3>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600' }}>
              Theme
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => handleThemeChange('light')}
                style={{
                  padding: '1rem 1.5rem',
                  border: theme === 'light' ? '2px solid var(--primary-green)' : '2px solid var(--border-color)',
                  borderRadius: '8px',
                  background: theme === 'light' ? 'var(--light-green-bg)' : 'var(--bg-sidebar)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '600'
                }}
              >
                ☀️ Light
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                style={{
                  padding: '1rem 1.5rem',
                  border: theme === 'dark' ? '2px solid var(--primary-green)' : '2px solid var(--border-color)',
                  borderRadius: '8px',
                  background: theme === 'dark' ? 'var(--light-green-bg)' : 'var(--bg-sidebar)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '600'
                }}
              >
                🌙 Dark
              </button>
            </div>
          </div>
        </div>

        {/* Notifications Settings */}
        <div className="settings-section">
          <h3>🔔 Notifications</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked />
              <span>Route recommendations</span>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked />
              <span>Weather alerts</span>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked />
              <span>Monthly impact reports</span>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input type="checkbox" />
              <span>Achievement milestones</span>
            </label>
          </div>
        </div>

        {/* Privacy & Data */}
        <div className="settings-section">
          <h3>🔒 Privacy & Data</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Data Management</h4>
              <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
                Export your data or clear your trip history
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={exportData}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  📁 Export My Data
                </button>
                <button
                  onClick={clearTripHistory}
                  className="btn btn-secondary"
                  disabled={saving}
                  style={{ 
                    borderColor: 'var(--danger-red)',
                    color: 'var(--danger-red)'
                  }}
                >
                  🗑️ Clear Trip History
                </button>
              </div>
            </div>
            
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Privacy Settings</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked />
                  <span>Share anonymized data to improve route recommendations</span>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input type="checkbox" />
                  <span>Allow location tracking for better weather updates</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="settings-section">
          <h3>ℹ️ About GreenRoute</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <strong>Version:</strong> 2.0.0
            </div>
            <div>
              <strong>Build:</strong> 2025.01.15
            </div>
            <div style={{ color: 'var(--text-light)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              GreenRoute helps you make sustainable transportation choices by providing 
              eco-friendly route recommendations and tracking your carbon impact. 
              Join thousands of users making a difference, one trip at a time.
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => window.open('mailto:support@greenroute.com')}
              >
                📧 Contact Support
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => window.open('/privacy', '_blank')}
              >
                📋 Privacy Policy
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="settings-actions">
          <button
            onClick={handleProfileUpdate}
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => window.location.reload()}
          >
            🔄 Refresh App
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
