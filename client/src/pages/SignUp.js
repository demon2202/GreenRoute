import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IoLeafOutline } from 'react-icons/io5';
import { registerWithEmail } from '../services/api';
import { AuthContext } from '../App';

const SignUp = () => {
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { setAuth } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const { data } = await registerWithEmail({ displayName, email, password });
            setAuth(data);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Sign up failed. Please try again.');
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <IoLeafOutline size={40} style={{ color: 'var(--primary-green)', marginBottom: '1rem' }} />
                <h2>Create your GreenRoute Account</h2>
                <p>Start your sustainable journey today</p>
                
                {error && <p style={{color: 'var(--danger-red)', fontWeight: 500}}>{error}</p>}

                <form onSubmit={handleSignUp}>
                    <input type="text" placeholder="Full Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="submit" className="btn btn-primary">Create Account</button>
                </form>

                <p style={{ fontSize: '0.9rem', color: 'var(--light-text)', marginTop: '2rem' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--primary-green)', fontWeight: '600', textDecoration: 'none' }}>Sign in</Link>
                </p>
            </div>
        </div>
    );
};

export default SignUp;