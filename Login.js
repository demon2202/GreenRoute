import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear specific field error when user starts typing
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (isSignUp && !formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (isSignUp && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
      const response = await axios.post(endpoint, formData);
      
      if (response.data) {
        onLogin(response.data);
      }
    } catch (error) {
      console.error('Auth error:', error);
      if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: 'An error occurred. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setFormData({
      displayName: '',
      email: '',
      password: ''
    });
    setErrors({});
  };

  return (
    <div className="login-page">
      <div className="login-card card">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">🌱</div>
            <h1>GreenRoute</h1>
          </div>
        </div>
        
        <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
        <p>{isSignUp ? 'Join the sustainable commuting revolution' : 'Sign in to continue your green journey'}</p>

        {errors.general && (
          <div className="error-message" style={{ 
            color: 'var(--danger-red)', 
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {errors.general}
          </div>
        )}

        <button 
          type="button" 
          className="btn google-btn"
          onClick={handleGoogleLogin}
        >
          <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="divider">
          <span>or</span>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div>
              <input
                type="text"
                name="displayName"
                placeholder="Display Name"
                value={formData.displayName}
                onChange={handleChange}
                style={{ borderColor: errors.displayName ? 'var(--danger-red)' : '' }}
              />
              {errors.displayName && (
                <div style={{ color: 'var(--danger-red)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  {errors.displayName}
                </div>
              )}
            </div>
          )}
          
          <div>
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              style={{ borderColor: errors.email ? 'var(--danger-red)' : '' }}
            />
            {errors.email && (
              <div style={{ color: 'var(--danger-red)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                {errors.email}
              </div>
            )}
          </div>
          
          <div>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              style={{ borderColor: errors.password ? 'var(--danger-red)' : '' }}
            />
            {errors.password && (
              <div style={{ color: 'var(--danger-red)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                {errors.password}
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-light)' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={toggleMode}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-green)',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;