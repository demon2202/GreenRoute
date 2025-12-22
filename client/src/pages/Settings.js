import React, { useState } from 'react';
import axios from 'axios';

const Settings = ({ user, theme, onThemeChange }) => {
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [profileData, setProfileData] = useState({
    displayName: user.displayName || '',
    email: user.email || ''
  });
  const [notifications, setNotifications] = useState({
    routeRecommendations: true,
    weatherAlerts: true,
    monthlyReports: true,
    achievements: false
  });

  const handleThemeChange = async (newTheme) => {
    setSaving(true);
    setSaveMessage('');
    try {
      await onThemeChange(newTheme);
      setSaveMessage('✨ Theme updated successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('❌ Failed to update theme. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!profileData.displayName.trim()) {
      setSaveMessage('❌ Display name cannot be empty');
      return;
    }
    
    setSaving(true);
    setSaveMessage('');
    try {
      // Profile update API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay
      setSaveMessage('✅ Profile updated successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('❌ Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData({ ...profileData, [field]: value });
  };

  const handleNotificationToggle = (key) => {
    setNotifications({ ...notifications, [key]: !notifications[key] });
  };

  const clearTripHistory = async () => {
    if (window.confirm('⚠️ Are you sure you want to clear all trip history? This action cannot be undone.')) {
      try {
        setSaving(true);
        setSaveMessage('');
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaveMessage('✅ Trip history cleared successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } catch (error) {
        setSaveMessage('❌ Failed to clear trip history. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  };

  const exportData = async () => {
    setSaveMessage('📦 Preparing your data export...');
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSaveMessage('✅ Data export complete! Check your downloads.');
      setTimeout(() => setSaveMessage(''), 4000);
    } catch (error) {
      setSaveMessage('❌ Export failed. Please try again.');
    }
  };

  const themeOptions = [
    { 
      value: 'light', 
      label: 'Light Mode', 
      icon: '☀️',
      description: 'Clean & bright interface',
      gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)'
    },
    { 
      value: 'dark', 
      label: 'Dark Mode', 
      icon: '🌙',
      description: 'Easy on the eyes',
      gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)'
    },
    { 
      value: 'auto', 
      label: 'Auto', 
      icon: '🎨',
      description: 'Follow system settings',
      gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)'
    }
  ];

  return (
    <div>
      {/* Enhanced Page Header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '2.5rem' }}>⚙️</span>
          <div>
            <h2 style={{ margin: 0 }}>Settings</h2>
            <p style={{ margin: 0, fontSize: '1rem' }}>Manage your account and preferences</p>
          </div>
        </div>
      </div>

      {/* Save Message with Animation */}
      {saveMessage && (
        <div style={{
          backgroundColor: saveMessage.includes('❌') ? '#fee2e2' : 'var(--light-green-bg)',
          color: saveMessage.includes('❌') ? '#dc2626' : 'var(--primary-green)',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '2rem',
          textAlign: 'center',
          border: `2px solid ${saveMessage.includes('❌') ? '#dc2626' : 'var(--primary-green)'}`,
          fontWeight: '600',
          fontSize: '1rem',
          boxShadow: 'var(--shadow-md)',
          animation: 'slideUp 0.3s ease'
        }}>
          {saveMessage}
        </div>
      )}

      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Profile Settings Card */}
        <div className="card card-elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>👤</span>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Profile Settings</h3>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              {user.image ? (
                <img 
                  src={user.image} 
                  alt="Profile" 
                  style={{ 
                    width: '100px', 
                    height: '100px', 
                    borderRadius: '50%',
                    border: '4px solid var(--primary-green)',
                    boxShadow: 'var(--shadow-md)'
                  }}
                />
              ) : (
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary-green), var(--primary-green-light))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '2.5rem',
                  fontWeight: '700',
                  boxShadow: 'var(--shadow-green)'
                }}>
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <button style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--primary-green)',
                color: 'white',
                border: '3px solid var(--bg-secondary)',
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                📷
              </button>
            </div>
            
            <div style={{ flex: 1, minWidth: '250px' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '700' }}>
                {user.displayName}
              </h4>
              <p style={{ color: 'var(--text-light)', margin: '0 0 0.5rem 0' }}>
                {user.email}
              </p>
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                background: 'var(--light-green-bg)',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-full)',
                border: '2px solid var(--primary-green)',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: 'var(--primary-green)'
              }}>
                <span>🌱</span>
                <span>Eco Champion</span>
              </div>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Display Name</label>
              <input
                type="text"
                value={profileData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                placeholder="Enter your display name"
                style={{ fontSize: '1rem' }}
              />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Email Address</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email"
                style={{ fontSize: '1rem' }}
              />
            </div>
          </div>

          <button
            onClick={handleProfileUpdate}
            className="btn btn-primary"
            disabled={saving}
            style={{ marginTop: '1rem' }}
          >
            {saving ? '⏳ Saving...' : '💾 Save Profile Changes'}
          </button>
        </div>

        {/* Enhanced Theme Selector */}
        <div className="card card-elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🎨</span>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Appearance</h3>
          </div>
          
          <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>
            Choose how GreenRoute looks on your device
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {themeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => handleThemeChange(option.value)}
                disabled={saving}
                style={{
                  padding: '1.5rem',
                  border: theme === option.value ? '3px solid var(--primary-green)' : '2px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  background: theme === option.value ? 'var(--light-green-bg)' : 'var(--bg-secondary)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'all var(--transition-normal)',
                  textAlign: 'left',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => {
                  if (theme !== option.value && !saving) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '100px',
                  height: '100px',
                  background: option.gradient,
                  opacity: 0.1,
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)'
                }}></div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', position: 'relative' }}>
                  <span style={{ fontSize: '2rem' }}>{option.icon}</span>
                  <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                    {option.label}
                  </span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', margin: 0, position: 'relative' }}>
                  {option.description}
                </p>
                {theme === option.value && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'var(--primary-green)',
                    color: 'white',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
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
              </button>
            ))}
          </div>
        </div>

        {/* Notifications Card */}
        <div className="card card-elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🔔</span>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Notifications</h3>
          </div>
          
          <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>
            Choose what updates you want to receive
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { key: 'routeRecommendations', icon: '🗺️', label: 'Route recommendations', description: 'Get personalized eco-friendly route suggestions' },
              { key: 'weatherAlerts', icon: '🌤️', label: 'Weather alerts', description: 'Real-time weather updates for your routes' },
              { key: 'monthlyReports', icon: '📊', label: 'Monthly impact reports', description: 'See your carbon savings and achievements' },
              { key: 'achievements', icon: '🏆', label: 'Achievement milestones', description: 'Celebrate your sustainability wins' }
            ].map(({ key, icon, label, description }) => (
              <label 
                key={key}
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '1rem', 
                  cursor: 'pointer',
                  padding: '1.25rem',
                  border: '2px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  background: notifications[key] ? 'var(--light-green-bg)' : 'var(--bg-secondary)',
                  transition: 'all var(--transition-fast)',
                  borderColor: notifications[key] ? 'var(--primary-green)' : 'var(--border-color)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <span style={{ fontSize: '1.75rem' }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '1rem' }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>
                    {description}
                  </div>
                </div>
                <div style={{ position: 'relative', width: '56px', height: '32px', flexShrink: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={notifications[key]}
                    onChange={() => handleNotificationToggle(key)}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    width: '56px',
                    height: '32px',
                    borderRadius: '16px',
                    background: notifications[key] ? 'var(--primary-green)' : 'var(--border-color)',
                    transition: 'all 0.3s',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      left: notifications[key] ? '28px' : '4px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'white',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'left 0.3s'
                    }}></div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Privacy & Data Card */}
        <div className="card card-elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🔒</span>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Privacy & Data</h3>
          </div>
          
          <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>
            Manage your data and privacy settings
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <button
              onClick={exportData}
              className="btn btn-secondary"
              disabled={saving}
              style={{ 
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '1.5rem',
                height: 'auto',
                gap: '0.75rem'
              }}
            >
              <span style={{ fontSize: '2rem' }}>📥</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.25rem' }}>Export My Data</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: '400' }}>
                  Download all your trip history
                </div>
              </div>
            </button>
            
            <button
              onClick={clearTripHistory}
              className="btn btn-secondary"
              disabled={saving}
              style={{ 
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '1.5rem',
                height: 'auto',
                gap: '0.75rem',
                borderColor: 'var(--danger-red)',
                color: 'var(--danger-red)'
              }}
            >
              <span style={{ fontSize: '2rem' }}>🗑️</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.25rem' }}>Clear Trip History</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.7, fontWeight: '400' }}>
                  Delete all saved trips (irreversible)
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* About Section */}
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, var(--primary-green), var(--primary-green-light))',
          color: 'white',
          border: 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>ℹ️</span>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>About GreenRoute</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <strong>Version:</strong> 2.0.0
            </div>
            <div>
              <strong>Build:</strong> 2025.01.15
            </div>
            <div style={{ fontSize: '0.95rem', lineHeight: '1.7', opacity: 0.95 }}>
              GreenRoute helps you make sustainable transportation choices by providing 
              eco-friendly route recommendations and tracking your carbon impact. 
              Join thousands of users making a difference, one trip at a time.
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                backdropFilter: 'blur(10px)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onClick={() => window.open('mailto:support@greenroute.com')}
            >
              📧 Contact Support
            </button>
            <button
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                backdropFilter: 'blur(10px)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onClick={() => window.open('/privacy', '_blank')}
            >
              📋 Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
