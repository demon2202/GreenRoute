import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Layout.css';

const NAV = [
  { path: '/',            icon: '🏠', label: 'Home',       desc: 'Dashboard'      },
  { path: '/history',     icon: '📊', label: 'History',    desc: 'Past trips'     },
  { path: '/preferences', icon: '❤️', label: 'Favourites', desc: 'Saved routes'   },
];

const ThemeToggle = ({ theme, onThemeChange }) => (
  <button
    className="footer-item theme-toggle"
    onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
    title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
  >
    <span className="footer-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
    <span className="footer-label sidebar-text">
      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </span>
  </button>
);

const Layout = ({ children, user, onLogout, theme, onThemeChange }) => {
  const [open,    setOpen]    = useState(false);
  const [hamOpen, setHamOpen] = useState(false);
  const [carbon,  setCarbon]  = useState({ month: 0, goal: 60, pct: 0 });
  const location = useLocation();

  const fetchCarbon = useCallback(async () => {
    try {
      const [hRes, pRes] = await Promise.all([
        axios.get('/api/history'),
        axios.get('/api/preferences'),
      ]);
      const goal = pRes.data.monthlyGoal || 60;
      const som  = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      let month  = 0;
      hRes.data.forEach(t => {
        if (new Date(t.date) >= som) month += parseFloat(t.co2Saved) || 0;
      });
      setCarbon({ month, goal, pct: Math.min((month / goal) * 100, 100) });
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchCarbon(); }, [location.pathname, fetchCarbon]);

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

  const isActive = useCallback((path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path),
  [location.pathname]);

  const pageTitle = () => {
    const map = {
      '/':            'Home',
      '/history':     'History',
      '/preferences': 'Favourites',
      '/settings':    'Settings',
    };
    for (const [path, title] of Object.entries(map)) {
      if (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path))
        return title;
    }
    return 'GreenRoute';
  };

  const initials = user.displayName?.charAt(0)?.toUpperCase() || 'U';

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

        <div className="mobile-brand">
          <span className="mobile-brand-icon">🌱</span>
          <span className="mobile-brand-name">{pageTitle()}</span>
        </div>

        <div className="mobile-avatar-wrap">
          {user.image
            ? <img src={user.image} alt={user.displayName || 'User'} className="mobile-avatar" />
            : <div className="mobile-avatar-fallback">{initials}</div>
          }
        </div>
      </div>

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`} aria-label="Main navigation">

        {/* Logo */}
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo" onClick={close}>
            <div className="logo-icon-wrap">
              <span className="logo-icon">🌱</span>
            </div>
            <div className="logo-text sidebar-text">
              <span className="logo-title">Green<em>Route</em></span>
              <span className="logo-sub">Eco Travel</span>
            </div>
          </Link>
          <button className="sidebar-close-btn" onClick={close} aria-label="Close">✕</button>
        </div>

        {/* User */}
        <div className="user-section">
          <div className="user-avatar-wrap">
            {user.image
              ? <img src={user.image} alt={user.displayName || 'User'} className="user-avatar-img" />
              : <div className="user-avatar-fallback">{initials}</div>
            }
            <div className="user-status" />
          </div>
          <div className="user-meta sidebar-text">
            <span className="user-name">{user.displayName || 'User'}</span>
            <span className="user-saved">🌿 {carbon.month.toFixed(1)} kg saved</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="nav-menu">
          <p className="nav-section-label sidebar-text">Menu</p>
          {NAV.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={close}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              <div className="nav-text sidebar-text">
                <span className="nav-label">{item.label}</span>
                <span className="nav-desc">{item.desc}</span>
              </div>
              {isActive(item.path) && <span className="nav-pip" />}
              <span className="nav-tooltip">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Progress */}
        <div className="progress-widget">
          <div className="pw-row sidebar-text">
            <span className="pw-label">Monthly Goal</span>
            <span className="pw-pct">{Math.round(carbon.pct)}%</span>
          </div>
          <div className="pw-track">
            <div
              className="pw-fill"
              style={{ width: `${carbon.pct}%` }}
              role="progressbar"
              aria-valuenow={carbon.pct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <div className="pw-foot sidebar-text">
            <span>{carbon.month.toFixed(1)} kg CO₂</span>
            <span>of {carbon.goal} kg</span>
          </div>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <Link
            to="/settings"
            className={`footer-item ${isActive('/settings') ? 'active' : ''}`}
            onClick={close}
          >
            <span className="footer-icon">⚙️</span>
            <span className="footer-label sidebar-text">Settings</span>
            <span className="nav-tooltip">Settings</span>
          </Link>

          <ThemeToggle theme={theme} onThemeChange={onThemeChange} />

          <button className="footer-item logout-btn" onClick={handleLogout}>
            <span className="footer-icon">🚪</span>
            <span className="footer-label sidebar-text">Logout</span>
          </button>
        </div>
      </aside>

      {open && <div className="sidebar-overlay" onClick={close} aria-hidden="true" />}

      <main className="main-content">{children}</main>
    </div>
  );
};

export default Layout;
