import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './components/Login';
import Layout from './components/Layout';
import StartupLoader from './components/StartupLoader';
import RoutePlanner from './pages/RoutePlanner';
import TripHistory from './pages/TripHistory';
import Preferences from './pages/Preferences';
import Settings from './pages/Settings';
import SavedPlaces from './pages/SavedPlaces';
import Leaderboard from './pages/Leaderboard';
import Territories from './pages/Territories';
import './index.css';

axios.defaults.baseURL = 'https://greenroute-backend-syxi.onrender.com';
axios.defaults.withCredentials = true;
// Generous timeout so the cold-start doesn't fail mid-request
axios.defaults.timeout = 60000;

function App() {
  // Phase 1: waiting for the backend to be alive (Render cold-start)
  const [serverReady, setServerReady] = useState(false);
  // Phase 2: checking if there's an existing session
  const [authChecked, setAuthChecked] = useState(false);

  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');

  /* ── Called by StartupLoader once the /health ping succeeds ── */
  const handleServerReady = useCallback(async () => {
    setServerReady(true);
    // Now check if the user already has a session
    try {
      const { data } = await axios.get('/api/auth/current_user');
      setUser(data);
      if (data?.theme) setTheme(data.theme);
    } catch {
      // Not logged in — that's fine
    } finally {
      setAuthChecked(true);
    }
  }, []);

  /* ── Auth handlers ── */
  const handleLogin = (userData) => {
    setUser(userData);
    if (userData?.theme) setTheme(userData.theme);
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch { /* ignore */ }
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

  /* ─── Phase 1: show animated loader until backend is warm ─── */
  if (!serverReady) {
    return <StartupLoader onReady={handleServerReady} />;
  }

  /* ─── Phase 2: keep showing the loader while we confirm session ─── */
  if (!authChecked) {
    return <StartupLoader onReady={() => { }} />;
  }

  /* ─── Phase 3: normal app ─── */
  return (
    <div className={theme}>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />}
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
                    <Route path="/leaderboard" element={<Leaderboard user={user} />} />
                    <Route path="/territory" element={<Territories user={user} theme={theme} />} />
                    <Route path="/history" element={<TripHistory user={user} />} />
                    <Route path="/preferences" element={<Preferences user={user} />} />
                    <Route path="/saved" element={<SavedPlaces user={user} />} />
                    <Route path="/settings" element={<Settings user={user} theme={theme} onThemeChange={updateTheme} />} />
                  </Routes>
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
