import React, { useState } from 'react';
import axios from 'axios';
import { readMapStyle, setMapStyle } from '../mapTheme';

/* ── Minimalist SVG icons ── */
const Icon = ({ name, size = 20 }) => {
  const icons = {
    settings: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    user: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    palette: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
      </svg>
    ),
    bell: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    badge: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    route: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="19" r="3" />
        <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
        <circle cx="18" cy="5" r="3" />
      </svg>
    ),
    sun: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    ),
    chart: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    medal: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    ),
    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    star: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  };
  return icons[name] || null;
};

const Settings = ({ user, theme, onThemeChange }) => {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Map colours = USER map preference (separate from app light/dark theme).
  const [mapColour, setMapColour] = useState(() => readMapStyle() || 'normal');
  const chooseMapColour = async (v) => {
    setMapColour(v);
    await setMapStyle(v);
  };

  // Notification toggles state
  const [notifications, setNotifications] = useState({
    routes: true,
    weather: true,
    impact: true,
    achievements: false,
  });

  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await axios.put('/api/profile', { displayName, email });
      setMsg('Profile updated successfully!');
      setTimeout(() => setMsg(''), 3500);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to update profile');
      setTimeout(() => setMsg(''), 3500);
    } finally {
      setSaving(false);
    }
  };

  const initials = (user?.displayName || 'User')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="settings-page-wrapper">
      <div className="settings-container">
        {/* ── Top Header Banner Card matching Reference Image 3 ── */}
        <div className="settings-header-banner">
          <div className="banner-left">
            <div className="banner-icon-emblem">
              <Icon name="settings" size={24} />
            </div>
            <div className="banner-text">
              <div className="banner-eyebrow">
                <span className="eyebrow-star"><Icon name="star" size={12} /></span>
                <span>USER CONFIGURATION</span>
              </div>
              <h1 className="banner-title">Settings</h1>
              <p className="banner-subtitle">
                Manage your account identity, themes, and notification alerts.
              </p>
            </div>
          </div>

          <div className="banner-right">
            <div className="member-badge-pill">
              <Icon name="badge" size={16} />
              <span>Eco Champion Member</span>
            </div>
          </div>
        </div>

        {/* ── 2-Column Grid Layout ── */}
        <div className="settings-grid">
          {/* Left Column: Profile Card + Appearance Card */}
          <div className="settings-col left-col">
            {/* Card 1: Profile */}
            <div className="settings-card">
              <div className="card-header">
                <div className="card-icon-wrap">
                  <Icon name="user" size={18} />
                </div>
                <div>
                  <h2 className="card-title">Profile</h2>
                  <p className="card-subtitle">Your public identity on GreenRoute</p>
                </div>
              </div>

              {/* Avatar + Identity Row */}
              <div className="profile-identity-row">
                <div className="profile-avatar-container">
                  {user?.image ? (
                    <img src={user.image} alt={user.displayName} className="profile-avatar-img" />
                  ) : (
                    <div className="profile-avatar-fallback">{initials}</div>
                  )}
                  <div className="profile-check-badge">
                    <Icon name="check" size={12} />
                  </div>
                </div>

                <div className="profile-identity-info">
                  <div className="profile-name-text">{user?.displayName || (user?.email ? user.email.split('@')[0] : 'GreenRoute Explorer')}</div>
                  <div className="profile-email-text">{user?.email || 'Eco User'}</div>
                  <div className="profile-status-pill">
                    <span className="status-star"><Icon name="star" size={10} /></span>
                    <span>Eco Champion</span>
                  </div>
                </div>
              </div>

              {/* Form Inputs */}
              <form onSubmit={handleSaveProfile} className="profile-form">
                {msg && (
                  <div className={`form-msg ${msg.includes('success') ? 'success' : 'error'}`}>
                    {msg}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">DISPLAY NAME</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="form-input"
                    placeholder="Your name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    placeholder="Your email"
                  />
                </div>

                <button type="submit" disabled={saving} className="save-btn">
                  <span className="save-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                    </svg>
                  </span>
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </form>
            </div>

            {/* Card 2: Appearance */}
            <div className="settings-card">
              <div className="card-header">
                <div className="card-icon-wrap">
                  <Icon name="palette" size={18} />
                </div>
                <div>
                  <h2 className="card-title">Appearance</h2>
                  <p className="card-subtitle">Choose how GreenRoute looks on your device</p>
                </div>
              </div>

              <div className="theme-options-grid">
                {/* Light Mode Option */}
                <div
                  className={`theme-option-card ${theme === 'light' ? 'selected' : ''}`}
                  onClick={() => onThemeChange('light')}
                >
                  <div className="theme-preview-box light-preview">
                    <div className="preview-top-bar" />
                    <div className="preview-content-box" />
                  </div>
                  <div className="theme-option-info">
                    <div className="theme-name">
                      <span className="theme-icon">☼</span> Light
                    </div>
                    <div className="theme-desc">Clean & bright</div>
                  </div>
                </div>

                {/* Dark Mode Option */}
                <div
                  className={`theme-option-card ${theme === 'dark' ? 'selected' : ''}`}
                  onClick={() => onThemeChange('dark')}
                >
                  <div className="theme-preview-box dark-preview">
                    <div className="preview-top-bar dark" />
                    <div className="preview-content-box dark" />
                  </div>
                  <div className="theme-option-info">
                    <div className="theme-name">
                      <span className="theme-icon">☾</span> Dark
                    </div>
                    <div className="theme-desc">Easy on the eyes</div>
                  </div>
                </div>

                {/* System Option */}
                <div
                  className={`theme-option-card ${theme === 'auto' ? 'selected' : ''}`}
                  onClick={() => onThemeChange('auto')}
                >
                  <div className="theme-preview-box system-preview">
                    <div className="preview-half light" />
                    <div className="preview-half dark" />
                  </div>
                  <div className="theme-option-info">
                    <div className="theme-name">
                      <span className="theme-icon">⬒</span> System
                    </div>
                    <div className="theme-desc">Match OS setting</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="settings-card map-colours-card">
              <div className="card-header">
                <div className="card-icon-wrap">
                  <Icon name="route" size={18} />
                </div>
                <div>
                  <h2 className="card-title">Map colours</h2>
                  <p className="card-subtitle">Choose the map look everywhere (independent of light/dark mode)</p>
                </div>
              </div>

              <div className="theme-options-grid map-colour-grid">
                <div
                  className={`theme-option-card ${mapColour === 'normal' ? 'selected' : ''}`}
                  onClick={() => chooseMapColour('normal')}
                >
                  <div className="theme-preview-box map-preview normal" />
                  <div className="theme-option-info">
                    <div className="theme-name"><span className="theme-icon">◉</span> Standard colours</div>
                    <div className="theme-desc">Route-planner look</div>
                  </div>
                </div>
                <div
                  className={`theme-option-card ${mapColour === 'dark' ? 'selected' : ''}`}
                  onClick={() => chooseMapColour('dark')}
                >
                  <div className="theme-preview-box map-preview dark" />
                  <div className="theme-option-info">
                    <div className="theme-name"><span className="theme-icon">◉</span> Black</div>
                    <div className="theme-desc">Dark map look</div>
                  </div>
                </div>
              </div>
              <p className="map-colour-note">
                Until you choose, Route Planner and maps default to <b>Standard colours</b> and TERRA to <b>Black</b>.
                You can also switch inside TERRA from the map screen.
              </p>
            </div>
          </div>

          {/* Right Column: Notifications Card */}
          <div className="settings-col right-col">
            <div className="settings-card notifications-card">
              <div className="card-header">
                <div className="card-icon-wrap">
                  <Icon name="bell" size={18} />
                </div>
                <div>
                  <h2 className="card-title">Notifications</h2>
                  <p className="card-subtitle">Update preferences</p>
                </div>
              </div>

              <div className="toggle-items-list">
                {/* Item 1: Route Recommendations */}
                <div className="toggle-item-row">
                  <div className="toggle-item-icon green">
                    <Icon name="route" size={18} />
                  </div>
                  <div className="toggle-item-content">
                    <div className="toggle-item-title">Route recommendations</div>
                    <div className="toggle-item-desc">Personalised eco-friendly route suggestions.</div>
                  </div>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={notifications.routes}
                      onChange={() => toggleNotification('routes')}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>

                {/* Item 2: Weather Alerts */}
                <div className="toggle-item-row">
                  <div className="toggle-item-icon green">
                    <Icon name="sun" size={18} />
                  </div>
                  <div className="toggle-item-content">
                    <div className="toggle-item-title">Weather alerts</div>
                    <div className="toggle-item-desc">Real-time weather updates for your routes.</div>
                  </div>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={notifications.weather}
                      onChange={() => toggleNotification('weather')}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>

                {/* Item 3: Monthly Impact */}
                <div className="toggle-item-row">
                  <div className="toggle-item-icon green">
                    <Icon name="chart" size={18} />
                  </div>
                  <div className="toggle-item-content">
                    <div className="toggle-item-title">Monthly impact</div>
                    <div className="toggle-item-desc">Carbon savings and achievements summary.</div>
                  </div>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={notifications.impact}
                      onChange={() => toggleNotification('impact')}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>

                {/* Item 4: Achievement Milestones */}
                <div className="toggle-item-row">
                  <div className="toggle-item-icon amber">
                    <Icon name="medal" size={18} />
                  </div>
                  <div className="toggle-item-content">
                    <div className="toggle-item-title">Achievement milestones</div>
                    <div className="toggle-item-desc">Celebrate your sustainability wins.</div>
                  </div>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={notifications.achievements}
                      onChange={() => toggleNotification('achievements')}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .settings-page-wrapper {
          min-height: 100vh;
          background: var(--bg-primary, #FBF9F4);
          color: var(--text-primary, #1C281F);
          padding: 2.5rem;
          box-sizing: border-box;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .settings-container {
          max-width: 1060px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        /* ── Header Banner ── */
        .settings-header-banner {
          background: var(--bg-secondary, #FFFFFF);
          border: 1.5px solid var(--border-color, #EAE4DA);
          border-radius: 24px;
          padding: 1.75rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 18px rgba(28, 40, 31, 0.03);
          flex-wrap: wrap;
          gap: 1.25rem;
        }

        .banner-left {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .banner-icon-emblem {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: var(--primary-soft, #E8EFE9);
          color: var(--primary, #4A7C59);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .banner-text {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .banner-eyebrow {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #A16207;
          background: #FEF3C7;
          padding: 0.2rem 0.6rem;
          border-radius: 9999px;
          width: fit-content;
        }

        .eyebrow-star {
          display: flex;
          align-items: center;
        }

        .banner-title {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 2.2rem;
          font-weight: 700;
          color: var(--text-primary, #1C281F);
          margin: 0;
          line-height: 1.15;
        }

        .banner-subtitle {
          font-size: 0.92rem;
          color: var(--text-secondary, #5F7163);
          margin: 0;
        }

        .member-badge-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--primary, #4A7C59);
          color: #FFFFFF;
          font-size: 0.85rem;
          font-weight: 700;
          padding: 0.6rem 1.25rem;
          border-radius: 9999px;
          box-shadow: 0 4px 14px var(--primary-glow);
        }

        /* ── Grid Layout ── */
        .settings-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 1.75rem;
          align-items: start;
        }

        .settings-col {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .settings-card {
          background: var(--bg-secondary, #FFFFFF);
          border: 1.5px solid var(--border-color, #EAE4DA);
          border-radius: 24px;
          padding: 1.75rem;
          box-shadow: 0 4px 16px rgba(28, 40, 31, 0.03);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          margin-bottom: 1.5rem;
        }

        .card-icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: var(--primary-soft, #E8EFE9);
          color: var(--primary, #4A7C59);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .card-title {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text-primary, #1C281F);
          margin: 0;
          line-height: 1.2;
        }

        .card-subtitle {
          font-size: 0.85rem;
          color: var(--text-secondary, #5F7163);
          margin: 0;
        }

        /* ── Profile Identity Row ── */
        .profile-identity-row {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding-bottom: 1.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1.5px solid var(--border-color, #EAE4DA);
        }

        .profile-avatar-container {
          position: relative;
          width: 76px;
          height: 76px;
          flex-shrink: 0;
        }

        .profile-avatar-img {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid var(--primary, #4A7C59);
        }

        .profile-avatar-fallback {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary, #4A7C59), #7DAF87);
          color: #FFFFFF;
          font-size: 1.6rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px var(--primary-glow);
        }

        .profile-check-badge {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #22C55E;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2.5px solid var(--bg-secondary, #FFFFFF);
        }

        .profile-identity-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .profile-name-text {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--text-primary, #1C281F);
        }

        .profile-email-text {
          font-size: 0.88rem;
          color: var(--text-secondary, #5F7163);
        }

        .profile-status-pill {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: #EAF1EB;
          color: #2D5334;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.2rem 0.65rem;
          border-radius: 9999px;
          width: fit-content;
          margin-top: 0.2rem;
        }

        .status-star {
          display: flex;
          color: #4A7C59;
        }

        /* ── Profile Form ── */
        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }

        .form-msg {
          padding: 0.75rem 1rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .form-msg.success {
          background: #EAF1EB;
          color: #2D5334;
          border: 1px solid #A8C9AF;
        }

        .form-msg.error {
          background: #FEE2E2;
          color: #991B1B;
          border: 1px solid #FCA5A5;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-label {
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: var(--text-secondary, #5F7163);
          text-transform: uppercase;
        }

        .form-input {
          height: 48px;
          background: var(--bg-input, #F3EFE8);
          border: 1.5px solid var(--border-color, #EAE4DA);
          border-radius: 14px;
          padding: 0 1.15rem;
          font-family: inherit;
          font-size: 0.92rem;
          font-weight: 600;
          color: var(--text-primary, #1C281F);
          outline: none;
          transition: border-color 0.2s ease;
        }

        .form-input:focus {
          border-color: var(--primary, #4A7C59);
        }

        .save-btn {
          margin-top: 0.5rem;
          height: 44px;
          border-radius: 9999px;
          border: none;
          background: var(--primary, #4A7C59);
          color: #FFFFFF;
          font-family: inherit;
          font-size: 0.9rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px var(--primary-glow);
          width: fit-content;
          padding: 0 1.5rem;
        }

        .save-btn:hover {
          background: var(--primary-hover, #3B6647);
          transform: translateY(-1px);
        }

        /* ── Theme Options Grid ── */
        .theme-options-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.85rem;
        }

        .theme-option-card {
          border: 2px solid var(--border-color, #EAE4DA);
          border-radius: 16px;
          padding: 0.85rem;
          background: var(--bg-input, #F3EFE8);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          transition: all 0.2s ease;
        }

        .theme-option-card:hover {
          border-color: var(--primary, #4A7C59);
        }

        .theme-option-card.selected {
          border-color: var(--primary, #4A7C59);
          background: var(--bg-secondary, #FFFFFF);
          box-shadow: 0 4px 14px rgba(74, 124, 89, 0.12);
        }

        .theme-preview-box {
          height: 70px;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid var(--border-color, #EAE4DA);
          display: flex;
          flex-direction: column;
        }

        .theme-preview-box.light-preview {
          background: #FBF9F4;
        }

        .preview-top-bar {
          height: 14px;
          background: #EAE4DA;
          width: 50%;
          border-radius: 4px;
          margin: 8px 8px 6px;
        }

        .preview-content-box {
          flex: 1;
          background: #FFFFFF;
          border: 1px solid #EAE4DA;
          border-radius: 6px;
          margin: 0 8px 8px;
        }

        .theme-preview-box.dark-preview {
          background: #111714;
        }

        .preview-top-bar.dark {
          background: #24342A;
        }

        .preview-content-box.dark {
          background: #17211C;
          border: 1px solid #24342A;
        }

        .theme-preview-box.system-preview {
          flex-direction: row;
        }

        .preview-half {
          flex: 1;
          height: 100%;
        }

        .preview-half.light {
          background: #FBF9F4;
        }

        .preview-half.dark {
          background: #111714;
        }

        .theme-option-info {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .theme-name {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary, #1C281F);
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .theme-desc {
          font-size: 0.75rem;
          color: var(--text-secondary, #5F7163);
        }

        /* ── Notifications Column ── */
        .toggle-items-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .toggle-item-row {
          background: var(--bg-input, #F3EFE8);
          border: 1px solid var(--border-color, #EAE4DA);
          border-radius: 16px;
          padding: 1.15rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .toggle-item-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .toggle-item-icon.green {
          background: #EAF1EB;
          color: #4A7C59;
        }

        .toggle-item-icon.amber {
          background: #FEF3C7;
          color: #D97706;
        }

        .toggle-item-content {
          flex: 1;
          min-width: 0;
        }

        .toggle-item-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--text-primary, #1C281F);
          margin-bottom: 0.15rem;
        }

        .toggle-item-desc {
          font-size: 0.78rem;
          color: var(--text-secondary, #5F7163);
          line-height: 1.35;
        }

        /* Switch Slider */
        .switch-control {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
        }

        .switch-control input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .switch-slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #D1D5DB;
          transition: .25s;
          border-radius: 24px;
        }

        .switch-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .25s;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        input:checked + .switch-slider {
          background-color: var(--primary, #4A7C59);
        }

        input:checked + .switch-slider:before {
          transform: translateX(20px);
        }

        @media (max-width: 900px) {
          .settings-page-wrapper {
            padding: 1.25rem 1rem;
          }
          .settings-grid {
            grid-template-columns: 1fr;
          }
          .theme-options-grid {
            grid-template-columns: 1fr;
          }
        }
        .map-preview.normal {
          background:
            radial-gradient(200% 120% at 20% 0%, rgba(120,183,240,0.85) 0%, rgba(120,183,240,0.35) 30%, transparent 55%),
            radial-gradient(150% 100% at 80% 20%, rgba(246,211,101,0.8) 0%, rgba(246,211,101,0.3) 35%, transparent 60%),
            linear-gradient(180deg, #eef2ea 0%, #cfe0cf 60%, #9fc4a5 100%);
        }
        .map-preview.normal::after {
          content: ""; position: absolute; left: 14%; right: 16%; top: 42%; height: 16%;
          border-radius: 40%; border: 2px solid #e2571c; transform: rotate(6deg); opacity: .9;
        }
        .map-preview.dark {
          background:
            radial-gradient(120% 100% at 30% 0%, rgba(70,110,84,0.35), transparent 60%),
            repeating-linear-gradient(0deg, transparent 0 12px, rgba(255,255,255,0.04) 12px 13px),
            repeating-linear-gradient(90deg, transparent 0 12px, rgba(255,255,255,0.04) 12px 13px),
            linear-gradient(180deg, #18221b 0%, #0b110c 100%);
        }
        .map-preview.dark::after {
          content: ""; position: absolute; left: 14%; right: 16%; top: 42%; height: 16%;
          border-radius: 40%; border: 2px solid #ff8a3c; transform: rotate(6deg); opacity: .95;
        }
        .map-colour-note { margin: 14px 2px 0; font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; }
      `}</style>
    </div>
  );
};

export default Settings;