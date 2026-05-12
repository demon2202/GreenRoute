import React, { useState, useCallback } from 'react';

// ─── Sub-components ────────────────────────────────────────────────────────────

const SectionCard = ({ icon, title, subtitle, children, gradient = false }) => (
  <div
    className="card card-elevated"
    style={
      gradient
        ? {
            background:
              'linear-gradient(135deg, var(--primary-green) 0%, var(--primary-green-light) 100%)',
            color: 'white',
            border: 'none',
          }
        : {}
    }
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: subtitle ? '0.5rem' : '1.5rem',
      }}
    >
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <h3
        style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: '700',
          color: gradient ? 'white' : 'var(--text-primary)',
        }}
      >
        {title}
      </h3>
    </div>
    {subtitle && (
      <p
        style={{
          margin: '0 0 1.5rem 0',
          fontSize: '0.9rem',
          color: gradient ? 'rgba(255,255,255,0.8)' : 'var(--text-light)',
        }}
      >
        {subtitle}
      </p>
    )}
    {children}
  </div>
);

const Toast = ({ message, type }) => {
  if (!message) return null;

  const styles = {
    success: {
      bg: 'var(--light-green-bg)',
      color: 'var(--primary-green)',
      border: 'var(--primary-green)',
    },
    error: { bg: '#fee2e2', color: '#dc2626', border: '#dc2626' },
    info: { bg: '#eff6ff', color: '#2563eb', border: '#2563eb' },
  };

  const s = styles[type] || styles.info;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        backgroundColor: s.bg,
        color: s.color,
        border: `2px solid ${s.border}`,
        padding: '0.875rem 1.25rem',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '1.5rem',
        fontWeight: '600',
        fontSize: '0.95rem',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        animation: 'slideUp 0.3s ease',
      }}
    >
      {message}
    </div>
  );
};

const Toggle = ({ checked, onChange, id }) => (
  <button
    role="switch"
    aria-checked={checked}
    id={id}
    onClick={onChange}
    style={{
      width: '52px',
      height: '28px',
      borderRadius: '14px',
      background: checked ? 'var(--primary-green)' : 'var(--border-color)',
      border: 'none',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 0.25s ease',
      flexShrink: 0,
      outline: 'none',
    }}
    onFocus={(e) =>
      (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.3)')
    }
    onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
  >
    <span
      style={{
        position: 'absolute',
        top: '3px',
        left: checked ? '25px' : '3px',
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        background: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.25s ease',
        display: 'block',
      }}
    />
  </button>
);

const Avatar = ({ user }) => (
  <div style={{ position: 'relative', flexShrink: 0 }}>
    {user.image ? (
      <img
        src={user.image}
        alt={`${user.displayName}'s avatar`}
        style={{
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          border: '3px solid var(--primary-green)',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    ) : (
      <div
        aria-label="Profile initial"
        style={{
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          background:
            'linear-gradient(135deg, var(--primary-green), var(--primary-green-light))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '2rem',
          fontWeight: '700',
          userSelect: 'none',
        }}
      >
        {user.displayName?.charAt(0).toUpperCase() || 'U'}
      </div>
    )}
  </div>
);

// ─── Notification rows config ──────────────────────────────────────────────────

const NOTIFICATION_OPTIONS = [
  {
    key: 'routeRecommendations',
    icon: '🗺️',
    label: 'Route recommendations',
    description: 'Personalised eco-friendly route suggestions',
  },
  {
    key: 'weatherAlerts',
    icon: '🌤️',
    label: 'Weather alerts',
    description: 'Real-time weather updates for your routes',
  },
  {
    key: 'monthlyReports',
    icon: '📊',
    label: 'Monthly impact reports',
    description: 'Carbon savings and achievements summary',
  },
  {
    key: 'achievements',
    icon: '🏆',
    label: 'Achievement milestones',
    description: 'Celebrate your sustainability wins',
  },
];

const THEME_OPTIONS = [
  {
    value: 'light',
    label: 'Light',
    icon: '☀️',
    description: 'Clean & bright',
    accent: '#f59e0b',
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: '🌙',
    description: 'Easy on the eyes',
    accent: '#3b82f6',
  },
  {
    value: 'auto',
    label: 'System',
    icon: '💻',
    description: 'Match OS setting',
    accent: '#8b5cf6',
  },
];

// ─── Hooks ─────────────────────────────────────────────────────────────────────

const useToast = () => {
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'info' }), duration);
  }, []);

  return { toast, showToast };
};

// ─── Main Component ────────────────────────────────────────────────────────────

