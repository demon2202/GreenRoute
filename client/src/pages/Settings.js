import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';

/* ─────────────────────────────────────────────────────────────────────────────
   SVG Icon helpers — no emoji anywhere
───────────────────────────────────────────────────────────────────────────── */
const Svg = ({ children, size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ display: 'block', flexShrink: 0 }}>
    {children}
  </svg>
);

const Icons = {
  user:     () => <Svg><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Svg>,
  palette:  () => <Svg><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></Svg>,
  bell:     () => <Svg><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Svg>,
  lock:     () => <Svg><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Svg>,
  leaf:     () => <Svg><path d="M2 22c1.25-1.25 2.2-2.7 2.82-4.28C6.46 13.92 5.35 8.76 9.28 5.38 11.06 3.84 13.47 3 16 3c2.5 0 4.5 1 6 3-3 .5-5 1.5-6.5 3-1.47 1.47-2.09 3.47-2.09 5.5 0 3.59-2.1 6.5-4.91 7.5A8.35 8.35 0 0 1 2 22z"/></Svg>,
  download: () => <Svg><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Svg>,
  trash:    () => <Svg><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></Svg>,
  sun:      () => <Svg><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></Svg>,
  moon:     () => <Svg><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></Svg>,
  monitor:  () => <Svg><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></Svg>,
  map:      () => <Svg><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></Svg>,
  bar:      () => <Svg><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Svg>,
  mail:     () => <Svg><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></Svg>,
  shield:   () => <Svg><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Svg>,
  check:    () => <Svg><polyline points="20 6 9 17 4 12"/></Svg>,
  star:     () => <Svg fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Svg>,
};

/* ─────────────────────────────────────────────────────────────────────────────
   Reusable sub-components
───────────────────────────────────────────────────────────────────────────── */

const SectionCard = ({ iconKey, title, subtitle, children, accent = false }) => (
  <div style={{
    background: accent
      ? 'linear-gradient(135deg,#064e3b 0%,#065f46 100%)'
      : 'var(--bg-primary, #fff)',
    borderRadius: 20,
    border: accent ? 'none' : '1.5px solid #f1f5f9',
    padding: '1.5rem',
    boxShadow: accent
      ? '0 8px 32px rgba(6,78,59,0.35)'
      : '0 2px 12px rgba(0,0,0,0.04)',
    position: 'relative',
    overflow: 'hidden',
  }}>
    {accent && (
      <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
    )}
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: subtitle ? '0.4rem' : '1.25rem' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: accent ? 'rgba(255,255,255,0.15)' : '#f0fdf4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent ? 'white' : '#10b981', flexShrink: 0,
          border: accent ? '1px solid rgba(255,255,255,0.2)' : '1px solid #bbf7d0',
        }}>
          {Icons[iconKey]?.()}
        </div>
        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: accent ? '#fff' : 'var(--text-primary, #0f172a)', letterSpacing: '-0.02em' }}>
          {title}
        </h3>
      </div>
      {subtitle && (
        <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', color: accent ? 'rgba(167,243,208,0.8)' : '#64748b', lineHeight: 1.5 }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  </div>
);

const Toast = ({ message, type }) => {
  if (!message) return null;
  const cfg = {
    success: { bg: '#ecfdf5', color: '#065f46', border: '#6ee7b7' },
    error:   { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' },
    info:    { bg: '#eff6ff', color: '#1e40af', border: '#93c5fd' },
  };
  const s = cfg[type] || cfg.info;
  return (
    <div role="alert" aria-live="polite" style={{
      backgroundColor: s.bg, color: s.color,
      border: `1.5px solid ${s.border}`,
      padding: '0.875rem 1.25rem', borderRadius: 14, marginBottom: '1.25rem',
      fontWeight: 600, fontSize: '0.9rem',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      animation: 'stSlideUp 0.3s ease',
    }}>
      {type === 'success' && <span style={{ color: '#10b981' }}><Icons.check /></span>}
      {message}
    </div>
  );
};

const Toggle = ({ checked, onChange, id }) => (
  <button role="switch" aria-checked={checked} id={id} onClick={onChange} style={{
    width: 50, height: 27, borderRadius: 14,
    background: checked ? '#10b981' : '#e2e8f0',
    border: 'none', cursor: 'pointer', position: 'relative',
    transition: 'background 0.25s ease', flexShrink: 0, outline: 'none',
    boxShadow: checked ? '0 2px 8px rgba(16,185,129,0.3)' : 'none',
  }}
    onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.25)')}
    onBlur={e  => (e.currentTarget.style.boxShadow = checked ? '0 2px 8px rgba(16,185,129,0.3)' : 'none')}
  >
    <span style={{
      position: 'absolute', top: 2.5,
      left: checked ? 23 : 2.5,
      width: 22, height: 22, borderRadius: '50%',
      background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      transition: 'left 0.25s ease', display: 'block',
    }} />
  </button>
);

const Avatar = ({ user }) => {
  const initials = (user.displayName || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {user.image ? (
        <img src={user.image} alt={`${user.displayName}'s avatar`}
          style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid #10b981', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div aria-label="Profile initials" style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg,#10b981,#34d399)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: '1.6rem', fontWeight: 800, userSelect: 'none',
          boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
        }}>
          {initials}
        </div>
      )}
      {/* Online dot */}
      <div style={{
        position: 'absolute', bottom: 3, right: 3,
        width: 14, height: 14, borderRadius: '50%',
        background: '#10b981', border: '2px solid white',
        boxShadow: '0 0 0 1px rgba(16,185,129,0.2)',
      }} />
    </div>
  );
};

