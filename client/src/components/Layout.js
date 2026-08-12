import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Layout.css';

/* ── Minimalist SVG icons matching the reference designs ── */
const Icon = ({ name, size = 20 }) => {
  const icons = {
    // Route icon (winding road / path)
    route: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="19" r="3" />
        <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
        <circle cx="18" cy="5" r="3" />
      </svg>
    ),
    // Leaderboard icon (podium / bar chart)
    leaderboard: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
        <path d="M3 20h18" />
      </svg>
    ),
    // Territory Empire icon (folded map)
    territory: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
        <line x1="9" y1="3" x2="9" y2="18" />
        <line x1="15" y1="6" x2="15" y2="21" />
      </svg>
    ),
    // History icon (counter-clockwise clock / journey trail)
    history: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    // Saved Places icon
    saved: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
    ),
    // Preferences icon (tuning sliders)
    preferences: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
    // Plus icon
    plus: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    // Settings icon
    settings: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    // Logout icon
    logout: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
    // Sun icon
    sun: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
    // Moon icon
    moon: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
    // Leaf Monogram
    leaf: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    ),
  };
  return icons[name] || null;
};

const NAV_ITEMS = [
  { path: '/', icon: 'route', label: 'Route Engine' },
  { path: '/leaderboard', icon: 'leaderboard', label: 'Leaderboards' },
  { path: '/territory', icon: 'territory', label: 'Territory Empire' },
  { path: '/history', icon: 'history', label: 'Trip History' },
  { path: '/saved', icon: 'saved', label: 'Saved Places' },
  { path: '/preferences', icon: 'preferences', label: 'Preferences' },
];

const Layout = ({ children, user, onLogout, theme, onThemeChange }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = useCallback((path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const initials = (user?.displayName || 'User')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={`app-layout ${theme}`}>
      {/* ── Sidebar (Slim / Expandable Rail) ── */}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-inner">
          {/* Top Brand Header */}
          <div className="sidebar-top">
            <Link to="/" className="brand-link" title="GreenRoute">
              <div className="brand-emblem">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary, #4A7C59)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" fill="var(--primary, #4A7C59)" fillOpacity="0.2" />
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" stroke="var(--primary, #4A7C59)" strokeWidth="2.4" />
                </svg>
              </div>
              <div className="brand-text sidebar-expand-only">
                <div className="brand-name">GreenRoute</div>
                <div className="brand-tag">Eco Navigation</div>
              </div>
            </Link>
          </div>

          {/* Quick Action Button (+ New Trip) */}
          <div className="sidebar-action-wrap">
            <button
              className="new-trip-btn"
              onClick={() => navigate('/')}
              title="Plan New Trip"
            >
              <span className="new-trip-icon"><Icon name="plus" size={18} /></span>
              <span className="new-trip-text sidebar-expand-only">New Trip</span>
            </button>
          </div>

          {/* Primary Navigation Menu */}
          <nav className="sidebar-nav">
            <div className="nav-list">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-link ${active ? 'active' : ''}`}
                    title={item.label}
                  >
                    <div className="nav-icon-wrap">
                      <Icon name={item.icon} size={20} />
                    </div>
                    <span className="nav-label sidebar-expand-only">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Bottom Controls / Footer */}
          <div className="sidebar-bottom">
            {/* Theme Toggle */}
            <button
              className="bottom-link theme-toggle-btn"
              onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <div className="bottom-icon-wrap">
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
              </div>
              <span className="bottom-label sidebar-expand-only">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>

            {/* Logout */}
            <button
              className="bottom-link logout-btn"
              onClick={onLogout}
              title="Sign Out"
            >
              <div className="bottom-icon-wrap">
                <Icon name="logout" size={20} />
              </div>
              <span className="bottom-label sidebar-expand-only">Logout</span>
            </button>

            {/* User Profile Pill at Bottom */}
            <div className="sidebar-user-pill">
              <Link to="/settings" className="user-pill-link" title={user?.displayName || 'Profile'}>
                <div className="user-avatar-wrap">
                  {user?.image ? (
                    <img src={user.image} alt={user.displayName || 'User'} className="user-img" />
                  ) : (
                    <div className="avatar-fallback">{initials}</div>
                  )}
                  <span className="user-status-dot" />
                </div>
                <div className="user-info-text sidebar-expand-only">
                  <div className="user-display-name">{user?.displayName || 'Explorer'}</div>
                  <div className="user-role-label">Eco Explorer</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content Area */}
      <main className="main-content-viewport">
        {/* ── Mobile Top Header ── */}
        <header className="mobile-header">
          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle navigation menu"
          >
            <span className="ham-bar" />
            <span className="ham-bar" />
            <span className="ham-bar" />
          </button>

          <div className="mobile-brand">
            <div className="mobile-brand-emblem">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary, #4A7C59)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" fill="var(--primary, #4A7C59)" fillOpacity="0.16" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" stroke="var(--primary, #4A7C59)" strokeWidth="2.2" />
              </svg>
            </div>
            <span className="mobile-brand-title">GreenRoute</span>
          </div>

          <Link to="/settings" className="mobile-user-avatar">
            {user?.image ? (
              <img src={user.image} alt={user.displayName} />
            ) : (
              <div className="avatar-fallback-mini">{initials}</div>
            )}
          </Link>
        </header>

        {children}
      </main>
    </div>
  );
};

export default Layout;