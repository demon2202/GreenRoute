import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Login = ({ onLogin }) => {
  const [mode, setMode]                 = useState('login');
  const [form, setForm]                 = useState({ displayName: '', email: '', password: '' });
  const [errors, setErrors]             = useState({});
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSignup = mode === 'signup';

  // Check if returning from Google OAuth redirect with ?code=...
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlCode = urlParams.get('code');

      if (urlCode) {
        window.history.replaceState({}, document.title, window.location.pathname);
        axios.post('/api/auth/exchange', { code: urlCode })
          .then(res => {
            if (res.data) {
              if (res.data.token) {
                try { localStorage.setItem('gr_token', res.data.token); } catch {}
              }
              onLogin(res.data);
            }
          })
          .catch(err => {
            console.error('Error exchanging OAuth code:', err);
            setErrors({ general: 'Google sign-in verification failed. Please try again.' });
          });
      }
    } catch (err) {
      console.warn('OAuth param error:', err);
    }
  }, [onLogin]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name])   setErrors(prev => ({ ...prev, [name]: '' }));
    if (errors.general) setErrors(prev => ({ ...prev, general: '' }));
  };

  const validate = () => {
    const errs = {};
    if (isSignup && !form.displayName.trim()) errs.displayName = 'Name is required';
    if (!form.email.trim())                   errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Please enter a valid email';
    if (!form.password.trim())                errs.password = 'Password is required';
    else if (isSignup && form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); return; }
    setLoading(true);
    setErrors({});
    try {
      const endpoint = isSignup ? '/api/auth/register' : '/api/auth/login';
      const { data } = await axios.post(endpoint, form);
      if (data) {
        if (data.token) {
          try { localStorage.setItem('gr_token', data.token); } catch {}
        }
        onLogin(data);
      }
    } catch (err) {
      const message = err.response?.data?.message ||
        `${isSignup ? 'Registration' : 'Login'} failed. Please try again.`;
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const base = axios.defaults.baseURL || 'https://greenroute-backend-syxi.onrender.com';
    window.location.href = `${base}/api/auth/google`;
  };

  const switchMode = (targetMode) => {
    setMode(targetMode);
    setForm({ displayName: '', email: '', password: '' });
    setErrors({});
    setShowPassword(false);
  };

  return (
    <div className="lp-container">
      {/* ── Desktop Left Hero Showcase ── */}
      <div className="lp-hero-col">
        <div className="lp-mesh-glow" />
        
        <div className="lp-hero-content">
          {/* Brand Header */}
          <div className="lp-hero-brand">
            <div className="lp-brand-emblem">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" fill="currentColor" fillOpacity="0.2" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" stroke="currentColor" strokeWidth="2.4" />
              </svg>
            </div>
            <span className="lp-brand-name">GreenRoute</span>
          </div>

          <h1 className="lp-hero-title">
            Travel Smarter.<br />
            <span className="lp-hero-serif">Breathe Cleaner.</span>
          </h1>

          <p className="lp-hero-desc">
            Discover carbon-optimized routes, protect real-world spatial territories, and quantify your active eco footprint.
          </p>

          {/* Telemetry Bento Grid */}
          <div className="lp-bento-grid">
            <div className="lp-bento-card">
              <div className="lp-bento-num">2.4<span className="lp-bento-unit">t</span></div>
              <div className="lp-bento-label">CO₂ OFFSET</div>
            </div>
            <div className="lp-bento-card">
              <div className="lp-bento-num">12k<span className="lp-bento-unit">+</span></div>
              <div className="lp-bento-label">ECO JOURNEYS</div>
            </div>
            <div className="lp-bento-card">
              <div className="lp-bento-num">98<span className="lp-bento-unit">%</span></div>
              <div className="lp-bento-label">EFFICIENCY</div>
            </div>
          </div>

          <div className="lp-hero-tags">
            <span className="lp-hero-tag">Zero-Emission Navigation</span>
            <span className="lp-hero-tag">Live Carbon Telemetry</span>
            <span className="lp-hero-tag">H3 Hex Territories</span>
          </div>
        </div>
      </div>

      {/* ── Form Panel (Zero-Scroll Mobile Optimized) ── */}
      <div className="lp-form-col">
        <div className="lp-double-bezel">
          <div className="lp-form-card">
            
            {/* Mobile-Only Brand Header */}
            <div className="lp-mobile-brand">
              <div className="lp-mobile-emblem">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" fill="currentColor" fillOpacity="0.2" />
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" stroke="currentColor" strokeWidth="2.4" />
                </svg>
              </div>
              <span className="lp-mobile-title">GreenRoute</span>
            </div>

            {/* Concentric Segmented Switcher */}
            <div className="lp-segment-control">
              <button
                type="button"
                className={`lp-segment-btn ${!isSignup ? 'active' : ''}`}
                onClick={() => switchMode('login')}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`lp-segment-btn ${isSignup ? 'active' : ''}`}
                onClick={() => switchMode('signup')}
              >
                Create Account
              </button>
            </div>

            {/* Error Banner */}
            {errors.general && (
              <div className="lp-error-banner">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errors.general}</span>
              </div>
            )}

            {/* Google 1-Tap Action */}
            <button
              type="button"
              className="lp-google-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="lp-separator">
              <span>or email credentials</span>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} noValidate className="lp-form">
              {isSignup && (
                <div className="lp-field-group">
                  <div className="lp-input-wrapper">
                    <span className="lp-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                    <input
                      name="displayName"
                      type="text"
                      className={`lp-input ${errors.displayName ? 'err' : ''}`}
                      placeholder="Full Name"
                      value={form.displayName}
                      onChange={handleChange}
                      autoComplete="name"
                      disabled={loading}
                    />
                  </div>
                  {errors.displayName && <span className="lp-field-err">{errors.displayName}</span>}
                </div>
              )}

              <div className="lp-field-group">
                <div className="lp-input-wrapper">
                  <span className="lp-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    name="email"
                    type="email"
                    className={`lp-input ${errors.email ? 'err' : ''}`}
                    placeholder="Email Address"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
                {errors.email && <span className="lp-field-err">{errors.email}</span>}
              </div>

              <div className="lp-field-group">
                <div className="lp-input-wrapper">
                  <span className="lp-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`lp-input ${errors.password ? 'err' : ''}`}
                    placeholder={isSignup ? 'Password (min. 8 characters)' : 'Password'}
                    value={form.password}
                    onChange={handleChange}
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="lp-eye-btn"
                    onClick={() => setShowPassword(v => !v)}
                    disabled={loading}
                    tabIndex="-1"
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && <span className="lp-field-err">{errors.password}</span>}
              </div>

              {/* Primary Submit Button (Button-in-Button) */}
              <button type="submit" className="lp-submit-btn" disabled={loading}>
                <span>{loading ? 'Authenticating...' : (isSignup ? 'Create Eco Account' : 'Sign In to GreenRoute')}</span>
                <div className="lp-submit-circle">
                  {loading ? (
                    <span className="lp-mini-spinner" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  )}
                </div>
              </button>
            </form>

            <div className="lp-card-footer">
              <span>{isSignup ? 'Already have an account?' : 'New to GreenRoute?'}</span>
              <button
                type="button"
                className="lp-switch-link"
                onClick={() => switchMode(isSignup ? 'login' : 'signup')}
                disabled={loading}
              >
                {isSignup ? 'Sign in' : 'Create an account'}
              </button>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        /* ═══════════════════════════════════════════
           HIGH-END AWWWARDS-TIER AUTHENTICATION
        ═══════════════════════════════════════════ */
        .lp-container {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          min-height: 100dvh;
          width: 100%;
          background: #FBF9F4;
          color: #1C281F;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          overflow: hidden;
          box-sizing: border-box;
        }

        /* ── Left Hero Section ── */
        .lp-hero-col {
          position: relative;
          background: linear-gradient(145deg, #122318 0%, #1A3624 50%, #2D583B 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3.5rem 4rem;
          color: #FFFFFF;
          overflow: hidden;
        }

        .lp-mesh-glow {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(74, 222, 128, 0.18) 0%, rgba(16, 185, 129, 0) 70%);
          top: -100px;
          right: -100px;
          pointer-events: none;
        }

        .lp-hero-content {
          position: relative;
          z-index: 2;
          max-width: 500px;
        }

        .lp-hero-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 2.2rem;
        }

        .lp-brand-emblem {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.12);
          border: 1.5px solid rgba(255, 255, 255, 0.2);
          color: #4ADE80;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .lp-brand-name {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 1.6rem;
          font-weight: 700;
          color: #FFFFFF;
          letter-spacing: -0.02em;
        }

        .lp-hero-title {
          font-family: 'Newsreader', Georgia, serif;
          font-size: clamp(2.4rem, 3.8vw, 3.4rem);
          font-weight: 700;
          line-height: 1.12;
          margin: 0 0 1.25rem;
          letter-spacing: -0.025em;
          color: #FFFFFF;
        }

        .lp-hero-serif {
          color: #86EFAC;
          font-style: italic;
        }

        .lp-hero-desc {
          font-size: 1rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 2rem;
          font-weight: 400;
        }

        /* Telemetry Bento Grid */
        .lp-bento-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 2rem;
        }

        .lp-bento-card {
          background: rgba(255, 255, 255, 0.07);
          backdrop-filter: blur(16px);
          border: 1.5px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          padding: 1rem 0.8rem;
          text-align: center;
          transition: transform 0.2s ease;
        }

        .lp-bento-card:hover {
          transform: translateY(-2px);
          border-color: rgba(74, 222, 128, 0.35);
        }

        .lp-bento-num {
          font-size: 1.6rem;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1;
          margin-bottom: 4px;
        }

        .lp-bento-unit {
          color: #4ADE80;
          font-size: 1.2rem;
        }

        .lp-bento-label {
          font-size: 0.68rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.65);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .lp-hero-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .lp-hero-tag {
          font-size: 0.78rem;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: rgba(255, 255, 255, 0.9);
        }

        /* ── Right Form Section ── */
        .lp-form-col {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 2.5rem;
          background: #FBF9F4;
          box-sizing: border-box;
          overflow-y: auto;
        }

        /* Double-Bezel Card Enclosure */
        .lp-double-bezel {
          width: 100%;
          max-width: 440px;
          background: #F2EDE4;
          border: 1.5px solid #EAE4DA;
          border-radius: 28px;
          padding: 8px;
          box-shadow: 0 16px 40px rgba(28, 40, 31, 0.06);
          box-sizing: border-box;
          animation: cardPop 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes cardPop {
          from { opacity: 0; transform: scale(0.97) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .lp-form-card {
          background: #FFFFFF;
          border-radius: 20px;
          padding: 2rem 1.8rem;
          box-sizing: border-box;
          border: 1px solid rgba(0, 0, 0, 0.04);
        }

        /* Mobile Brand */
        .lp-mobile-brand {
          display: none;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 1.25rem;
        }

        .lp-mobile-emblem {
          width: 36px;
          height: 36px;
          border-radius: 11px;
          background: #E8EFE9;
          border: 1.5px solid #4A7C59;
          color: #4A7C59;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lp-mobile-title {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 1.45rem;
          font-weight: 700;
          color: #1C281F;
        }

        /* Concentric Segmented Switcher */
        .lp-segment-control {
          display: flex;
          background: #F5F1EA;
          border: 1px solid #EAE4DA;
          border-radius: 14px;
          padding: 4px;
          margin-bottom: 1.25rem;
        }

        .lp-segment-btn {
          flex: 1;
          padding: 8px 12px;
          border: none;
          background: transparent;
          border-radius: 10px;
          font-size: 0.88rem;
          font-weight: 700;
          color: #5F7163;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: inherit;
        }

        .lp-segment-btn.active {
          background: #FFFFFF;
          color: #1C281F;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
        }

        /* Error Banner */
        .lp-error-banner {
          background: #FEE2E2;
          color: #DC2626;
          border: 1px solid #FCA5A5;
          border-radius: 12px;
          padding: 8px 12px;
          font-size: 0.82rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 1rem;
        }

        /* Google 1-Tap Button */
        .lp-google-btn {
          width: 100%;
          height: 44px;
          border-radius: 12px;
          background: #FFFFFF;
          border: 1.5px solid #EAE4DA;
          color: #1C281F;
          font-family: inherit;
          font-size: 0.92rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .lp-google-btn:hover:not(:disabled) {
          background: #FAF8F5;
          border-color: #D1C9BE;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .lp-google-btn:active:not(:disabled) {
          transform: scale(0.99);
        }

        /* Separator */
        .lp-separator {
          display: flex;
          align-items: center;
          margin: 1.1rem 0;
          color: #95A599;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .lp-separator::before, .lp-separator::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #EAE4DA;
        }

        .lp-separator span {
          padding: 0 10px;
        }

        /* Form Inputs */
        .lp-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .lp-field-group {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .lp-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .lp-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #5F7163;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 3;
        }

        .lp-input-wrapper input.lp-input,
        input.lp-input {
          width: 100% !important;
          height: 46px !important;
          padding: 0 44px 0 44px !important;
          padding-left: 44px !important;
          padding-right: 44px !important;
          background: #FAF8F5 !important;
          border: 1.5px solid #EAE4DA !important;
          border-radius: 12px !important;
          color: #1C281F !important;
          font-family: inherit !important;
          font-size: 0.92rem !important;
          font-weight: 600 !important;
          outline: none !important;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-sizing: border-box !important;
          line-height: normal !important;
        }

        .lp-input-wrapper input.lp-input:focus,
        input.lp-input:focus {
          background: #FFFFFF !important;
          border-color: #4A7C59 !important;
          box-shadow: 0 0 0 3px rgba(74, 124, 89, 0.15) !important;
        }

        .lp-input-wrapper input.lp-input.err,
        input.lp-input.err {
          border-color: #DC2626 !important;
          background: #FEF2F2 !important;
        }

        .lp-input::placeholder {
          color: #95A599 !important;
          font-weight: 400 !important;
        }

        .lp-field-err {
          font-size: 0.75rem;
          color: #DC2626;
          font-weight: 600;
          padding-left: 4px;
        }

        .lp-eye-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: #95A599;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          z-index: 3;
          transition: color 0.15s ease;
        }

        .lp-eye-btn:hover {
          color: #1C281F;
        }

        /* Primary Submit Button (Button-in-Button) */
        .lp-submit-btn {
          width: 100%;
          height: 48px;
          border-radius: 999px;
          background: #4A7C59;
          color: #FFFFFF;
          border: none;
          font-family: inherit;
          font-size: 0.95rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 6px 0 20px;
          cursor: pointer;
          margin-top: 6px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 16px rgba(74, 124, 89, 0.35);
        }

        .lp-submit-btn:hover:not(:disabled) {
          background: #3B6647;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(74, 124, 89, 0.45);
        }

        .lp-submit-btn:active:not(:disabled) {
          transform: scale(0.99);
        }

        .lp-submit-btn:disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        .lp-submit-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }

        .lp-submit-btn:hover .lp-submit-circle {
          transform: translateX(2px);
        }

        .lp-mini-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: lpSpin 0.6s linear infinite;
        }

        @keyframes lpSpin {
          to { transform: rotate(360deg); }
        }

        /* Card Footer */
        .lp-card-footer {
          margin-top: 1.1rem;
          text-align: center;
          font-size: 0.85rem;
          color: #5F7163;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .lp-switch-link {
          background: transparent;
          border: none;
          color: #4A7C59;
          font-weight: 800;
          font-size: 0.85rem;
          cursor: pointer;
          font-family: inherit;
          padding: 0;
          transition: all 0.15s ease;
        }

        .lp-switch-link:hover {
          text-decoration: underline;
          color: #3B6647;
        }

        /* ── Mobile Responsive Zero-Scroll Adaptations ── */
        @media (max-width: 900px) {
          .lp-container {
            grid-template-columns: 1fr;
            min-height: 100dvh;
            max-height: 100dvh;
            overflow-y: auto;
          }

          .lp-hero-col {
            display: none;
          }

          .lp-form-col {
            padding: 1.25rem 1rem;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .lp-double-bezel {
            max-width: 100%;
            border-radius: 24px;
            padding: 6px;
          }

          .lp-form-card {
            padding: 1.35rem 1.15rem;
            border-radius: 18px;
          }

          .lp-mobile-brand {
            display: flex;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;