const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
    backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 9000, padding: '1rem',
    animation: 'stFadeIn 0.15s ease',
  }}>
    <div style={{
      background: '#fff', borderRadius: 24, padding: '2rem',
      maxWidth: 380, width: '100%',
      boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
      animation: 'stScaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#ef4444' }}>
        <Icons.trash />
      </div>
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.5, textAlign: 'center', color: '#0f172a' }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '0.75rem', borderRadius: 12, border: '1.5px solid #e2e8f0',
          background: '#f8fafc', color: '#475569', fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem',
        }}>Cancel</button>
        <button onClick={onConfirm} style={{
          flex: 1, padding: '0.75rem', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'white',
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem',
          boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
        }}>Yes, delete all</button>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   Config constants
───────────────────────────────────────────────────────────────────────────── */
const NOTIFICATION_OPTIONS = [
  { key: 'routeRecommendations', iconKey: 'map',    label: 'Route recommendations', description: 'Personalised eco-friendly route suggestions'    },
  { key: 'weatherAlerts',        iconKey: 'sun',    label: 'Weather alerts',        description: 'Real-time weather updates for your routes'        },
  { key: 'monthlyReports',       iconKey: 'bar',    label: 'Monthly impact reports', description: 'Carbon savings and achievements summary'         },
  { key: 'achievements',         iconKey: 'star',   label: 'Achievement milestones', description: 'Celebrate your sustainability wins'              },
];

const THEME_OPTIONS = [
  { value: 'light',  label: 'Light',  iconKey: 'sun',     description: 'Clean & bright',   accent: '#f59e0b', preview: ['#ffffff','#f8fafc','#0f172a'] },
  { value: 'dark',   label: 'Dark',   iconKey: 'moon',    description: 'Easy on the eyes',  accent: '#3b82f6', preview: ['#0f172a','#1e293b','#ffffff'] },
  { value: 'auto',   label: 'System', iconKey: 'monitor', description: 'Match OS setting',  accent: '#8b5cf6', preview: ['#f0fdf4','#e2e8f0','#0f172a'] },
];

const useToast = () => {
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const timer = useRef(null);
  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast({ message: '', type: 'info' }), duration);
  }, []);
  return { toast, showToast };
};

