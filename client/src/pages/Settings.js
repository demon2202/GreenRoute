import React, { useContext } from 'react';
import { AuthContext } from '../App';
import { IoPersonCircleOutline, IoKeypadOutline, IoLogOutOutline } from 'react-icons/io5';

const Settings = () => {
    const { auth } = useContext(AuthContext);

    const handleSignOut = () => {
        window.location.href = 'http://localhost:5000/api/auth/logout';
    };

    return (
        <div>
            <div className="page-header">
                <h2>Account Settings</h2>
                <p>Manage your profile and security information.</p>
            </div>

            <div className="card settings-card">
                <section className="settings-section">
                    <h3><IoPersonCircleOutline /> Profile Information</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Full Name</label>
                            <input type="text" defaultValue={auth?.displayName} />
                        </div>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input type="email" defaultValue={auth?.email} readOnly style={{ cursor: 'not-allowed', backgroundColor: '#e9ecef' }}/>
                        </div>
                    </div>
                </section>

                <section className="settings-section">
                    <h3><IoKeypadOutline /> Security</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Current Password</label>
                            <input type="password" placeholder="Enter current password" />
                        </div>
                        <div className="form-group">
                            <label>New Password</label>
                            <input type="password" placeholder="Enter new password" />
                        </div>
                    </div>
                </section>
                
                <div className="settings-actions">
                    <button onClick={handleSignOut} className="btn-secondary">
                        <IoLogOutOutline /> Sign Out
                    </button>
                    <button className="btn-primary">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default Settings;