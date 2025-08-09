import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';

const Layout = ({ children, user, onLogout, theme, onThemeChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [carbonData, setCarbonData] = useState({ today: 0, month: 0 });
  const location = useLocation();

  useEffect(() => {
    fetchCarbonData();
  }, []);

  const fetchCarbonData = async () => {
    try {
      const response = await axios.get('/api/history');
      const trips = response.data;
      
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      let todayCarbon = 0;
      let monthCarbon = 0;
      
      trips.forEach(trip => {
        const tripDate = new Date(trip.date);
        const carbon = parseFloat(trip.co2Saved) || 0;
        
        if (tripDate.toDateString() === today.toDateString()) {
          todayCarbon += carbon;
        }
        
        if (tripDate >= startOfMonth) {
          monthCarbon += carbon;
        }
      });
      
      setCarbonData({
        today: todayCarbon,
        month: monthCarbon
      });
    } catch (error) {
      console.error('Error fetching carbon data:', error);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    closeSidebar();
    onLogout();
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    return location.pathname.startsWith(path) && path !== '/';
  };

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="hamburger-btn" onClick={toggleSidebar}>
          ☰
        </button>
        <div className="logo">
          <div className="logo-icon">🌱</div>
          <h1>GreenRoute</h1>
        </div>
        <div></div>
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="logo" onClick={closeSidebar}>
            <div className="logo-icon">🌱</div>
            <h1>GreenRoute</h1>
          </Link>
          <button className="hamburger-btn" onClick={closeSidebar}>
            ✕
          </button>
        </div>

        <div className="nav-section-title">Navigation</div>
        <nav className="nav-menu">
          <Link 
            to="/" 
            className={isActive('/') ? 'active' : ''}
            onClick={closeSidebar}
          >
            <span className="nav-icon">🗺️</span>
            <span>Route Planner</span>
          </Link>
          <Link 
            to="/history" 
            className={isActive('/history') ? 'active' : ''}
            onClick={closeSidebar}
          >
            <span className="nav-icon">📊</span>
            <span>Trip History</span>
          </Link>
          <Link 
            to="/preferences" 
            className={isActive('/preferences') ? 'active' : ''}
            onClick={closeSidebar}
          >
            <span className="nav-icon">⚙️</span>
            <span>Preferences</span>
          </Link>
        </nav>

        <div className="sidebar-card">
          <h3>
            <span className="nav-icon">🌱</span>
            Impact Today
          </h3>
          <div className="impact-value">
            {carbonData.today.toFixed(1)} kg
          </div>
          <p>vs. driving today</p>
        </div>

        <div className="account-section">
          <div className="user-profile">
            {user.image ? (
              <img src={user.image} alt="Profile" />
            ) : (
              <div className="user-avatar">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="user-info">
              <h4>{user.displayName || 'User'}</h4>
              <p>Making a difference</p>
            </div>
          </div>
          
          <div className="account-menu">
            <Link 
              to="/settings" 
              onClick={closeSidebar}
              className={isActive('/settings') ? 'active' : ''}
            >
              <span className="nav-icon">⚙️</span>
              <span>Settings</span>
            </Link>
            <button 
              onClick={handleLogout}
              className="logout"
              style={{ 
                background: 'none', 
                border: 'none', 
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                textAlign: 'left',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: 'var(--danger-red)',
                fontWeight: '500',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <span className="nav-icon">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="overlay" onClick={closeSidebar}></div>}

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;