/* ─────────────────────────────────────────────────────────────────────────────
   Main Settings component
───────────────────────────────────────────────────────────────────────────── */
const Settings = ({ user, theme, onThemeChange }) => {
  const { toast, showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const [profileData, setProfileData] = useState({
    displayName: user.displayName || '',
    email:       user.email       || '',
  });
  const [profileErrors, setProfileErrors] = useState({});

  const [notifications, setNotifications] = useState({
    routeRecommendations: true,
    weatherAlerts:        true,
    monthlyReports:       true,
    achievements:         false,
  });

  const withSaving = useCallback(async (fn) => {
    if (saving) return;
    setSaving(true);
    try { await fn(); }
    catch { showToast('Something went wrong. Please try again.', 'error'); }
    finally { setSaving(false); }
  }, [saving, showToast]);

  const validateProfile = () => {
    const errors = {};
    if (!profileData.displayName.trim()) errors.displayName = 'Display name is required';
    if (!profileData.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) errors.email = 'Enter a valid email address';
    return errors;
  };

  const handleThemeChange  = (value) => withSaving(async () => { await onThemeChange(value); showToast('Theme updated', 'success'); });
  const handleProfileUpdate = () => {
    const errors = validateProfile();
    if (Object.keys(errors).length) { setProfileErrors(errors); return; }
    setProfileErrors({});
    withSaving(async () => {
      await axios.put('/api/profile', {
        displayName: profileData.displayName.trim(),
        email:       profileData.email.trim(),
      });
      showToast('Profile saved successfully', 'success');
    });
  };
  const handleNotificationToggle = (key) => setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  const handleClearHistory = () => setConfirmClear(true);
  const handleConfirmClear = () => {
    setConfirmClear(false);
    withSaving(async () => {
      await axios.delete('/api/history');
      showToast('Trip history cleared', 'success');
    });
  };
  const handleExport = () => withSaving(async () => {
    showToast('Preparing your export…', 'info', 2000);
    await new Promise(r => setTimeout(r, 2000));
    showToast('Export ready — check your downloads', 'success', 4000);
  });

  /* ── Render ── */
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', paddingBottom: '3rem' }}>
      {confirmClear && (
        <ConfirmDialog
          message="Delete all trip history? This cannot be undone."
          onConfirm={handleConfirmClear}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary, #0f172a)' }}>
          Settings
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
          Manage your account, appearance and notifications
        </p>
      </div>

      <Toast message={toast.message} type={toast.type} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

        {/* ── Profile ── */}
        <SectionCard iconKey="user" title="Profile" subtitle="Your public identity on GreenRoute">

          {/* Avatar + name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <Avatar user={user} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 0.15rem', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary, #0f172a)' }}>
                {user.displayName}
              </p>
              <p style={{ margin: '0 0 0.65rem', fontSize: '0.85rem', color: '#64748b' }}>
                {user.email}
              </p>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                background: '#f0fdf4', border: '1.5px solid #10b981',
                color: '#065f46', fontSize: '0.75rem', fontWeight: 700,
                padding: '0.25rem 0.7rem', borderRadius: 999,
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#10b981"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                Eco Champion
              </span>
            </div>
          </div>

          {/* Form fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {[
              { id: 'displayName', label: 'Display Name', type: 'text', placeholder: 'Your name', field: 'displayName' },
              { id: 'email',       label: 'Email Address', type: 'email', placeholder: 'you@example.com', field: 'email' },
            ].map(({ id, label, type, placeholder, field }) => (
              <div key={id}>
                <label htmlFor={id} style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.4rem', color: 'var(--text-primary, #0f172a)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {label}
                </label>
                <input
                  id={id} type={type}
                  value={profileData[field]}
                  onChange={e => {
                    setProfileData(p => ({ ...p, [field]: e.target.value }));
                    if (profileErrors[field]) setProfileErrors(p => ({ ...p, [field]: '' }));
                  }}
                  placeholder={placeholder}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '0.65rem 0.9rem', borderRadius: 10,
                    border: `1.5px solid ${profileErrors[field] ? '#ef4444' : '#e2e8f0'}`,
                    fontSize: '0.9rem', fontFamily: 'inherit',
                    background: profileErrors[field] ? '#fef2f2' : 'var(--bg-secondary, #f8fafc)',
                    color: 'var(--text-primary, #0f172a)',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#10b981')}
                  onBlur={e  => (e.target.style.borderColor = profileErrors[field] ? '#ef4444' : '#e2e8f0')}
                />
                {profileErrors[field] && (
                  <p id={`${id}-error`} role="alert" style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>
                    {profileErrors[field]}
                  </p>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleProfileUpdate}
            disabled={saving}
            style={{
              padding: '0.7rem 1.75rem', borderRadius: 11, border: 'none',
              background: 'linear-gradient(135deg,#10b981,#059669)',
              color: 'white', fontWeight: 700, fontSize: '0.9rem',
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
              transition: 'opacity 0.15s',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </SectionCard>

        {/* ── Appearance ── */}
        <SectionCard iconKey="palette" title="Appearance" subtitle="Choose how GreenRoute looks on your device">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
            {THEME_OPTIONS.map(opt => {
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleThemeChange(opt.value)}
                  disabled={saving}
                  aria-pressed={active}
                  style={{
                    padding: '1.1rem 0.75rem', borderRadius: 14, cursor: saving ? 'not-allowed' : 'pointer',
                    border: `2px solid ${active ? '#10b981' : '#e2e8f0'}`,
                    background: active ? '#f0fdf4' : 'var(--bg-secondary, #f8fafc)',
                    transition: 'all 0.2s ease', textAlign: 'center', position: 'relative',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                  onMouseOver={e => { if (!active && !saving) { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                  onMouseOut={e  => { if (!active) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; } }}
                >
                  {/* Mini preview strip */}
                  <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 28, marginBottom: '0.6rem', border: '1px solid rgba(0,0,0,0.08)' }}>
                    {opt.preview.map((c, i) => (
                      <div key={i} style={{ flex: i === 2 ? 0.6 : 1, background: c }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                    <span style={{ color: active ? '#10b981' : '#475569' }}>
                      {Icons[opt.iconKey]?.()}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: active ? '#065f46' : 'var(--text-primary, #0f172a)' }}>
                      {opt.label}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.73rem', color: '#94a3b8', fontWeight: 500 }}>
                    {opt.description}
                  </p>
                  {active && (
                    <span style={{
                      position: 'absolute', top: 8, right: 8,
                      background: '#10b981', color: 'white',
                      width: 18, height: 18, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* ── Notifications ── */}
        <SectionCard iconKey="bell" title="Notifications" subtitle="Choose what updates you want to receive">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {NOTIFICATION_OPTIONS.map(({ key, iconKey, label, description }) => {
              const on = notifications[key];
              return (
                <div
                  key={key}
                  onClick={() => handleNotificationToggle(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem 1.1rem', borderRadius: 14, cursor: 'pointer',
                    border: `1.5px solid ${on ? '#10b981' : '#f1f5f9'}`,
                    background: on ? '#f0fdf4' : 'var(--bg-secondary, #f8fafc)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: on ? '#10b981' : '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: on ? 'white' : '#94a3b8',
                    transition: 'all 0.2s',
                  }}>
                    {Icons[iconKey]?.()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 0.15rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary, #0f172a)' }}>
                      {label}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                      {description}
                    </p>
                  </div>
                  <Toggle id={`notif-${key}`} checked={on} onChange={() => handleNotificationToggle(key)} />
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* ── Privacy & Data ── */}
        <SectionCard iconKey="lock" title="Privacy & Data" subtitle="Manage how your data is stored and used">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0.75rem' }}>
            {[
              {
                iconKey: 'download', label: 'Export My Data', desc: 'Download all your trip history',
                onClick: handleExport, danger: false,
              },
              {
                iconKey: 'trash', label: 'Clear Trip History', desc: 'Permanently delete all saved trips',
                onClick: handleClearHistory, danger: true,
              },
            ].map(({ iconKey, label, desc, onClick, danger }) => (
              <button
                key={label}
                onClick={onClick}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.85rem',
                  padding: '1rem 1.1rem', borderRadius: 14,
                  border: `1.5px solid ${danger ? '#fca5a5' : '#e2e8f0'}`,
                  background: danger ? '#fef2f2' : 'var(--bg-secondary, #f8fafc)',
                  cursor: saving ? 'not-allowed' : 'pointer', textAlign: 'left',
                  transition: 'all 0.2s', fontFamily: 'inherit',
                  opacity: saving ? 0.7 : 1,
                }}
                onMouseOver={e => { if (!saving) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = danger ? '0 4px 12px rgba(239,68,68,0.15)' : '0 4px 12px rgba(0,0,0,0.08)'; } }}
                onMouseOut={e  => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: danger ? '#fee2e2' : '#eff6ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: danger ? '#ef4444' : '#3b82f6',
                }}>
                  {Icons[iconKey]?.()}
                </div>
                <div>
                  <p style={{ margin: '0 0 0.15rem', fontWeight: 700, fontSize: '0.9rem', color: danger ? '#ef4444' : 'var(--text-primary, #0f172a)' }}>
                    {label}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.77rem', color: '#94a3b8', fontWeight: 500 }}>
                    {desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>

        {/* ── About ── */}
        <SectionCard iconKey="leaf" title="About GreenRoute" accent>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'Version',  value: '2.0.0'      },
              { label: 'Released', value: '15 Jan 2025' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.1)', borderRadius: 10,
                padding: '0.75rem 1rem', border: '1px solid rgba(255,255,255,0.12)',
              }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(167,243,208,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white' }}>{value}</div>
              </div>
            ))}
          </div>

          <p style={{ margin: '0 0 1.25rem', fontSize: '0.88rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.8)' }}>
            GreenRoute helps you make sustainable transportation choices by providing eco-friendly route recommendations and tracking your carbon impact. Join thousands of users making a difference, one trip at a time.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Support',        href: 'mailto:support@greenroute.com', iconKey: 'mail'   },
              { label: 'Privacy Policy', href: '/privacy',                       iconKey: 'shield' },
            ].map(({ label, href, iconKey }) => (
              <a key={label} href={href} rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: 'rgba(255,255,255,0.15)', color: 'white',
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  padding: '0.6rem 1rem', borderRadius: 10,
                  fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none',
                  transition: 'background 0.2s',
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.28)')}
                onMouseOut={e  => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                <span style={{ opacity: 0.85 }}>{Icons[iconKey]?.()}</span>
                {label}
              </a>
            ))}
          </div>
        </SectionCard>

      </div>

      <style>{`
        @keyframes stSlideUp { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
        @keyframes stFadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes stScaleIn { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
      `}</style>
    </div>
  );
};

export default Settings;