import React, { useState } from 'react';
import axios from 'axios';

// ─── Custom Loader Component ───────────────────────────────────────────────────

const GreenLoader = () => (
  <div className="loader-container">
    <div className="green-loader">
      <div className="loader-text">Loading</div>
      <div className="loader-truck"></div>
    </div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

const Login = ({ onLogin }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSignup = mode === 'signup';

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (errors.general) setErrors(prev => ({ ...prev, general: '' }));
  };

  const validate = () => {
    const errs = {};
    
    if (isSignup && !form.displayName.trim()) {
      errs.displayName = 'Name is required';
    }
    
    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email';
    }
    
    if (!form.password.trim()) {
      errs.password = 'Password is required';
    } else if (isSignup && form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const endpoint = isSignup ? '/api/auth/register' : '/api/auth/login';
      const { data } = await axios.post(endpoint, form);
      
      // Small delay for better UX (shows success state)
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
    window.location.href = 'https://greenroute-backend-syxi.onrender.com/api/auth/google/callback';
  };

  const switchMode = () => {
    setMode(isSignup ? 'login' : 'signup');
    setForm({ displayName: '', email: '', password: '' });
    setErrors({});
    setShowPassword(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="login-page">
      {/* Hero Section */}
      <div className="login-hero">
        <div className="hero-pattern" />
        
        <div className="hero-content">
          <div className="hero-brand">
            <div className="hero-icon">🌱</div>
            <div className="hero-name">GreenRoute</div>
          </div>

          <h1 className="hero-title">
            Travel Smarter,<br />
            <span className="hero-title-accent">Save the Planet</span>
          </h1>
          
          <p className="hero-description">
            Discover eco-friendly routes for your daily commute.
            Track your carbon savings and make every journey count.
          </p>

          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-value">2.4t</div>
              <div className="stat-label">CO₂ Saved</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">12k+</div>
              <div className="stat-label">Green Trips</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">98%</div>
              <div className="stat-label">Happy Users</div>
            </div>
          </div>

          <div className="hero-features">
            <div className="feature-badge">🚶 Walk & Cycle</div>
            <div className="feature-badge">🚌 Public Transit</div>
            <div className="feature-badge">📊 Impact Tracking</div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="login-form-section">
        <div className="form-container">
          
          <div className="form-header">
            <h2 className="form-title">
              {isSignup ? 'Start Your Green Journey' : 'Welcome Back'}
            </h2>
            <p className="form-subtitle">
              {isSignup 
                ? 'Join thousands making a difference' 
                : 'Continue your sustainable commute'}
            </p>
          </div>

          {errors.general && (
            <div className="alert alert-error" role="alert">
              <span className="alert-icon">⚠️</span>
              <span>{errors.general}</span>
            </div>
          )}

          {/* Google Sign In */}
          <button 
            type="button" 
            className="btn-google"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="google-icon" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="divider">
            <span>or {isSignup ? 'sign up' : 'sign in'} with email</span>
          </div>

          {/* Main Form */}
          <form onSubmit={handleSubmit} noValidate>
            
            {isSignup && (
              <div className="input-group">
                <label htmlFor="displayName" className="input-label">
                  Full Name
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  className={`input-field ${errors.displayName ? 'input-error' : ''}`}
                  placeholder="John Doe"
                  value={form.displayName}
                  onChange={handleChange}
                  autoComplete="name"
                  disabled={loading}
                />
                {errors.displayName && (
                  <p className="input-error-text">{errors.displayName}</p>
                )}
              </div>
            )}

            <div className="input-group">
              <label htmlFor="email" className="input-label">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className={`input-field ${errors.email ? 'input-error' : ''}`}
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                disabled={loading}
              />
              {errors.email && (
                <p className="input-error-text">{errors.email}</p>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="password" className="input-label">
                Password
              </label>
              <div className="password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`input-field ${errors.password ? 'input-error' : ''}`}
                  placeholder={isSignup ? 'Min. 6 characters' : '••••••••'}
                  value={form.password}
                  onChange={handleChange}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && (
                <p className="input-error-text">{errors.password}</p>
              )}
            </div>

            {!isSignup && (
              <div className="form-extra">
                <a href="/forgot-password" className="forgot-link">
                  Forgot password?
                </a>
              </div>
            )}

            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? (
                <GreenLoader />
              ) : (
                <>
                  {isSignup ? '🌱 Create Account' : '→ Sign In'}
                </>
              )}
            </button>
          </form>

          <div className="form-footer">
            <span className="footer-text">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}
            </span>
            <button 
              type="button" 
              className="footer-link"
              onClick={switchMode}
              disabled={loading}
            >
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </div>

        </div>
      </div>

      {/* Styles */}
      <style>{`
        /* ─── Page Layout ──────────────────────────────────────────────── */
        .login-page {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 100vh;
          background: var(--bg-primary);
        }

        @media (max-width: 968px) {
          .login-page {
            grid-template-columns: 1fr;
          }
          .login-hero {
            display: none;
          }
        }

        /* ─── Hero Section ─────────────────────────────────────────────── */
        .login-hero {
          position: relative;
          background: linear-gradient(135deg, var(--primary-green) 0%, var(--primary-green-light) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          overflow: hidden;
        }

        .hero-pattern {
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(255,255,255,0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(255,255,255,0.08) 0%, transparent 50%);
          opacity: 0.6;
        }

        .hero-content {
          position: relative;
          max-width: 500px;
          color: white;
          z-index: 1;
        }

        .hero-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2.5rem;
        }

        .hero-icon {
          font-size: 2.5rem;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .hero-name {
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .hero-title {
          font-size: 2.75rem;
          font-weight: 800;
          line-height: 1.1;
          margin: 0 0 1.25rem;
          letter-spacing: -0.03em;
        }

        .hero-title-accent {
          background: linear-gradient(to right, #fff 0%, rgba(255,255,255,0.8) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-description {
          font-size: 1.1rem;
          line-height: 1.6;
          margin: 0 0 2.5rem;
          opacity: 0.95;
          font-weight: 400;
        }

        .hero-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: rgba(255,255,255,0.1);
          border-radius: var(--radius-lg);
          backdrop-filter: blur(10px);
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 800;
          display: block;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.8rem;
          opacity: 0.85;
          font-weight: 500;
        }

        .hero-features {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .feature-badge {
          padding: 0.5rem 1rem;
          background: rgba(255,255,255,0.15);
          border-radius: var(--radius-full);
          font-size: 0.85rem;
          font-weight: 600;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
        }

        /* ─── Form Section ─────────────────────────────────────────────── */
        .login-form-section {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: var(--bg-secondary);
        }

        .form-container {
          width: 100%;
          max-width: 420px;
        }

        .form-header {
          margin-bottom: 2rem;
          text-align: center;
        }

        .form-title {
          font-size: 1.75rem;
          font-weight: 800;
          margin: 0 0 0.5rem;
          color: var(--text-primary);
        }

        .form-subtitle {
          font-size: 0.95rem;
          color: var(--text-light);
          margin: 0;
        }

        /* ─── Alert ────────────────────────────────────────────────────── */
        .alert {
          padding: 0.875rem 1.125rem;
          border-radius: var(--radius-lg);
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.9rem;
          font-weight: 500;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .alert-error {
          background: #fee2e2;
          color: #dc2626;
          border: 1.5px solid #dc2626;
        }

        .alert-icon {
          font-size: 1.1rem;
        }

        /* ─── Google Button ────────────────────────────────────────────── */
        .btn-google {
          width: 100%;
          padding: 0.875rem 1.25rem;
          border: 2px solid var(--border-color);
          border-radius: var(--radius-lg);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.95rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
        }

        .btn-google:hover:not(:disabled) {
          background: var(--bg-secondary);
          border-color: var(--text-light);
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }

        .btn-google:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-google:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .google-icon {
          width: 20px;
          height: 20px;
        }

        /* ─── Divider ──────────────────────────────────────────────────── */
        .divider {
          display: flex;
          align-items: center;
          margin: 1.5rem 0;
          color: var(--text-light);
          font-size: 0.85rem;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border-color);
        }

        .divider span {
          padding: 0 1rem;
        }

        /* ─── Form Inputs ──────────────────────────────────────────────── */
        .input-group {
          margin-bottom: 1.25rem;
        }

        .input-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .input-field {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid var(--border-color);
          border-radius: var(--radius-lg);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.95rem;
          transition: all 0.2s ease;
          outline: none;
          box-sizing: border-box;
        }

        .input-field:focus {
          border-color: var(--primary-green);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .input-field:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .input-field.input-error {
          border-color: #dc2626;
        }

        .input-field.input-error:focus {
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }

        .input-error-text {
          margin: 0.5rem 0 0;
          font-size: 0.8rem;
          color: #dc2626;
          font-weight: 500;
        }

        /* ─── Password Field ───────────────────────────────────────────── */
        .password-wrapper {
          position: relative;
        }

        .password-toggle {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.25rem;
          padding: 0.25rem;
          opacity: 0.6;
          transition: opacity 0.2s;
          outline: none;
        }

        .password-toggle:hover:not(:disabled) {
          opacity: 1;
        }

        .password-toggle:disabled {
          cursor: not-allowed;
          opacity: 0.3;
        }

        /* ─── Form Extra ───────────────────────────────────────────────── */
        .form-extra {
          margin-bottom: 1.5rem;
          text-align: right;
        }

        .forgot-link {
          font-size: 0.85rem;
          color: var(--primary-green);
          text-decoration: none;
          font-weight: 600;
          transition: opacity 0.2s;
        }

        .forgot-link:hover {
          opacity: 0.8;
          text-decoration: underline;
        }

        /* ─── Submit Button ────────────────────────────────────────────── */
        .btn-submit {
          width: 100%;
          padding: 1rem 1.5rem;
          border: none;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, var(--primary-green) 0%, var(--primary-green-light) 100%);
          color: white;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          outline: none;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
          position: relative;
          overflow: hidden;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
        }

        .btn-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-submit:disabled {
          cursor: not-allowed;
          opacity: 0.8;
        }

        /* ─── Form Footer ──────────────────────────────────────────────── */
        .form-footer {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.9rem;
        }

        .footer-text {
          color: var(--text-light);
          margin-right: 0.5rem;
        }

        .footer-link {
          background: none;
          border: none;
          color: var(--primary-green);
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          font-size: 0.9rem;
          transition: opacity 0.2s;
          padding: 0;
          outline: none;
        }

        .footer-link:hover:not(:disabled) {
          opacity: 0.8;
          text-decoration: underline;
        }

        .footer-link:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        /* ─── Loader Animation ─────────────────────────────────────────── */
.loader-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 0;
}

.green-loader {
  width: 180px;
  height: 40px;
  position: relative;

  font-size: 18px;
  font-family: monospace;
  font-weight: 700;
  line-height: 40px;
  letter-spacing: 2px;
  text-align: center;

  color: #ffffff;

  border-left: 4px solid #22c55e;
  border-right: 4px solid #22c55e;

  background:
    linear-gradient(#22c55e 0 0) left,
    linear-gradient(#22c55e 0 0) right;

  background-repeat: no-repeat;
  background-size: 50% 100%;

  border-radius: 10px;

  box-shadow:
    0 0 10px rgba(34,197,94,0.5),
    0 0 25px rgba(34,197,94,0.3);

  overflow: visible;

  animation: loader-fill 2s infinite;
}

.loader-text::before {
  content: "Loading";
}

.loader-truck {
  position: absolute;
  bottom: -20px;
  left: 0;

  width: 28px;
  height: 14px;

  border-radius: 4px;

  background:
    linear-gradient(#22c55e 0 0) left/18px 100% no-repeat,
    linear-gradient(#16a34a 0 0) right/10px 70% no-repeat;

  box-shadow:
    0 0 10px rgba(34,197,94,0.7);

  animation: loader-truck 2s infinite;
}

.loader-truck::before,
.loader-truck::after {
  content: "";
  position: absolute;
  bottom: -6px;
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
}

.loader-truck::before {
  left: 3px;
}

.loader-truck::after {
  right: 3px;
}

@keyframes loader-fill {
  0%, 25% {
    background-size: 50% 100%, 0% 100%;
  }

  50% {
    background-size: 0% 100%, 50% 100%;
  }

  75%, 100% {
    background-size: 0% 100%, 0% 100%;
  }
}

@keyframes loader-truck {
  0% {
    left: 0;
  }

  50% {
    left: calc(100% - 28px);
  }

  100% {
    left: 0;
  }
}

        /* ─── Responsive ───────────────────────────────────────────────── */
        @media (max-width: 968px) {
          .login-form-section {
            padding: 2rem 1.5rem;
          }
          
          .form-container {
            max-width: 100%;
          }
        }

        @media (max-width: 480px) {
          .form-title {
            font-size: 1.5rem;
          }
          
          .btn-submit {
            padding: 0.875rem 1.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
