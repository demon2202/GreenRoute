import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Layout.css';

const Layout = ({ children, user, onLogout, theme, onThemeChange }) => {
  const [open,   setOpen]   = useState(false);
  const [carbon, setCarbon] = useState({ month: 0, goal: 60, pct: 0 });
  const location = useLocation();

  useEffect(() => { fetchCarbon(); }, [location.pathname]);

  const fetchCarbon = async () => {
    try {
      const [h, p] = await Promise.all([
        axios.get('/api/history'),
        axios.get('/api/preferences'),
      ]);
      const goal = p.data.monthlyGoal || 60;
      const now  = new Date();
      const som  = new Date(now.getFullYear(), now.getMonth(), 1);
      let m = 0;
      h.data.forEach(t => {
        const d = new Date(t.date);
        if (d >= som) m += parseFloat(t.co2Saved) || 0;
      });
      setCarbon({ month: m, goal, pct: Math.min((m / goal) * 100, 100) });
    } catch {}
  };

  const close  = () => setOpen(false);
  const toggle = () => setOpen(v => !v);

  const handleLogout = async () => {
    close();
    try { await onLogout(); } catch {}
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    return location.pathname.startsWith(path) && path !== '/';
  };

  const pageTitle = () => {
    const map = {
      '/':            'Route Planner',
      '/history':     'Trip History',
      '/preferences': 'Preferences',
      '/settings':    'Settings',
    };
    return map[location.pathname] || 'GreenRoute';
  };

  const NAV = [
    { path: '/',            icon: '🗺️', label: 'Route Planner', desc: 'Plan your eco journey' },
    { path: '/history',     icon: '📊', label: 'Trip History',  desc: 'Your impact over time'  },
    { path: '/preferences', icon: '⚙️', label: 'Preferences',  desc: 'Travel settings'         },
  ];

  return (
    <div className={`app-layout ${theme}`}>

      {/* ── Mobile header ── */}
      <div className="mobile-header">
        <button className="hamburger-btn" onClick={toggle} aria-label="Open menu">
          <span /><span /><span />
        </button>
        <div className="mobile-title">
          <span>🌱</span>
          <h1>{pageTitle()}</h1>
        </div>
        <div className="mobile-user">
          {user.image
            ? <img src={user.image} alt="Profile" className="mobile-avatar" />
            : <div className="mobile-avatar-fallback">{user.displayName?.charAt(0) || 'U'}</div>
          }
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div className={`sidebar ${open ? 'sidebar-open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo" onClick={close}>
            <span className="logo-icon">🌱</span>
            <div className="logo-text sidebar-text">
              <span className="logo-title">GreenRoute</span>
              <span className="logo-subtitle">Sustainable Travel</span>
            </div>
          </Link>
          <button className="sidebar-close-btn" onClick={close} aria-label="Close menu">✕</button>
        </div>

        {/* User */}
        <div className="user-section">
          <div className="user-profile">
            <div className="user-avatar">
              {user.image
                ? <img src={user.image} alt="Profile" />
                : <div className="avatar-fallback">{user.displayName?.charAt(0) || 'U'}</div>
              }
            </div>
            <div className="user-details sidebar-text">
              <div className="user-name">{user.displayName || 'User'}</div>
              <div className="user-badge">🌱 {carbon.month.toFixed(1)} kg saved</div>
            </div>
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
              >
                <span className="nav-icon">{item.icon}</span>
                <div className="nav-content sidebar-text">
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-description">{item.desc}</span>
                </div>
                {isActive(item.path) && <div className="nav-indicator sidebar-text" />}
                <span className="nav-tooltip">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Progress widget */}
        <div className="progress-widget">
          <div className="progress-header sidebar-text">
            <span className="progress-title">Monthly Goal</span>
            <span className="progress-value">{carbon.pct.toFixed(0)}%</span>
          </div>
          <div className="progress-bar sidebar-text">
            <div className="progress-fill" style={{ width: `${carbon.pct}%` }} />
          </div>
          <div className="progress-text sidebar-text">
            {carbon.month.toFixed(1)} / {carbon.goal} kg CO₂
          </div>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <Link
            to="/settings"
            className={`footer-item ${isActive('/settings') ? 'active' : ''}`}
            onClick={close}
            title="Settings"
          >
            <span className="footer-icon">⚙️</span>
            <span className="footer-label sidebar-text">Settings</span>
            <span className="nav-tooltip">Settings</span>
          </Link>

          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <span className="footer-icon">🚪</span>
            <span className="footer-label sidebar-text">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && <div className="sidebar-overlay" onClick={close} />}

      {/* Main */}
      <main className="main-content">{children}</main>
    </div>
  );
};

export default Layout;