const Settings = ({ user, theme, onThemeChange }) => {
  const { toast, showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    displayName: user.displayName || '',
    email: user.email || '',
  });
  const [profileErrors, setProfileErrors] = useState({});

  const [notifications, setNotifications] = useState({
    routeRecommendations: true,
    weatherAlerts: true,
    monthlyReports: true,
    achievements: false,
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const withSaving = useCallback(
    async (fn) => {
      if (saving) return;
      setSaving(true);
      try {
        await fn();
      } catch {
        showToast('Something went wrong. Please try again.', 'error');
      } finally {
        setSaving(false);
      }
    },
    [saving, showToast]
  );

  const validateProfile = () => {
    const errors = {};
    if (!profileData.displayName.trim())
      errors.displayName = 'Display name is required';
    if (!profileData.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email))
      errors.email = 'Enter a valid email address';
    return errors;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleThemeChange = (value) =>
    withSaving(async () => {
      await onThemeChange(value);
      showToast('Theme updated successfully', 'success');
    });

  const handleProfileUpdate = () => {
    const errors = validateProfile();
    if (Object.keys(errors).length) {
      setProfileErrors(errors);
      return;
    }
    setProfileErrors({});
    withSaving(async () => {
      await new Promise((r) => setTimeout(r, 900));
      showToast('Profile saved successfully', 'success');
    });
  };

  const handleNotificationToggle = (key) =>
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleClearHistory = () => {
    if (
      !window.confirm(
        'Delete all trip history? This cannot be undone.'
      )
    )
      return;
    withSaving(async () => {
      await new Promise((r) => setTimeout(r, 800));
      showToast('Trip history cleared', 'success');
    });
  };

  const handleExport = () =>
    withSaving(async () => {
      showToast('Preparing your export…', 'info', 2000);
      await new Promise((r) => setTimeout(r, 2000));
      showToast('Export ready — check your downloads', 'success', 4000);
    });

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.75rem', fontWeight: '800' }}>
          Settings
        </h2>
        <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.95rem' }}>
          Manage your account and preferences
        </p>
      </div>

      <Toast message={toast.message} type={toast.type} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* ── Profile ─────────────────────────────────────────────────────── */}
        <SectionCard icon="👤" title="Profile">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              marginBottom: '1.75rem',
              flexWrap: 'wrap',
            }}
          >
            <Avatar user={user} />
            <div>
              <p
                style={{
                  margin: '0 0 0.2rem',
                  fontWeight: '700',
                  fontSize: '1.15rem',
                  color: 'var(--text-primary)',
                }}
              >
                {user.displayName}
              </p>
              <p
                style={{
                  margin: '0 0 0.75rem',
                  fontSize: '0.9rem',
                  color: 'var(--text-light)',
                }}
              >
                {user.email}
              </p>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'var(--light-green-bg)',
                  border: '1.5px solid var(--primary-green)',
                  color: 'var(--primary-green)',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  padding: '0.3rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                🌱 Eco Champion
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            {/* Display name */}
            <div>
              <label
                htmlFor="displayName"
                style={{
                  display: 'block',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  marginBottom: '0.4rem',
                  color: 'var(--text-primary)',
                }}
              >
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={profileData.displayName}
                onChange={(e) => {
                  setProfileData((p) => ({
                    ...p,
                    displayName: e.target.value,
                  }));
                  if (profileErrors.displayName)
                    setProfileErrors((p) => ({ ...p, displayName: '' }));
                }}
                placeholder="Your name"
                aria-describedby={
                  profileErrors.displayName ? 'displayName-error' : undefined
                }
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  border: profileErrors.displayName
                    ? '2px solid #dc2626'
                    : '2px solid var(--border-color)',
                }}
              />
              {profileErrors.displayName && (
                <p
                  id="displayName-error"
                  role="alert"
                  style={{
                    margin: '0.35rem 0 0',
                    fontSize: '0.8rem',
                    color: '#dc2626',
                  }}
                >
                  {profileErrors.displayName}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  marginBottom: '0.4rem',
                  color: 'var(--text-primary)',
                }}
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => {
                  setProfileData((p) => ({ ...p, email: e.target.value }));
                  if (profileErrors.email)
                    setProfileErrors((p) => ({ ...p, email: '' }));
                }}
                placeholder="you@example.com"
                aria-describedby={
                  profileErrors.email ? 'email-error' : undefined
                }
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  border: profileErrors.email
                    ? '2px solid #dc2626'
                    : '2px solid var(--border-color)',
                }}
              />
              {profileErrors.email && (
                <p
                  id="email-error"
                  role="alert"
                  style={{
                    margin: '0.35rem 0 0',
                    fontSize: '0.8rem',
                    color: '#dc2626',
                  }}
                >
                  {profileErrors.email}
                </p>
              )}
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleProfileUpdate}
            disabled={saving}
            style={{ minWidth: '180px' }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </SectionCard>

        {/* ── Appearance ──────────────────────────────────────────────────── */}
        <SectionCard
          icon="🎨"
          title="Appearance"
          subtitle="Choose how GreenRoute looks on your device"
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
            }}
          >
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleThemeChange(opt.value)}
                  disabled={saving}
                  aria-pressed={active}
                  style={{
                    padding: '1.25rem 1rem',
                    border: active
                      ? '2px solid var(--primary-green)'
                      : '2px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    background: active
                      ? 'var(--light-green-bg)'
                      : 'var(--bg-secondary)',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    position: 'relative',
                    outline: 'none',
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.boxShadow =
                      '0 0 0 3px rgba(34,197,94,0.25)')
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.boxShadow = 'none')
                  }
                  onMouseOver={(e) => {
                    if (!active && !saving) {
                      e.currentTarget.style.borderColor =
                        'var(--primary-green)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!active) {
                      e.currentTarget.style.borderColor =
                        'var(--border-color)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {/* Colour accent dot */}
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: opt.accent,
                      margin: '0 auto 0.65rem',
                    }}
                  />
                  <p
                    style={{
                      margin: '0 0 0.25rem',
                      fontWeight: '700',
                      fontSize: '0.95rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {opt.icon} {opt.label}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.8rem',
                      color: 'var(--text-light)',
                    }}
                  >
                    {opt.description}
                  </p>

                  {active && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '0.6rem',
                        right: '0.6rem',
                        background: 'var(--primary-green)',
                        color: 'white',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* ── Notifications ────────────────────────────────────────────────── */}
        <SectionCard
          icon="🔔"
          title="Notifications"
          subtitle="Choose what updates you want to receive"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {NOTIFICATION_OPTIONS.map(({ key, icon, label, description }) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '2px solid',
                  borderColor: notifications[key]
                    ? 'var(--primary-green)'
                    : 'var(--border-color)',
                  background: notifications[key]
                    ? 'var(--light-green-bg)'
                    : 'var(--bg-secondary)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onClick={() => handleNotificationToggle(key)}
              >
                <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>
                  {icon}
                </span>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: '0 0 0.15rem',
                      fontWeight: '600',
                      fontSize: '0.95rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {label}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.82rem',
                      color: 'var(--text-light)',
                    }}
                  >
                    {description}
                  </p>
                </div>
                <Toggle
                  id={`notif-${key}`}
                  checked={notifications[key]}
                  onChange={() => handleNotificationToggle(key)}
                />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Privacy & Data ───────────────────────────────────────────────── */}
        <SectionCard
          icon="🔒"
          title="Privacy & Data"
          subtitle="Manage how your data is stored and used"
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <button
              className="btn btn-secondary"
              onClick={handleExport}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                height: 'auto',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>📥</span>
              <div>
                <p style={{ margin: '0 0 0.15rem', fontWeight: '700', fontSize: '0.95rem' }}>
                  Export My Data
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.8rem',
                    color: 'var(--text-light)',
                    fontWeight: '400',
                  }}
                >
                  Download all your trip history
                </p>
              </div>
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleClearHistory}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                height: 'auto',
                textAlign: 'left',
                borderColor: '#dc2626',
                color: '#dc2626',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>🗑️</span>
              <div>
                <p style={{ margin: '0 0 0.15rem', fontWeight: '700', fontSize: '0.95rem' }}>
                  Clear Trip History
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.8rem',
                    opacity: 0.75,
                    fontWeight: '400',
                  }}
                >
                  Permanently delete all saved trips
                </p>
              </div>
            </button>
          </div>
        </SectionCard>

        {/* ── About ────────────────────────────────────────────────────────── */}
        <SectionCard icon="🌿" title="About GreenRoute" gradient>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.5rem',
              marginBottom: '1.25rem',
              fontSize: '0.9rem',
              opacity: 0.9,
            }}
          >
            <p style={{ margin: 0 }}>
              <strong>Version</strong>&nbsp;&nbsp;2.0.0
            </p>
            <p style={{ margin: 0 }}>
              <strong>Released</strong>&nbsp;&nbsp;15 Jan 2025
            </p>
          </div>

          <p
            style={{
              margin: '0 0 1.5rem',
              fontSize: '0.9rem',
              lineHeight: '1.7',
              opacity: 0.9,
            }}
          >
            GreenRoute helps you make sustainable transportation choices by
            providing eco-friendly route recommendations and tracking your
            carbon impact. Join thousands of users making a difference, one
            trip at a time.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {[
              {
                label: '📧 Support',
                href: 'mailto:support@greenroute.com',
                target: '_self',
              },
              {
                label: '📋 Privacy Policy',
                href: '/privacy',
                target: '_blank',
              },
            ].map(({ label, href, target }) => (
              <a
                key={label}
                href={href}
                target={target}
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  padding: '0.6rem 1.1rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  transition: 'background 0.2s ease',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background =
                    'rgba(255,255,255,0.25)')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background =
                    'rgba(255,255,255,0.15)')
                }
              >
                {label}
              </a>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default Settings;
