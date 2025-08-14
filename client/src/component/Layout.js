import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';

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
      {/* Improved Sidebar */}
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

      <style jsx>{`
        /* Sidebar Styles */
        .sidebar {
          width: 280px;
          height: 100vh;
          background: var(--bg-sidebar);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 1000;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
        }

        .sidebar-open {
          transform: translateX(0);
        }

        /* Header */
        .sidebar-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sidebar-logo {
          text-decoration: none;
          color: inherit;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo-icon {
          font-size: 2rem;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }

        .logo-text {
          display: flex;
          flex-direction: column;
        }

        .logo-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
        }

        .logo-subtitle {
          font-size: 0.75rem;
          color: var(--text-light);
          font-weight: 500;
        }

        .sidebar-close-btn {
          display: none;
          background: none;
          border: none;
          font-size: 1.25rem;
          color: var(--text-light);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .sidebar-close-btn:hover {
          background: var(--border-color);
          color: var(--text-primary);
        }

        /* User Section */
        .user-section {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-avatar {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid var(--primary-green);
        }

        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-fallback {
          width: 100%;
          height: 100%;
          background: var(--primary-green);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 1.25rem;
        }

        .user-details {
          flex: 1;
          min-width: 0;
        }

        .user-name {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 1rem;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-badge {
          font-size: 0.8rem;
          color: var(--primary-green);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Navigation */
        .navigation {
          flex: 1;
          padding: 1rem 0;
          overflow-y: auto;
        }

        .nav-menu {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0 1rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          text-decoration: none;
          color: var(--text-secondary);
          border-radius: 12px;
          transition: all 0.2s ease;
          position: relative;
          margin-bottom: 0.25rem;
        }

        .nav-item:hover {
          background: var(--hover-bg);
          color: var(--text-primary);
          transform: translateX(4px);
        }

        .nav-item.active {
          background: var(--light-green-bg);
          color: var(--primary-green);
          font-weight: 600;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .nav-icon {
          font-size: 1.5rem;
          min-width: 24px;
          text-align: center;
        }

        .nav-content {
          flex: 1;
          min-width: 0;
        }

        .nav-label {
          display: block;
          font-weight: 600;
          font-size: 0.95rem;
          line-height: 1.2;
          margin-bottom: 0.125rem;
        }

        .nav-description {
          display: block;
          font-size: 0.8rem;
          color: var(--text-light);
          line-height: 1.3;
        }

        .nav-indicator {
          position: absolute;
          right: 0.75rem;
          width: 6px;
          height: 6px;
          background: var(--primary-green);
          border-radius: 50%;
        }

        /* Progress Widget */
        .progress-widget {
          margin: 1rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .progress-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .progress-value {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--primary-green);
        }

        .progress-bar {
          height: 6px;
          background: var(--border-color);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary-green), var(--primary-green-light));
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.75rem;
          color: var(--text-light);
          text-align: center;
        }

        /* Footer */
        .sidebar-footer {
          border-top: 1px solid var(--border-color);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .footer-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          text-decoration: none;
          color: var(--text-secondary);
          border-radius: 8px;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .footer-item:hover {
          background: var(--hover-bg);
          color: var(--text-primary);
        }

        .footer-item.active {
          background: var(--light-green-bg);
          color: var(--primary-green);
          font-weight: 600;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: none;
          border: none;
          color: var(--text-light);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
          width: 100%;
          text-align: left;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger-red);
        }

        .footer-icon {
          font-size: 1.125rem;
          min-width: 18px;
        }

        .footer-label {
          font-size: 0.9rem;
        }

        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .sidebar {
            width: 100%;
            max-width: 320px;
          }

          .sidebar-close-btn {
            display: block;
          }

          .logo-subtitle {
            display: none;
          }

          .nav-description {
            display: none;
          }

          .progress-widget {
            margin: 0.75rem;
            padding: 0.75rem;
          }
        }

        /* Overlay */
        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999;
          opacity: 0;
          animation: fadeIn 0.2s ease forwards;
        }

        @keyframes fadeIn {
          to { opacity: 1; }
        }

        /* Desktop Sidebar Always Visible */
        @media (min-width: 769px) {
          .sidebar {
            position: relative;
            transform: translateX(0);
          }

          .sidebar-overlay {
            display: none;
          }

          .mobile-header {
            display: none;
          }
        }

        /* App Layout */
        .app-layout {
          display: flex;
          min-height: 100vh;
        }

        .main-content {
          flex: 1;
          min-width: 0;
          background: var(--bg-primary);
        }

        @media (max-width: 768px) {
          .main-content {
            width: 100%;
            padding-top: 70px;
          }
        }

        /* Mobile Header */
        .mobile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: var(--bg-sidebar);
          border-bottom: 1px solid var(--border-color);
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 998;
          height: 70px;
        }

        .hamburger-btn {
          display: flex;
          flex-direction: column;
          gap: 3px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .hamburger-btn:hover {
          background: var(--hover-bg);
        }

        .hamburger-btn span {
          width: 20px;
          height: 2px;
          background: var(--text-primary);
          border-radius: 1px;
          transition: all 0.2s;
        }

        .mobile-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
          justify-content: center;
        }

        .mobile-title h1 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .mobile-user {
          width: 40px;
          height: 40px;
        }

        .mobile-avatar,
        .mobile-avatar-fallback {
          width: 100%;
          height: 100%;
          border-radius: 10px;
          overflow: hidden;
        }

        .mobile-avatar-fallback {
          background: var(--primary-green);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 1.125rem;
        }
      `}</style>
    </div>
  );
};

export default Layout;
