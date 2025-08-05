import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { IoLeafOutline } from 'react-icons/io5';
import { loginWithEmail } from '../services/api';
import { AuthContext } from '../App';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { setAuth } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleGoogleLogin = () => window.location.href = 'http://localhost:5000/api/auth/google';

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const { data } = await loginWithEmail({ email, password });
            setAuth(data);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <IoLeafOutline size={40} style={{ color: 'var(--primary-green)', marginBottom: '1rem' }} />
                <h2>Welcome back to GreenRoute</h2>
                <p>Sign in to continue</p>
                
                <button className="btn google-btn" onClick={handleGoogleLogin}>
                    <FcGoogle size={22} /> Continue with Google
                </button>

                <div className="divider">OR</div>
                
                {error && <p style={{color: 'var(--danger-red)', fontWeight: 500}}>{error}</p>}

                <form onSubmit={handleEmailLogin}>
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="submit" className="btn btn-primary">Sign In</button>
                </form>

                <p style={{ fontSize: '0.9rem', color: 'var(--light-text)', marginTop: '2rem' }}>
                    Need an account? <Link to="/signup" style={{ color: 'var(--primary-green)', fontWeight: '600', textDecoration: 'none' }}>Sign up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;