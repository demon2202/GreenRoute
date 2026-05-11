import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({ displayName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (isSignUp && !formData.displayName.trim()) errs.displayName = 'Display name is required';
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Enter a valid email';
    if (!formData.password.trim()) errs.password = 'Password is required';
    else if (isSignUp && formData.password.length < 6) errs.password = 'Minimum 6 characters';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
      const { data } = await axios.post(endpoint, formData);
      if (data) onLogin(data);
    } catch (err) {
      setErrors({ general: err.response?.data?.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  const toggle = () => {
    setIsSignUp(v => !v);
    setFormData({ displayName: '', email: '', password: '' });
    setErrors({});
  };

  return (
    <div className="login-page">
      {/* ── Hero side ── */}
      <div className="login-hero">
        <div className="hero-bg-pattern" />
        <div className="hero-content">
          <div className="hero-logo">
            <span className="hero-logo-icon">🌱</span>
            <span className="hero-logo-name">GreenRoute</span>
          </div>

          <h2 className="hero-headline">
            Travel Smarter,<br />
            <span>Save the Planet</span>
          </h2>
          <p className="hero-sub">
            Find the most eco-friendly routes for your daily commute.
            Reduce emissions, save money, and track your impact.
          </p>

          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">2.4t</span>
              <span className="hero-stat-label">CO₂ Saved</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">12k+</span>
              <span className="hero-stat-label">Green Trips</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">98%</span>
              <span className="hero-stat-label">Happy Users</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form side ── */}
      <div className="login-form-side">
        <div className="login-card">
          <div className="login-card-header">
            <h2>{isSignUp ? 'Create account' : 'Welcome back'}</h2>
            <p>{isSignUp ? 'Join thousands of eco-conscious commuters' : 'Sign in to continue your green journey'}</p>
          </div>

          {errors.general && (
            <div className="error-banner">
              <span>⚠️</span>
              {errors.general}
            </div>
          )}

          {/* Google */}
          <button type="button" className="google-btn" onClick={handleGoogleLogin}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="divider"><span>or</span></div>

          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="form-field">
                <label htmlFor="displayName">Display Name</label>
                <input
                  id="displayName"
                  type="text"
                  name="displayName"
                  placeholder="John Doe"
                  value={formData.displayName}
                  onChange={handleChange}
                  style={errors.displayName ? { borderColor: 'var(--danger-red)' } : {}}
                  autoComplete="name"
                />
                {errors.displayName && <div className="field-error">⚠ {errors.displayName}</div>}
              </div>
            )}

            <div className="form-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                style={errors.email ? { borderColor: 'var(--danger-red)' } : {}}
                autoComplete="email"
              />
              {errors.email && <div className="field-error">⚠ {errors.email}</div>}
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
                value={formData.password}
                onChange={handleChange}
                style={errors.password ? { borderColor: 'var(--danger-red)' } : {}}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
              {errors.password && <div className="field-error">⚠ {errors.password}</div>}
            </div>

            <div style={{ marginTop: '8px' }}>
              <button
                type="submit"
                className="btn btn-primary btn-lg btn-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span style={{
                      display: 'inline-block',
                      width: 16, height: 16,
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                    Please wait…
                  </>
                ) : (
                  isSignUp ? '🌱 Create Account' : '→ Sign In'
                )}
              </button>
            </div>
          </form>

          <div className="form-toggle">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button type="button" onClick={toggle}>
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
