import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ onLogin }) => {
  const [mode, setMode]               = useState('login');
  const [form, setForm]               = useState({ displayName: '', email: '', password: '' });
  const [errors, setErrors]           = useState({});
  const [loading, setLoading]         = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSignup = mode === 'signup';

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
      if (data) onLogin(data);
    } catch (err) {
      const message = err.response?.data?.message ||
        `${isSignup ? 'Registration' : 'Login'} failed. Please try again.`;
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'https://greenroute-backend-syxi.onrender.com/api/auth/google';
  };

  const switchMode = () => {
    setMode(isSignup ? 'login' : 'signup');
    setForm({ displayName: '', email: '', password: '' });
    setErrors({});
    setShowPassword(false);
  };

  /* ── Eye icon SVG ── */
  const EyeIcon = ({ open }) => open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

  return (
    <div className="lp">

      {/* ── Left hero panel ── */}
      <div className="lp-hero">
        {/* Decorative circles */}
        <div className="lp-circle lp-circle--1" />
        <div className="lp-circle lp-circle--2" />
        <div className="lp-circle lp-circle--3" />

        <div className="lp-hero-content">
          {/* Brand */}
          <div className="lp-brand">
            <div className="lp-brand-dot" />
            <span className="lp-brand-name">GreenRoute</span>
          </div>

          <h1 className="lp-headline">
            Travel Smarter,<br />
            <span className="lp-headline-em">Save the Planet.</span>
          </h1>

          <p className="lp-sub">
            Discover eco-friendly routes for your daily commute.
            Track your carbon savings and make every journey count.
          </p>

          {/* Stats */}
          <div className="lp-stats">
            {[
              { val: '2.4t',  lbl: 'CO₂ Saved'    },
              { val: '12k+',  lbl: 'Green Trips'   },
              { val: '98%',   lbl: 'Happy Users'   },
            ].map(s => (
              <div key={s.val} className="lp-stat">
                <div className="lp-stat-val">{s.val}</div>
                <div className="lp-stat-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* Feature pills — text only, no emoji */}
          <div className="lp-pills">
            {['Walk & Cycle', 'Public Transit', 'Impact Tracking'].map(p => (
              <span key={p} className="lp-pill">{p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="lp-form-panel">
        <div className="lp-form-wrap">

          <div className="lp-form-header">
            <h2 className="lp-form-title">
              {isSignup ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="lp-form-sub">
              {isSignup ? 'Join thousands making a difference' : 'Continue your sustainable commute'}
            </p>
          </div>

          {errors.general && (
            <div className="lp-alert">
              {errors.general}
            </div>
          )}

          {/* Google */}
          <button type="button" className="lp-google" onClick={handleGoogleLogin} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="lp-divider"><span>or {isSignup ? 'sign up' : 'sign in'} with email</span></div>

          <form onSubmit={handleSubmit} noValidate>

            {isSignup && (
              <div className="lp-field">
                <label className="lp-label">Full Name</label>
                <input
                  name="displayName" type="text"
                  className={`lp-input${errors.displayName ? ' lp-input--err' : ''}`}
                  placeholder="John Doe"
                  value={form.displayName}
                  onChange={handleChange}
                  autoComplete="name"
                  disabled={loading}
                />
                {errors.displayName && <p className="lp-err-txt">{errors.displayName}</p>}
              </div>
            )}

            <div className="lp-field">
              <label className="lp-label">Email Address</label>
              <input
                name="email" type="email"
                className={`lp-input${errors.email ? ' lp-input--err' : ''}`}
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                disabled={loading}
              />
              {errors.email && <p className="lp-err-txt">{errors.email}</p>}
            </div>

            <div className="lp-field">
              <label className="lp-label">Password</label>
              <div className="lp-pw-wrap">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`lp-input${errors.password ? ' lp-input--err' : ''}`}
                  placeholder={isSignup ? 'Min. 8 characters' : '••••••••'}
                  value={form.password}
                  onChange={handleChange}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="lp-eye"
                  onClick={() => setShowPassword(v => !v)}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {errors.password && <p className="lp-err-txt">{errors.password}</p>}
            </div>

            {!isSignup && (
              <div className="lp-forgot-row">
                <span className="lp-forgot">Forgot password?</span>
              </div>
            )}

            <button type="submit" className="lp-submit" disabled={loading}>
              {loading ? (
                <span className="lp-spinner" />
              ) : (
                isSignup ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="lp-footer">
            <span>{isSignup ? 'Already have an account?' : "Don't have an account?"}</span>
            <button type="button" className="lp-switch" onClick={switchMode} disabled={loading}>
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </div>

        </div>
      </div>

      <style>{`
        /* ═══════════════════════════════════════════
           LOGIN PAGE
        ═══════════════════════════════════════════ */
        .lp {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 100vh;
          font-family: 'Be Vietnam Pro', -apple-system, sans-serif;
        }
        @media (max-width: 900px) {
          .lp { grid-template-columns: 1fr; }
          .lp-hero { display: none; }
        }

        /* ── Left hero ── */
        .lp-hero {
          position: relative;
          background: linear-gradient(145deg, #064e3b 0%, #065f46 40%, #047857 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          overflow: hidden;
        }

        /* Decorative background circles */
        .lp-circle {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .lp-circle--1 {
          width: 400px; height: 400px;
          top: -120px; right: -100px;
          background: rgba(255,255,255,0.05);
        }
        .lp-circle--2 {
          width: 260px; height: 260px;
          bottom: -80px; left: -60px;
          background: rgba(255,255,255,0.04);
        }
        .lp-circle--3 {
          width: 160px; height: 160px;
          top: 50%; left: 55%;
          background: rgba(255,255,255,0.03);
        }

        .lp-hero-content {
          position: relative;
          z-index: 1;
          max-width: 480px;
          color: #fff;
        }

        /* Brand row — dot instead of emoji */
        .lp-brand {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 2.5rem;
        }
        .lp-brand-dot {
          width: 12px; height: 12px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 0 3px rgba(52,211,153,0.3);
        }
        .lp-brand-name {
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #fff;
        }

        /* Headline */
        .lp-headline {
          font-size: clamp(2rem, 3.5vw, 3rem);
          font-weight: 800;
          line-height: 1.1;
          margin: 0 0 1.25rem;
          letter-spacing: -0.03em;
          color: #fff;
        }
        .lp-headline-em {
          color: #6ee7b7;
        }

        .lp-sub {
          font-size: 1rem;
          line-height: 1.65;
          color: rgba(255,255,255,0.8);
          margin: 0 0 2.5rem;
          font-weight: 400;
        }

        /* Stats */
        .lp-stats {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 1rem;
          margin-bottom: 2rem;
          padding: 1.25rem 1.5rem;
          background: rgba(255,255,255,0.08);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(12px);
        }
        .lp-stat { text-align: center; }
        .lp-stat-val {
          font-size: 1.6rem;
          font-weight: 800;
          color: #fff;
          line-height: 1;
          margin-bottom: 0.25rem;
        }
        .lp-stat-lbl {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.65);
          font-weight: 500;
        }

        /* Pills */
        .lp-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
        }
        .lp-pill {
          padding: 0.4rem 1rem;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 999px;
          font-size: 0.82rem;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          letter-spacing: 0.01em;
        }

        /* ── Right form panel ── */
        .lp-form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 2rem;
          background: #fff;
        }
        .lp-form-wrap {
          width: 100%;
          max-width: 400px;
        }

        .lp-form-header { margin-bottom: 2rem; text-align: center; }
        .lp-form-title {
          font-size: 1.65rem;
          font-weight: 800;
          margin: 0 0 0.4rem;
          color: #0f172a;
          letter-spacing: -0.02em;
        }
        .lp-form-sub {
          font-size: 0.9rem;
          color: #64748b;
          margin: 0;
        }

        /* Alert */
        .lp-alert {
          background: #fef2f2;
          color: #dc2626;
          border: 1.5px solid #fecaca;
          border-radius: 10px;
          padding: 0.8rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 1.25rem;
          animation: slideDown 0.25s ease;
        }
        @keyframes slideDown {
          from { opacity:0; transform:translateY(-8px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* Google button */
        .lp-google {
          width: 100%;
          padding: 0.8rem 1rem;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          color: #1e293b;
          font-size: 0.92rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.65rem;
          cursor: pointer;
          transition: all 0.18s ease;
          font-family: inherit;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .lp-google:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
          box-shadow: 0 3px 10px rgba(0,0,0,0.08);
          transform: translateY(-1px);
        }
        .lp-google:disabled { opacity:.5; cursor:not-allowed; }

        /* Divider */
        .lp-divider {
          display: flex;
          align-items: center;
          margin: 1.4rem 0;
          color: #94a3b8;
          font-size: 0.8rem;
        }
        .lp-divider::before, .lp-divider::after {
          content:''; flex:1; height:1px; background:#e2e8f0;
        }
        .lp-divider span { padding: 0 0.9rem; }

        /* Fields */
        .lp-field { margin-bottom: 1.1rem; }
        .lp-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 700;
          color: #374151;
          margin-bottom: 0.45rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .lp-input {
          width: 100%;
          padding: 0.8rem 1rem;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          color: #0f172a;
          font-size: 0.92rem;
          outline: none;
          transition: all 0.18s ease;
          box-sizing: border-box;
          font-family: inherit;
        }
        .lp-input:focus {
          border-color: #10b981;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.12);
        }
        .lp-input::placeholder { color: #94a3b8; }
        .lp-input:disabled { opacity:.55; cursor:not-allowed; }
        .lp-input--err { border-color: #f87171; background: #fff; }
        .lp-input--err:focus { box-shadow: 0 0 0 3px rgba(248,113,113,0.15); }
        .lp-err-txt {
          margin: 0.35rem 0 0;
          font-size: 0.78rem;
          color: #dc2626;
          font-weight: 500;
        }

        /* Password wrapper */
        .lp-pw-wrap { position: relative; }
        .lp-pw-wrap .lp-input { padding-right: 2.8rem; }
        .lp-eye {
          position: absolute;
          right: 0.8rem; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          cursor: pointer; color: #94a3b8;
          padding: 0.2rem;
          display: flex; align-items: center;
          transition: color 0.15s;
          outline: none;
        }
        .lp-eye:hover:not(:disabled) { color: #475569; }
        .lp-eye:disabled { cursor:not-allowed; opacity:.4; }

        /* Forgot */
        .lp-forgot-row { text-align: right; margin: -0.25rem 0 1.1rem; }
        .lp-forgot {
          font-size: 0.8rem;
          color: #10b981;
          font-weight: 600;
          cursor: default;
        }

        /* Submit */
        .lp-submit {
          width: 100%;
          padding: 0.9rem 1.5rem;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          color: #fff;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          letter-spacing: 0.01em;
          box-shadow: 0 4px 14px rgba(5,150,105,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          margin-top: 0.5rem;
        }
        .lp-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(5,150,105,0.4);
        }
        .lp-submit:active:not(:disabled) { transform: translateY(0); }
        .lp-submit:disabled { opacity:.75; cursor:not-allowed; }

        /* Inline spinner on submit */
        .lp-spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Footer */
        .lp-footer {
          margin-top: 1.75rem;
          text-align: center;
          font-size: 0.875rem;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
        }
        .lp-switch {
          background: none; border: none;
          color: #059669; font-weight: 700;
          cursor: pointer; font-size: 0.875rem;
          font-family: inherit; padding: 0;
          outline: none;
          transition: opacity 0.15s;
        }
        .lp-switch:hover:not(:disabled) { opacity:.75; text-decoration: underline; }
        .lp-switch:disabled { opacity:.4; cursor:not-allowed; }
      `}</style>
    </div>
  );
};

export default Login;