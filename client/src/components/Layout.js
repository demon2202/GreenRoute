import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Layout.css';

/* ── SVG icon set — no emoji ───────────────────────────────────────── */
const Icon = ({ name, size = 18 }) => {
  const icons = {
    map: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
        <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
      </svg>
    ),
    history: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="12 8 12 12 14 14"/>
        <path d="M3.05 11a9 9 0 1 0 .5-4.5"/>
        <polyline points="3 3 3 9 9 9"/>
      </svg>
    ),
    sliders: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
        <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
        <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
        <line x1="17" y1="16" x2="23" y2="16"/>
      </svg>
    ),
    settings: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
    logout: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    ),
    sun: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    ),
    moon: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    ),
    bookmark: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    award: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6"/>
        <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
      </svg>
    ),
    globe: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
  };
  return icons[name] || null;
};

/* ── Nav items — fixed routes matching App.js ──────────────────────── */
const NAV = [
  { path: '/',            icon: 'map',      label: 'Plan Route',   desc: 'Find eco journeys'   },
  { path: '/leaderboard', icon: 'award',    label: 'Leaderboard',  desc: 'Compete with others' },
  { path: '/territory',   icon: 'globe',    label: 'Territories',  desc: 'Capture territory'   },
  { path: '/history',     icon: 'history',  label: 'History',      desc: 'Your past trips'     },
  { path: '/saved',       icon: 'bookmark', label: 'Saved Places', desc: 'Your favourite spots' },
  { path: '/preferences', icon: 'sliders',  label: 'Preferences',  desc: 'Customise your ride' },
];

const FOOTER_NAV = [
  { path: '/settings', icon: 'settings', label: 'Settings' },
];

/* ── Theme toggle ──────────────────────────────────────────────────── */
const ThemeToggle = ({ theme, onThemeChange }) => (
  <button
    className="footer-item"
    onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    style={{ border: 'none', cursor: 'pointer', width: '100%' }}
  >
    <span className="footer-icon"><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></span>
    <span className="footer-label sidebar-text">
      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </span>
  </button>
);

/* ── Main Layout ───────────────────────────────────────────────────── */
const Layout = ({ children, user, onLogout, theme, onThemeChange }) => {
  const [open,    setOpen]    = useState(false);
  const [carbon,  setCarbon]  = useState({ month: 0, goal: 60, pct: 0 });
  const [hamOpen, setHamOpen] = useState(false);
  const location = useLocation();

  /* Only fetch carbon data on pages where it's relevant */
  const fetchCarbon = useCallback(async () => {
    try {
      const [hRes, pRes] = await Promise.all([
        axios.get('/api/history'),
        axios.get('/api/preferences'),
      ]);
      const goal = pRes.data.monthlyGoal || 60;
      const now  = new Date();
      const som  = new Date(now.getFullYear(), now.getMonth(), 1);
      let month  = 0;
      hRes.data.forEach(t => {
        if (new Date(t.date) >= som) month += parseFloat(t.co2Saved) || 0;
      });
      setCarbon({ month, goal, pct: Math.min((month / goal) * 100, 100) });
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchCarbon();
    // Only re-fetch on history/preferences pages — not every route change
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setOpen(false);
    setHamOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const close  = useCallback(() => { setOpen(false); setHamOpen(false); }, []);
  const toggle = useCallback(() => { setOpen(v => !v); setHamOpen(v => !v); }, []);

  const handleLogout = useCallback(async () => {
    close();
    try { await onLogout(); } catch { /* silent */ }
  }, [close, onLogout]);

  const isActive = useCallback((path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const pageTitle = useCallback(() => {
    const map = {
      '/':            'Plan Route',
      '/leaderboard': 'Leaderboard',
      '/territory':   'Territories',
      '/history':     'History',
      '/saved':       'Saved Places',
      '/preferences': 'Preferences',
      '/settings':    'Settings',
    };
    for (const [path, title] of Object.entries(map)) {
      if (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)) {
        return title;
      }
    }
    return 'GreenRoute';
  }, [location.pathname]);

  return (
    <div className={`app-layout ${theme}`}>
      {/* ── Mobile header ── */}
      <div className="mobile-header">
        <button
          className={`hamburger-btn ${hamOpen ? 'open' : ''}`}
          onClick={toggle}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <span /><span /><span />
        </button>
        <div className="mobile-title"><h1>{pageTitle()}</h1></div>
        <div className="mobile-user">
          {user.image
            ? <img src={user.image} alt={user.displayName || 'User'} className="mobile-avatar" />
            : <div className="mobile-avatar-fallback">{user.displayName?.charAt(0)?.toUpperCase() || 'U'}</div>
          }
        </div>
      </div>

      {/* ── Sidebar ── */}
      <aside
        className={`sidebar ${open ? 'sidebar-open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo" onClick={close}>
            <div className="logo-mark" />
            <div className="logo-text sidebar-text">
              <span className="logo-title">Green<span>Route</span></span>
              <span className="logo-subtitle">Eco Travel</span>
            </div>
          </Link>
          <button className="sidebar-close-btn" onClick={close} aria-label="Close sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* User section */}
        <div className="user-section">
          <div className="user-profile">
            <div className="user-avatar">
              {user.image
                ? <img src={user.image} alt={user.displayName || 'User'} />
                : <div className="avatar-fallback">{user.displayName?.charAt(0)?.toUpperCase() || 'U'}</div>
              }
            </div>
            <div className="user-details sidebar-text">
              <div className="user-name">{user.displayName || 'User'}</div>
              <div className="user-badge">{carbon.month.toFixed(1)} kg saved</div>
            </div>
            <div className="user-online" title="Active" />
          </div>
        </div>

        {/* Nav */}
        <nav className="navigation">
          <div className="nav-section-label sidebar-text">Navigation</div>
          <div className="nav-menu">
            {NAV.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={close}
                title={item.label}
                aria-current={isActive(item.path) ? 'page' : undefined}
              >
                <span className="nav-icon"><Icon name={item.icon} /></span>
                <div className="nav-content sidebar-text">
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-description">{item.desc}</span>
                </div>
                <span className="nav-tooltip">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Monthly goal progress */}
        <div className="progress-widget">
          <div className="pw-content sidebar-text">
            <div className="pw-header">
              <span className="pw-label">Monthly Goal</span>
              <span className="pw-pct">{carbon.pct.toFixed(0)}%</span>
            </div>
            <div className="pw-bar-track">
              <div
                className="pw-bar-fill"
                style={{ width: `${carbon.pct}%` }}
                role="progressbar"
                aria-valuenow={carbon.pct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <div className="pw-values">
              <span className="pw-saved">{carbon.month.toFixed(1)} kg CO₂</span>
              <span className="pw-goal">Goal: {carbon.goal} kg</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          {FOOTER_NAV.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`footer-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={close}
              title={item.label}
            >
              <span className="footer-icon"><Icon name={item.icon} /></span>
              <span className="footer-label sidebar-text">{item.label}</span>
              <span className="nav-tooltip">{item.label}</span>
            </Link>
          ))}
          <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
          <button className="logout-btn" onClick={handleLogout} title="Sign out">
            <span className="footer-icon"><Icon name="logout" /></span>
            <span className="footer-label sidebar-text">Sign Out</span>
          </button>
        </div>
      </aside>

      {open && <div className="sidebar-overlay" onClick={close} aria-hidden="true" />}

      <main className="main-content">{children}</main>
    </div>
  );
};

export default Layout;