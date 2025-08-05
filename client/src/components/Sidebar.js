import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    IoLeaf,
    IoMapOutline,
    IoTimeOutline,
    IoSettingsOutline,
    IoFlashOutline,
    IoMoonOutline,
    IoSunnyOutline,
    IoLogOutOutline,
    IoReorderTwoOutline,
    IoInformationCircleOutline,
    IoOptionsOutline
} from 'react-icons/io5';

const Sidebar = ({ user, theme, setTheme, isOpen, setIsOpen, openAboutModal }) => {

    const handleLogout = () => {
        window.location.href = 'http://localhost:5000/api/auth/logout';
    };

    const handleThemeToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const handleMenuClick = () => {
        if (window.innerWidth <= 768) {
            setIsOpen(false);
        }
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <NavLink to="/" className="logo" onClick={handleMenuClick}>
                    <IoLeaf className="logo-icon" />
                    <h1 className="sidebar-text">GreenRoute</h1>
                </NavLink>
                <button 
                    className="hamburger-btn" 
                    onClick={() => setIsOpen(!isOpen)}
                    style={{ display: window.innerWidth > 768 ? 'none' : 'block' }}
                >
                    <IoReorderTwoOutline />
                </button>
            </div>

            <nav className="nav-menu">
                <p className="nav-section-title sidebar-text">Navigation</p>
                <NavLink 
                    to="/planner" 
                    onClick={handleMenuClick}
                    className={({ isActive }) => isActive ? 'active' : ''}
                >
                    <IoMapOutline className="nav-icon" />
                    <span className="sidebar-text">Route Planner</span>
                </NavLink>
                <NavLink 
                    to="/history" 
                    onClick={handleMenuClick}
                    className={({ isActive }) => isActive ? 'active' : ''}
                >
                    <IoTimeOutline className="nav-icon" />
                    <span className="sidebar-text">Trip History</span>
                </NavLink>
                <NavLink 
                    to="/preferences" 
                    onClick={handleMenuClick}
                    className={({ isActive }) => isActive ? 'active' : ''}
                >
                    <IoOptionsOutline className="nav-icon" />
                    <span className="sidebar-text">Preferences</span>
                </NavLink>
            </nav>

            <div className="sidebar-card">
                <h3>
                    <IoFlashOutline /> 
                    <span className="sidebar-text">IMPACT TODAY</span>
                </h3>
                <div className="impact-value sidebar-text">2.3 kg</div>
                <p className="sidebar-text">Carbon Saved vs. driving</p>
            </div>

            <div className="account-section">
                <div className="user-profile">
                    {user?.image ? (
                        <img 
                            src={user.image} 
                            alt={user.displayName || 'User'} 
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                    ) : null}
                    <div 
                        className="user-avatar" 
                        style={{ 
                            display: user?.image ? 'none' : 'flex' 
                        }}
                    >
                        {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="user-info sidebar-text">
                        <h4>{user?.displayName || 'User'}</h4>
                        <p>Eco Commuter</p>
                    </div>
                </div>

                <div className="account-menu">
                    <NavLink 
                        to="/settings" 
                        onClick={handleMenuClick}
                        className={({ isActive }) => isActive ? 'active' : ''}
                    >
                        <IoSettingsOutline className="nav-icon" />
                        <span className="sidebar-text">Settings</span>
                    </NavLink>
                    
                    <a 
                        href="#" 
                        onClick={handleThemeToggle}
                        className="theme-toggle"
                    >
                        {theme === 'light' ? <IoMoonOutline className="nav-icon" /> : <IoSunnyOutline className="nav-icon" />}
                        <span className="sidebar-text">
                            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                        </span>
                    </a>
                    
                    <a 
                        href="#" 
                        onClick={(e) => {
                            e.preventDefault();
                            openAboutModal();
                            handleMenuClick();
                        }}
                    >
                        <IoInformationCircleOutline className="nav-icon" />
                        <span className="sidebar-text">About</span>
                    </a>
                    
                    <a 
                        href="#" 
                        onClick={(e) => {
                            e.preventDefault();
                            handleLogout();
                        }} 
                        className="logout"
                    >
                        <IoLogOutOutline className="nav-icon" />
                        <span className="sidebar-text">Sign Out</span>
                    </a>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;