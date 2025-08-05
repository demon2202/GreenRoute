import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { fetchCurrentUser } from './services/api';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Settings from './pages/Settings'; // Import the new Settings page
import './index.css';

export const AuthContext = createContext();

function App() {
    const [auth, setAuth] = useState(null);

    useEffect(() => {
        const checkLoggedIn = async () => {
            try {
                const { data } = await fetchCurrentUser();
                setAuth(data || false);
            } catch (err) {
                setAuth(false);
            }
        };
        checkLoggedIn();
    }, []);

    if (auth === null) {
        return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', fontFamily: 'Be Vietnam Pro, sans-serif' }}>Loading Application...</div>;
    }

    return (
        <AuthContext.Provider value={{ auth, setAuth }}>
            <Router>
                <Routes>
                    <Route path="/login" element={!auth ? <Login /> : <Navigate to="/" />} />
                    <Route path="/signup" element={!auth ? <SignUp /> : <Navigate to="/" />} />
                    
                    {/* The MainLayout now handles all authenticated routes, including the new /settings page */}
                    <Route path="/*" element={auth ? <MainLayout /> : <Navigate to="/login" />} />
                </Routes>
            </Router>
        </AuthContext.Provider>
    );
}

export default App;