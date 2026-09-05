import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './components/Login';
import Layout from './components/Layout';
import StartupLoader from './components/StartupLoader';
import RoutePlanner from './pages/RoutePlanner';
import Terra from './pages/Terra';
import TripHistory from './pages/TripHistory';
import Preferences from './pages/Preferences';
import Settings from './pages/Settings';
import SavedPlaces from './pages/SavedPlaces';
import Leaderboard from './pages/Leaderboard';
import Territories from './pages/Territories';
import { clearAllCache } from './utils/cache';
import { seedMapStyleFromUser } from './mapTheme';
import './index.css';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
axios.defaults.baseURL = process.env.REACT_APP_API_URL || (isLocal ? 'http://localhost:5000' : 'https://greenroute-backend-syxi.onrender.com');
axios.defaults.withCredentials = true;
axios.defaults.timeout = 25000;

axios.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('gr_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch { /* ignore storage errors */ }
  return config;
}, (error) => Promise.reject(error));

function App() {
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');

  const handleInitComplete = useCallback((userData) => {
    if (userData) {
      setUser(userData);
      if (userData.token) {
        try { localStorage.setItem('gr_token', userData.token); } catch {}
      }
      if (userData.theme) setTheme(userData.theme);
      seedMapStyleFromUser(userData);
    }
    setInitialized(true);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    if (userData?.token) {
      try { localStorage.setItem('gr_token', userData.token); } catch {}
    }
    if (userData?.theme) setTheme(userData.theme);
    seedMapStyleFromUser(userData);
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch { /* ignore */ }
    try {
      localStorage.removeItem('gr_token');
    } catch {}
    clearAllCache();
    setUser(null);
    setTheme('light');
  };

  const updateTheme = async (newTheme) => {
    try {
      await axios.post('/api/theme', { theme: newTheme });
      setTheme(newTheme);
    } catch (err) {
      console.error('Theme update error:', err);
    }
  };

  if (!initialized) {
    return <StartupLoader onComplete={handleInitComplete} />;
  }

  return (
    <div className={theme}>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />}
          />
          <Route
            path="/*"
            element={
              user ? (
                <Layout
                  user={user}
                  onLogout={handleLogout}
                  theme={theme}
                  onThemeChange={updateTheme}
                >
                  <Routes>
                    <Route path="/" element={<RoutePlanner user={user} />} />
                    <Route path="/terra" element={<Terra user={user} />} />
                    <Route path="/leaderboard" element={<Leaderboard user={user} />} />
                    <Route path="/territory" element={<Territories user={user} theme={theme} />} />
                    <Route path="/history" element={<TripHistory user={user} />} />
                    <Route path="/preferences" element={<Preferences user={user} />} />
                    <Route path="/saved" element={<SavedPlaces user={user} />} />
                    <Route path="/settings" element={<Settings user={user} theme={theme} onThemeChange={updateTheme} />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
