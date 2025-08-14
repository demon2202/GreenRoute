import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './components/Login';
import Layout from './components/Layout';
import RoutePlanner from './pages/RoutePlanner';
import TripHistory from './pages/TripHistory';
import Preferences from './pages/Preferences';
import Settings from './pages/Settings';
import './index.css';
axios.defaults.baseURL = 'http://localhost:5000';
axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get('/api/auth/current_user');
      setUser(response.data);
      if (response.data?.theme) {
        setTheme(response.data.theme);
      }
    } catch (error) {
      console.log('User not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    if (userData.theme) {
      setTheme(userData.theme);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.get('/api/auth/logout');
      setUser(null);
      setTheme('light');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateTheme = async (newTheme) => {
    try {
      await axios.post('/api/theme', { theme: newTheme });
      setTheme(newTheme);
    } catch (error) {
      console.error('Theme update error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className={theme}>
      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
            } 
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
                    <Route path="/history" element={<TripHistory user={user} />} />
                    <Route path="/preferences" element={<Preferences user={user} />} />
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
