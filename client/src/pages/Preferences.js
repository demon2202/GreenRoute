import React, { useState } from 'react';
import { IoWalk, IoBicycle, IoBus, IoGitNetwork, IoTrendingUp, IoPin, IoBody } from 'react-icons/io5';

const Preferences = () => {
    const [selectedModes, setSelectedModes] = useState(['Walking', 'Cycling', 'Public Transit']);
    const [sustainabilityPriority, setSustainabilityPriority] = useState('Eco First');
    const [weatherSensitivity, setWeatherSensitivity] = useState('Moderate');
    const [maxWalking, setMaxWalking] = useState(3);
    const [maxCycling, setMaxCycling] = useState(15);
    const [monthlyGoal, setMonthlyGoal] = useState(60);
    const [homeAddress, setHomeAddress] = useState('123 Eco Street, Green District');
    const [workAddress, setWorkAddress] = useState('456 Innovation Avenue, Tech Park');

    const toggleMode = (mode) => {
        if (selectedModes.includes(mode)) {
            setSelectedModes(selectedModes.filter(m => m !== mode));
        } else {
            setSelectedModes([...selectedModes, mode]);
        }
    };

    const handleSavePreferences = () => {
        // Here you would typically save to your backend
        alert('Preferences saved successfully!');
    };

    return (
        <div>
            <div className="page-header">
                <h2>Your Preferences</h2>
                <p>Customize your sustainable commuting experience</p>
            </div>
            
            <div className="card">
                <section className="preference-section">
                    <h3><IoGitNetwork style={{color: 'var(--primary-green)'}}/> Transport Preferences</h3>
                    <p style={{color: 'var(--text-light)', marginTop: '-1rem', marginBottom: '1.5rem'}}>
                        Preferred Transport Modes
                    </p>
                    <div className="transport-options">
                        <div 
                            className={`transport-option ${selectedModes.includes('Walking') ? 'selected' : ''}`} 
                            onClick={() => toggleMode('Walking')}
                        >
                            <IoWalk className="icon"/>
                            <span>Walking</span>
                        </div>
                        <div 
                            className={`transport-option ${selectedModes.includes('Cycling') ? 'selected' : ''}`} 
                            onClick={() => toggleMode('Cycling')}
                        >
                            <IoBicycle className="icon"/>
                            <span>Cycling</span>
                        </div>
                        <div 
                            className={`transport-option ${selectedModes.includes('Public Transit') ? 'selected' : ''}`} 
                            onClick={() => toggleMode('Public Transit')}
                        >
                            <IoBus className="icon"/>
                            <span>Public Transit</span>
                        </div>
                        <div className={`transport-option disabled`}>
                            <IoGitNetwork className="icon"/>
                            <span>Mixed Routes</span>
                        </div>
                    </div>

                    <div className="form-grid" style={{marginTop: '2rem'}}>
                        <div className="form-group">
                            <label>Sustainability Priority</label>
                            <select 
                                value={sustainabilityPriority} 
                                onChange={(e) => setSustainabilityPriority(e.target.value)}
                                style={{
                                    padding: '0.9rem',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--input-bg)',
                                    fontFamily: 'Be Vietnam Pro, sans-serif',
                                    fontSize: '1rem'
                                }}
                            >
                                <option value="Eco First">Eco First</option>
                                <option value="Balanced">Balanced</option>
                                <option value="Speed First">Speed First</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Weather Sensitivity</label>
                            <select 
                                value={weatherSensitivity} 
                                onChange={(e) => setWeatherSensitivity(e.target.value)}
                                style={{
                                    padding: '0.9rem',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--input-bg)',
                                    fontFamily: 'Be Vietnam Pro, sans-serif',
                                    fontSize: '1rem'
                                }}
                            >
                                <option value="Low">Low</option>
                                <option value="Moderate">Moderate</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                    </div>
                </section>

                <section className="preference-section">
                    <h3><IoBody style={{color: 'var(--primary-green)'}}/> Distance Limits</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Max Walking Distance (km)</label>
                            <input 
                                type="number" 
                                value={maxWalking}
                                onChange={(e) => setMaxWalking(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Max Cycling Distance (km)</label>
                            <input 
                                type="number" 
                                value={maxCycling}
                                onChange={(e) => setMaxCycling(e.target.value)}
                            />
                        </div>
                    </div>
                </section>

                <section className="preference-section">
                    <h3><IoTrendingUp style={{color: 'var(--primary-green)'}}/> Goals & Locations</h3>
                     <div className="form-grid">
                        <div className="form-group">
                            <label>Monthly Carbon Savings Goal (kg)</label>
                            <input 
                                type="number" 
                                value={monthlyGoal}
                                onChange={(e) => setMonthlyGoal(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Home Address</label>
                            <input 
                                type="text" 
                                value={homeAddress}
                                onChange={(e) => setHomeAddress(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Work Address</label>
                            <input 
                                type="text" 
                                value={workAddress}
                                onChange={(e) => setWorkAddress(e.target.value)}
                            />
                        </div>
                    </div>
                </section>
                
                <div className="save-prefs-btn">
                    <button className="btn btn-primary" onClick={handleSavePreferences}>
                        Save Preferences
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Preferences;