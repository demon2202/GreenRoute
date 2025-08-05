import React, { useContext, useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthContext } from '../App';
import { saveTheme } from '../services/api';
import Sidebar from '../components/Sidebar';
import RoutePlanner from '../pages/RoutePlanner';
import TripHistory from '../pages/TripHistory';
import Settings from '../pages/Settings';
import Preferences from '../pages/Preferences';
import AboutModal from '../components/AboutModal';
import { IoMenu, IoLeafOutline } from 'react-icons/io5';

const MainLayout = () => {
    const { auth } = useContext(AuthContext);
    const [theme, setTheme] = useState(auth?.theme || 'light');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isAboutModalOpen, setAboutModalOpen] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setSidebarOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleSetTheme = async (newTheme) => {
        setTheme(newTheme);
        try { 
            await saveTheme(newTheme); 
        } catch (error) { 
            console.error("Failed to save theme", error); 
        }
    };

    const handleOverlayClick = () => {
        setSidebarOpen(false);
    };

    return (
        <div className="app-layout">
            {/* Mobile Header */}
            <div className="mobile-header">
                <button 
                    className="hamburger-btn" 
                    onClick={() => setSidebarOpen(true)}
                >
                    <IoMenu />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <IoLeafOutline style={{ fontSize: '1.5rem', color: 'var(--primary-green)' }} />
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>GreenRoute</h2>
                </div>
                <div style={{ width: '40px' }}></div> {/* Spacer for center alignment */}
            </div>

            {/* Overlay for mobile */}
            {isSidebarOpen && <div className="overlay" onClick={handleOverlayClick}></div>}

            <Sidebar
                user={auth}
                theme={theme}
                setTheme={handleSetTheme}
                isOpen={isSidebarOpen}
                setIsOpen={setSidebarOpen}
                openAboutModal={() => setAboutModalOpen(true)}
            />
            
            <main className="main-content">
                <Routes>
                    <Route index element={<RoutePlanner />} />
                    <Route path="planner" element={<RoutePlanner />} />
                    <Route path="history" element={<TripHistory />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="preferences" element={<Preferences />} />
                </Routes>
            </main>

            <AboutModal 
                isOpen={isAboutModalOpen} 
                onClose={() => setAboutModalOpen(false)} 
            />
        </div>
    );
};

export default MainLayout;