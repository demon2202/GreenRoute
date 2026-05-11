import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Layout.css';

const NAV = [
  { path: '/',            icon: '🏠', label: 'Home',       desc: 'Dashboard overview'  },
  { path: '/plan',        icon: '🗺️', label: 'Plan Route', desc: 'Find eco journeys'   },
  { path: '/history',     icon: '📊', label: 'History',    desc: 'Your past trips'     },
  { path: '/preferences', icon: '❤️', label: 'Favourites', desc: 'Saved routes'        },
  { path: '/reports',     icon: '📈', label: 'Reports',    desc: 'Impact analytics'    },
];

const FOOTER_NAV = [
  { path: '/settings', icon: '⚙️', label: 'Settings' },
];

const ThemeToggle = ({ theme, onThemeChange }) => (
  <button
    className="footer-item"
    onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
    title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    style={{ border: 'none', cursor: 'pointer', width: '100%' }}
  >
    <span className="footer-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
    <span className="footer-label sidebar-text">
      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </span>
  </button>
);

const Layout = ({ children, user, onLogout, theme, onThemeChange }) => {
  const [open,   setOpen]   = useState(false);
  const [carbon, setCarbon] = useState({ month: 0, goal: 60, pct: 0 });
  const [hamOpen, setHamOpen] = useState(false);
  const location = useLocation();

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
        const d = new Date(t.date);
        if (d >= som) month += parseFloat(t.co2Saved) || 0;
      });
      setCarbon({
        month,
        goal,
        pct: Math.min((month / goal) * 100, 100),
      });
    } catch { /* silent */ }
  }, []); // ← empty deps is fine here, fetchCarbon doesn't use any state

  /* Fix 1: add fetchCarbon to deps */
  useEffect(() => {
    fetchCarbon();
  }, [location.pathname, fetchCarbon]);

  useEffect(() => {
    setOpen(false);
    setHamOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const close  = useCallback(() => { setOpen(false); setHamOpen(false); }, []);
  const toggle = useCallback(() => {
    setOpen(v => !v);
    setHamOpen(v => !v);
  }, []);

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
      '/':            'Home',
      '/plan':        'Plan Route',
      '/history':     'History',
      '/preferences': 'Favourites',
      '/reports':     'Reports',
      '/settings':    'Settings',
    };
    for (const [path, title] of Object.entries(map)) {
      if (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)) {
        return title;
      }
    }
    return 'GreenRoute';
  }, [location.pathname]);

  /* Fix 2: removed unused currentNavItem variable */

  return (
    <div className={`app-layout ${theme}`}>
      <div className="mobile-header">
        <button
          className={`hamburger-btn ${hamOpen ? 'open' : ''}`}
          onClick={toggle}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <span /><span /><span />
        </button>
        <div className="mobile-title">
          <div className="mobile-title-icon">🌱</div>
          <h1>{pageTitle()}</h1>
        </div>
        <div className="mobile-user">
          {user.image
            ? <img src={user.image} alt={user.displayName || 'User'} className="mobile-avatar" />
            : (
              <div className="mobile-avatar-fallback">
                {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )
          }
        </div>
      </div>

      <aside
        className={`sidebar ${open ? 'sidebar-open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo" onClick={close}>
            <span className="logo-icon">🌱</span>
            <div className="logo-text sidebar-text">
              <span className="logo-title">Green<span>Route</span></span>
              <span className="logo-subtitle">Eco Travel</span>
            </div>
          </Link>
          <button className="sidebar-close-btn" onClick={close} aria-label="Close sidebar">✕</button>
        </div>

        <div className="user-section">
          <div className="user-profile">
            <div className="user-avatar">
              {user.image
                ? <img src={user.image} alt={user.displayName || 'User'} />
                : (
                  <div className="avatar-fallback">
                    {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )
              }
            </div>
            <div className="user-details sidebar-text">
              <div className="user-name">{user.displayName || 'User'}</div>
              <div className="user-badge">🌱 {carbon.month.toFixed(1)} kg saved</div>
            </div>
            <div className="user-online" title="Active" />
          </div>
        </div>

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
                <span className="nav-icon">{item.icon}</span>
                <div className="nav-content sidebar-text">
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-description">{item.desc}</span>
                </div>
                <span className="nav-tooltip">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

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

        <div className="sidebar-footer">
          {FOOTER_NAV.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`footer-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={close}
              title={item.label}
            >
              <span className="footer-icon">{item.icon}</span>
              <span className="footer-label sidebar-text">{item.label}</span>
              <span className="nav-tooltip">{item.label}</span>
            </Link>
          ))}
          <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <span className="footer-icon">🚪</span>
            <span className="footer-label sidebar-text">Logout</span>
          </button>
        </div>
      </aside>

      {open && (
        <div className="sidebar-overlay" onClick={close} aria-hidden="true" />
      )}

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
