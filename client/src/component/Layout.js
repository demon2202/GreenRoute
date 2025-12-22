import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Layout.css'; // We'll create this separate CSS file

const Layout = ({ children, user, onLogout, theme, onThemeChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [carbonData, setCarbonData] = useState({ today: 0, month: 0, goal: 60, progress: 0 });
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCarbonData();
  }, [location]);

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

      // Get user's monthly goal
      try {
        const prefsResponse = await axios.get('/api/preferences');
        const monthlyGoal = prefsResponse.data.monthlyGoal || 60;
        const progress = monthlyGoal > 0 ? Math.min((monthCarbon / monthlyGoal) * 100, 100) : 0;
        
        setCarbonData({
          today: todayCarbon,
          month: monthCarbon,
          goal: monthlyGoal,
          progress: progress
        });
      } catch (error) {
        setCarbonData({
          today: todayCarbon,
          month: monthCarbon,
          goal: 60,
          progress: Math.min((monthCarbon / 60) * 100, 100)
        });
      }
    } catch (error) {
      console.error('Error fetching carbon data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    closeSidebar();
    try {
      await onLogout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    return location.pathname.startsWith(path) && path !== '/';
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Route Planner';
      case '/history':
        return 'Trip History';
      case '/preferences':
        return 'Preferences';
      case '/settings':
        return 'Settings';
      default:
        return 'GreenRoute';
    }
  };

  const navigationItems = [
    {
      path: '/',
      icon: '🗺️',
      label: 'Route Planner',
      description: 'Plan your next eco-friendly journey'
    },
    {
      path: '/history',
      icon: '📊',
      label: 'Trip History',
      description: 'View your sustainable travel impact'
    },
    {
      path: '/preferences',
      icon: '⚙️',
      label: 'Preferences',
      description: 'Customize your travel settings'
    }
  ];

  return (
    <div className={`app-layout ${theme}`}>
      {/* Mobile Header */}
      <div className="mobile-header">
        <button 
          className="hamburger-btn"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        
        <div className="mobile-title">
          <span>🌱</span>
          <h1>{getPageTitle()}</h1>
        </div>
        
        <div className="mobile-user">
          {user.image ? (
            <img src={user.image} alt="Profile" className="mobile-avatar" />
          ) : (
            <div className="mobile-avatar-fallback">
              {user.displayName?.charAt(0) || 'U'}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Clean Logo Header */}
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo" onClick={closeSidebar}>
            <div className="logo-container">
              <div className="logo-icon">🌱</div>
              <div className="logo-text">
                <span className="logo-title">GreenRoute</span>
                <span className="logo-subtitle">Sustainable Travel</span>
              </div>
            </div>
          </Link>
          
          <button 
            className="sidebar-close-btn"
            onClick={closeSidebar}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Compact User Profile */}
        <div className="user-section">
          <div className="user-profile">
            <div className="user-avatar">
              {user.image ? (
                <img src={user.image} alt="Profile" />
              ) : (
                <div className="avatar-fallback">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="user-details">
              <div className="user-name">{user.displayName || 'User'}</div>
              <div className="user-badge">
                🌱 {carbonData.month.toFixed(1)}kg saved this month
              </div>
            </div>
          </div>
        </div>

        {/* Clean Navigation */}
        <nav className="navigation">
          <div className="nav-menu">
            {navigationItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <div className="nav-icon">{item.icon}</div>
                <div className="nav-content">
                  <div className="nav-label">{item.label}</div>
                  <div className="nav-description">{item.description}</div>
                </div>
                {isActive(item.path) && <div className="nav-indicator"></div>}
              </Link>
            ))}
          </div>
        </nav>

        {/* Compact Progress Widget */}
        <div className="progress-widget">
          <div className="progress-header">
            <span className="progress-title">Monthly Goal</span>
            <span className="progress-value">{carbonData.progress.toFixed(0)}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${Math.min(carbonData.progress, 100)}%` }}
            ></div>
          </div>
          <div className="progress-text">
            {carbonData.month.toFixed(1)} / {carbonData.goal} kg CO₂ saved
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="sidebar-footer">
          <Link 
            to="/settings" 
            className={`footer-item ${isActive('/settings') ? 'active' : ''}`}
            onClick={closeSidebar}
          >
            <span className="footer-icon">⚙️</span>
            <span className="footer-label">Settings</span>
          </Link>
          
          <button 
            onClick={handleLogout}
            className="logout-btn"
          >
            <span className="footer-icon">🚪</span>
            <span className="footer-label">Logout</span>
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
