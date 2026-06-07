import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const MODE_META = {
  walking: { icon: '🚶', color: '#10b981', bg: '#ecfdf5', label: 'Walking',  gradient: 'linear-gradient(135deg,#10b981,#34d399)' },
  cycling: { icon: '🚴', color: '#3b82f6', bg: '#eff6ff', label: 'Cycling',  gradient: 'linear-gradient(135deg,#3b82f6,#60a5fa)' },
  driving: { icon: '🚗', color: '#f59e0b', bg: '#fffbeb', label: 'Driving',  gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)' },
  transit: { icon: '🚌', color: '#8b5cf6', bg: '#f5f3ff', label: 'Transit',  gradient: 'linear-gradient(135deg,#8b5cf6,#a78bfa)' },
};

const getMeta = (mode = '') => MODE_META[mode.toLowerCase()] || MODE_META.transit;

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
const fmt = {
  co2:  (v) => parseFloat(v || 0).toFixed(2),
  dist: (v) => parseFloat(v || 0).toFixed(1),
  dur:  (m) => {
    m = parseInt(m) || 0;
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60 > 0 ? `${m % 60}m` : ''}`.trim();
  },
  date: (d) => {
    const date = new Date(d);
    const now  = new Date();
    const diff = Math.floor((now - date) / 86400000);
    if (diff === 0) return `Today · ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    if (diff === 1) return `Yesterday · ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    if (diff < 7)  return `${diff} days ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },
};

const ecoEquiv = (kg) => {
  kg = parseFloat(kg) || 0;
  if (kg >= 21.7) return `🌳 ${(kg / 21.7).toFixed(1)} trees absorbed`;
  if (kg >= 0.5)  return `☕ ${Math.round(kg / 0.021)} coffees worth`;
  if (kg >= 0.05) return `🔋 ${Math.round(kg / 0.008)} phone charges`;
  return `🌿 Every kg counts!`;
};

const calcStats = (trips) => {
  const totalCO2      = trips.reduce((s, t) => s + (parseFloat(t.co2Saved)  || 0), 0);
  const totalDistance = trips.reduce((s, t) => s + (parseFloat(t.distance)  || 0), 0);
  const totalDuration = trips.reduce((s, t) => s + (parseInt(t.duration)    || 0), 0);
  const totalCalories = trips.reduce((s, t) => s + (parseInt(t.calories)    || 0), 0);
  const modeCount = {};
  trips.forEach(t => { const m = t.mode?.toLowerCase() || 'transit'; modeCount[m] = (modeCount[m] || 0) + 1; });
  const favMode = Object.keys(modeCount).sort((a, b) => modeCount[b] - modeCount[a])[0] || 'walking';
  return { totalCO2, totalDistance, totalDuration, totalCalories, totalTrips: trips.length, favMode, modeCount };
};

/* ─── Sub-components ────────────────────────────────────────────────────────── */

/* Skeleton pulse card */
const SkeletonCard = () => (
  <div style={{ ...S.tripCard, padding: '1.5rem', gap: 0 }}>
    <style>{`@keyframes skPulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    {[1,2,3].map(i => (
      <div key={i} style={{ height: i === 1 ? 18 : 12, background:'#e2e8f0', borderRadius:8,
        marginBottom: i < 3 ? 10 : 0, width: i === 1 ? '65%' : i === 2 ? '40%' : '50%',
        animation:'skPulse 1.5s ease-in-out infinite', animationDelay:`${i*0.15}s` }} />
    ))}
  </div>
);

/* Stat card with animated counter */
const StatCard = ({ icon, value, label, sub, color, bg }) => {
  const [display, setDisplay] = useState(0);
  const target = parseFloat(value) || 0;
  const raf = useRef();
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(target * ease);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);

  const isInt = Number.isInteger(target);
  const shown = isInt ? Math.round(display) : display.toFixed(1);

  return (
    <div style={{ ...S.statCard, background: bg, border: `1.5px solid ${color}22` }}>
      <div style={{ ...S.statIconBg, background: `${color}18` }}>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '1.65rem', fontWeight: 800, color, letterSpacing: '-0.03em', lineHeight: 1 }}>
          {shown}{sub}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
};

/* Mode pill filter */
const Pill = ({ label, icon, active, color, onClick }) => (
  <button onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.45rem 1rem', borderRadius: 999, border: 'none', cursor: 'pointer',
    fontWeight: 700, fontSize: '0.82rem', fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    background: active ? color : '#f1f5f9',
    color: active ? '#fff' : '#64748b',
    boxShadow: active ? `0 4px 12px ${color}40` : 'none',
    transform: active ? 'translateY(-1px)' : 'none',
  }}>
    <span>{icon}</span>{label}
  </button>
);

/* Mode donut mini-chart */
const ModeDonut = ({ modeCount, total }) => {
  const modes = Object.entries(modeCount).sort((a,b) => b[1]-a[1]);
  const r = 28, c = 2 * Math.PI * r;
  let offset = 0;
  const slices = modes.map(([m, count]) => {
    const meta = getMeta(m);
    const pct  = count / total;
    const slice = { mode: m, color: meta.color, pct, offset, dash: pct * c, gap: (1 - pct) * c };
    offset += pct * c;
    return slice;
  });
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'1.25rem', flexWrap:'wrap' }}>
      <svg width={70} height={70} viewBox="0 0 70 70">
        {slices.map((sl, i) => (
          <circle key={i} cx={35} cy={35} r={r}
            fill="none" stroke={sl.color} strokeWidth={10}
            strokeDasharray={`${sl.dash} ${sl.gap}`}
            strokeDashoffset={-sl.offset + c * 0.25}
            style={{ transform:'rotate(-90deg)', transformOrigin:'35px 35px', transition:'stroke-dasharray 0.8s ease' }}
          />
        ))}
        <circle cx={35} cy={35} r={18} fill="white"/>
        <text x={35} y={39} textAnchor="middle" fontSize={13} fontWeight={800} fill="#0f172a">{total}</text>
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {slices.map(sl => {
          const meta = getMeta(sl.mode);
          return (
            <div key={sl.mode} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:meta.color, flexShrink:0 }}/>
              <span style={{ fontSize:'0.78rem', fontWeight:600, color:'#475569' }}>{meta.label}</span>
              <span style={{ fontSize:'0.78rem', fontWeight:800, color:meta.color, marginLeft:'auto', paddingLeft:8 }}>
                {Math.round(sl.pct * 100)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* Trip card */
const TripCard = ({ trip, onCopy, copiedId }) => {
  const meta = getMeta(trip.mode);
  const co2  = parseFloat(trip.co2Saved) || 0;
  const isHighImpact = co2 > 2;

  return (
    <div style={S.tripCard}>
      {/* Left accent bar */}
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, borderRadius:'16px 0 0 16px', background: meta.gradient }}/>

      {/* Mode badge */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'0.75rem', flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.85rem', flex:1, minWidth:0 }}>
          <div style={{
            width:46, height:46, borderRadius:14, background:meta.bg,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'1.4rem', flexShrink:0, boxShadow:`0 2px 8px ${meta.color}25`,
          }}>
            {meta.icon}
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:'0.9rem', fontWeight:800, color:'#0f172a', lineHeight:1.3,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {trip.originName?.split(',')[0]}
            </div>
            <div style={{ fontSize:'0.75rem', color:'#94a3b8', fontWeight:600, margin:'3px 0' }}>
              ↓
            </div>
            <div style={{ fontSize:'0.9rem', fontWeight:800, color:'#0f172a', lineHeight:1.3,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {trip.destinationName?.split(',')[0]}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
          <span style={{
            padding:'0.3rem 0.75rem', borderRadius:999, fontSize:'0.72rem', fontWeight:800,
            background: meta.gradient, color:'white', letterSpacing:'0.02em',
          }}>
            {meta.label}
          </span>
          {isHighImpact && (
            <span style={{ padding:'0.25rem 0.6rem', borderRadius:999, fontSize:'0.68rem', fontWeight:700,
              background:'linear-gradient(135deg,#fbbf24,#f59e0b)', color:'white' }}>
              🏆 High Impact
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height:1, background:'#f1f5f9', margin:'1rem 0' }}/>

      {/* Metrics row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(72px,1fr))', gap:'0.5rem' }}>
        {[
          { icon:'⏱️', val: fmt.dur(trip.duration), label:'Duration'  },
          { icon:'📍', val: `${fmt.dist(trip.distance)}km`, label:'Distance' },
          { icon:'🌱', val: `${fmt.co2(trip.co2Saved)}kg`, label:'CO₂ Saved', color:'#10b981' },
          ...(trip.calories > 0 ? [{ icon:'🔥', val: trip.calories, label:'Calories' }] : []),
        ].map((m, i) => (
          <div key={i} style={{ background:'#f8fafc', borderRadius:12, padding:'0.65rem 0.5rem', textAlign:'center' }}>
            <div style={{ fontSize:'1rem', marginBottom:2 }}>{m.icon}</div>
            <div style={{ fontSize:'0.85rem', fontWeight:800, color: m.color || '#0f172a', lineHeight:1 }}>{m.val}</div>
            <div style={{ fontSize:'0.68rem', color:'#94a3b8', fontWeight:600, marginTop:3 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Eco equiv + date */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'0.85rem', gap:'0.5rem', flexWrap:'wrap' }}>
        <span style={{ fontSize:'0.76rem', color:'#065f46', fontWeight:600,
          background:'#ecfdf5', padding:'0.3rem 0.75rem', borderRadius:999,
          border:'1px solid #a7f3d0' }}>
          {ecoEquiv(trip.co2Saved)}
        </span>
        <span style={{ fontSize:'0.72rem', color:'#94a3b8', fontWeight:500 }}>
          {fmt.date(trip.date)}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.85rem' }}>
        <button onClick={() => onCopy(trip)} style={{
          ...S.actionBtn, flex:1, background:'#f8fafc', color:'#475569',
          ...(copiedId === (trip._id || trip.date) ? { background:'#ecfdf5', color:'#10b981' } : {})
        }}>
          {copiedId === (trip._id || trip.date) ? '✅ Copied!' : '📋 Copy'}
        </button>
        <button onClick={() => {
          const p = new URLSearchParams({ from: trip.originName, to: trip.destinationName, mode: trip.mode });
          window.location.href = `/?${p}`;
        }} style={{ ...S.actionBtn, flex:1, background: meta.bg, color: meta.color }}>
          🔄 Repeat
        </button>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────────── */
const TripHistory = ({ user }) => {
  const [trips,      setTrips]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modeFilter, setModeFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [sortBy,     setSortBy]     = useState('date');
  const [copiedId,   setCopiedId]   = useState(null);
  const [clearing,   setClearing]   = useState(false);
  const [showConfirm,setShowConfirm]= useState(false);
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { loadTrips(); }, []);

  const loadTrips = async () => {
    try {
      const { data } = await axios.get('/api/history');
      setTrips(data);
    } catch (e) {
      showToast('Failed to load trips', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (trip) => {
    const id = trip._id || trip.date;
    const text = `${trip.originName} → ${trip.destinationName} | ${getMeta(trip.mode).label} | ${fmt.dist(trip.distance)}km | ${fmt.dur(trip.duration)} | ${fmt.co2(trip.co2Saved)}kg CO₂ saved`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await axios.delete('/api/history');
      setTrips([]);
      setShowConfirm(false);
      showToast('All trips cleared!', 'success');
    } catch {
      showToast('Failed to clear history', 'error');
    } finally {
      setClearing(false);
    }
  };

  const exportCSV = () => {
    if (!trips.length) return;
    const rows = [
      ['Date','From','To','Mode','Distance (km)','Duration (min)','CO₂ Saved (kg)','Calories'],
      ...trips.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.originName, t.destinationName, t.mode,
        t.distance, t.duration, t.co2Saved, t.calories || 0
      ])
    ].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([rows], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `greenroute-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast('CSV exported!');
  };

  /* ── Filtering + sorting ── */
  const filtered = (() => {
    let out = [...trips];
    if (modeFilter !== 'all') out = out.filter(t => t.mode?.toLowerCase() === modeFilter);
    if (timeFilter !== 'all') {
      const cut = new Date();
      if (timeFilter === 'today')  { cut.setHours(0,0,0,0); }
      if (timeFilter === 'week')   { cut.setDate(cut.getDate()-7); }
      if (timeFilter === 'month')  { cut.setMonth(cut.getMonth()-1); }
      out = out.filter(t => new Date(t.date) >= cut);
    }
    if (sortBy === 'co2')  out.sort((a,b) => parseFloat(b.co2Saved) - parseFloat(a.co2Saved));
    if (sortBy === 'dist') out.sort((a,b) => parseFloat(b.distance) - parseFloat(a.distance));
    return out;
  })();

  const stats = calcStats(trips);
  const filtStats = calcStats(filtered);

  /* ─── Render ─── */
  return (
    <div style={S.page}>
      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', top:20, right:20, zIndex:9999,
          background: toast.type === 'error' ? '#fee2e2' : '#ecfdf5',
          color:       toast.type === 'error' ? '#dc2626' : '#065f46',
          border:`1.5px solid ${toast.type === 'error' ? '#fca5a5' : '#6ee7b7'}`,
          borderRadius:14, padding:'0.75rem 1.25rem',
          fontWeight:700, fontSize:'0.88rem', boxShadow:'0 8px 32px rgba(0,0,0,0.12)',
          animation:'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{ fontSize:'2.5rem', textAlign:'center', marginBottom:'1rem' }}>🗑️</div>
            <h3 style={{ margin:'0 0 0.5rem', fontSize:'1.15rem', fontWeight:800, textAlign:'center' }}>
              Clear all history?
            </h3>
            <p style={{ margin:'0 0 1.5rem', color:'#64748b', fontSize:'0.88rem', textAlign:'center', lineHeight:1.5 }}>
              This will permanently delete all {trips.length} trips. This cannot be undone.
            </p>
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button onClick={() => setShowConfirm(false)} style={{ ...S.actionBtn, flex:1, padding:'0.75rem', background:'#f1f5f9', color:'#475569', borderRadius:12, border:'none', fontFamily:'inherit', fontWeight:700, cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={handleClear} disabled={clearing} style={{ ...S.actionBtn, flex:1, padding:'0.75rem', background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'white', borderRadius:12, border:'none', fontFamily:'inherit', fontWeight:700, cursor:'pointer' }}>
                {clearing ? 'Clearing…' : 'Yes, delete all'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <h2 style={{ margin:'0 0 0.25rem', fontSize:'1.75rem', fontWeight:800, letterSpacing:'-0.03em' }}>
            🗺️ Trip History
          </h2>
          <p style={{ margin:0, color:'#64748b', fontSize:'0.92rem' }}>
            {trips.length > 0 ? `${trips.length} eco-friendly trips recorded` : 'Your green journey starts here'}
          </p>
        </div>
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
          <button onClick={exportCSV} disabled={!trips.length} style={S.headerBtn}>
            📥 Export CSV
          </button>
          <button onClick={() => setShowConfirm(true)} disabled={!trips.length} style={{ ...S.headerBtn, background:'#fef2f2', color:'#dc2626', borderColor:'#fca5a5' }}>
            🗑️ Clear All
          </button>
        </div>
      </div>

      {/* ── Stats grid ── */}
      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'0.75rem', marginBottom:'1.5rem' }}>
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : trips.length > 0 ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'0.75rem', marginBottom:'1.5rem' }}>
          <StatCard icon="🌱" value={stats.totalCO2}      sub=" kg" label="Total CO₂ Saved"   color="#10b981" bg="#f0fdf4" />
          <StatCard icon="🗺️" value={stats.totalTrips}    sub=""    label="Eco-Friendly Trips" color="#3b82f6" bg="#eff6ff" />
          <StatCard icon="📍" value={stats.totalDistance} sub=" km" label="Green Distance"     color="#8b5cf6" bg="#f5f3ff" />
          <StatCard icon="🔥" value={stats.totalCalories} sub=""    label="Calories Burned"    color="#f59e0b" bg="#fffbeb" />
        </div>
      ) : null}

      {/* ── Impact + mode split (only if trips exist) ── */}
      {!loading && trips.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'1.5rem' }}>
          {/* CO2 impact card */}
          <div style={{ ...S.card, background:'linear-gradient(135deg,#064e3b,#065f46)', color:'white', overflow:'hidden', position:'relative' }}>
            <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }}/>
            <div style={{ position:'absolute', bottom:-20, left:-10, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }}/>
            <div style={{ position:'relative', zIndex:1 }}>
              <div style={{ fontSize:'0.72rem', fontWeight:700, color:'rgba(167,243,208,0.7)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Environmental Impact</div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:8, marginBottom:12 }}>
                <div style={{ fontSize:'2.5rem', fontWeight:900, letterSpacing:'-0.04em', lineHeight:1 }}>{stats.totalCO2.toFixed(1)}</div>
                <div style={{ fontSize:'1rem', fontWeight:600, opacity:0.7, marginBottom:4 }}>kg CO₂ saved</div>
              </div>
              <div style={{ display:'flex', gap:'1.25rem' }}>
                {[
                  { icon:'🌳', val:`${Math.max(1, (stats.totalCO2/21.7).toFixed(1))}`, lbl:'trees/year equiv.' },
                  { icon:'⛽', val:`${(stats.totalDistance*0.08).toFixed(0)}L`, lbl:'fuel saved' },
                ].map((s,i) => (
                  <div key={i}>
                    <div style={{ fontSize:'1.1rem', fontWeight:800, color:'#4ade80' }}>{s.icon} {s.val}</div>
                    <div style={{ fontSize:'0.7rem', opacity:0.6, marginTop:2 }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mode breakdown */}
          <div style={S.card}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>Mode Breakdown</div>
            <ModeDonut modeCount={stats.modeCount} total={stats.totalTrips} />
          </div>
        </div>
      )}

      {/* ── Filters bar ── */}
      {trips.length > 0 && (
        <div style={S.filtersBar}>
          <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap', flex:1 }}>
            {[
              { key:'all',     label:'All',     icon:'🗺️' },
              { key:'walking', label:'Walking',  icon:'🚶' },
              { key:'cycling', label:'Cycling',  icon:'🚴' },
              { key:'driving', label:'Driving',  icon:'🚗' },
              { key:'transit', label:'Transit',  icon:'🚌' },
            ].map(({ key, label, icon }) => (
              <Pill
                key={key}
                label={label}
                icon={icon}
                active={modeFilter === key}
                color={key === 'all' ? '#10b981' : getMeta(key).color}
                onClick={() => setModeFilter(key)}
              />
            ))}
          </div>

          <div style={{ display:'flex', gap:'0.5rem', flexShrink:0 }}>
            <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)} style={S.select}>
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={S.select}>
              <option value="date">Newest first</option>
              <option value="co2">Most CO₂ saved</option>
              <option value="dist">Longest trip</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Trip list ── */}
      {loading ? (
        <div style={S.grid}>
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={S.emptyState}>
          <div style={{ fontSize:'4rem', marginBottom:'1rem' }}>
            {trips.length === 0 ? '🌱' : '🔍'}
          </div>
          <h3 style={{ margin:'0 0 0.5rem', fontSize:'1.25rem', fontWeight:800 }}>
            {trips.length === 0 ? 'No trips yet' : 'No trips match your filters'}
          </h3>
          <p style={{ margin:'0 0 1.5rem', color:'#64748b', maxWidth:340, lineHeight:1.6 }}>
            {trips.length === 0
              ? 'Plan your first eco-friendly route and start tracking your positive impact on the planet!'
              : 'Try changing the mode or time filters to find your trips.'}
          </p>
          <a href="/" style={{
            display:'inline-flex', alignItems:'center', gap:'0.5rem',
            padding:'0.75rem 1.5rem', borderRadius:14,
            background:'linear-gradient(135deg,#10b981,#059669)',
            color:'white', fontWeight:700, fontSize:'0.9rem', textDecoration:'none',
            boxShadow:'0 4px 14px rgba(16,185,129,0.35)',
          }}>
            🗺️ {trips.length === 0 ? 'Plan First Route' : 'Plan New Route'}
          </a>
        </div>
      ) : (
        <>
          {/* Result count bar */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.75rem' }}>
            <span style={{ fontSize:'0.8rem', fontWeight:600, color:'#64748b' }}>
              Showing <strong style={{ color:'#0f172a' }}>{filtered.length}</strong> of {trips.length} trips
              {(modeFilter !== 'all' || timeFilter !== 'all') && (
                <button onClick={() => { setModeFilter('all'); setTimeFilter('all'); }} style={{
                  marginLeft:8, background:'none', border:'none', color:'#10b981', fontWeight:700,
                  cursor:'pointer', fontSize:'0.78rem', fontFamily:'inherit',
                }}>
                  Clear filters ×
                </button>
              )}
            </span>
            <span style={{ fontSize:'0.8rem', color:'#64748b', fontWeight:500 }}>
              {filtStats.totalCO2.toFixed(1)} kg CO₂ · {filtStats.totalDistance.toFixed(0)} km
            </span>
          </div>

          <div style={S.grid}>
            {filtered.map((trip, i) => (
              <TripCard
                key={trip._id || i}
                trip={trip}
                onCopy={handleCopy}
                copiedId={copiedId}
              />
            ))}
          </div>
        </>
      )}

      <style>{`
        @keyframes toastIn {
          from { opacity:0; transform:translateY(-12px) scale(0.95); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const S = {
  page: {
    maxWidth: 960,
    margin: '0 auto',
    fontFamily: 'inherit',
    paddingBottom: '3rem',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '1rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  headerBtn: {
    padding: '0.55rem 1.1rem',
    borderRadius: 12,
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    color: '#374151',
    fontWeight: 700,
    fontSize: '0.82rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  card: {
    background: 'var(--bg-primary, #fff)',
    borderRadius: 20,
    padding: '1.25rem',
    border: '1px solid #f1f5f9',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  },
  statCard: {
    borderRadius: 18,
    padding: '1.1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.9rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  filtersBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
    background: 'var(--bg-primary, #fff)',
    borderRadius: 16,
    padding: '0.75rem 1rem',
    border: '1px solid #f1f5f9',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  select: {
    padding: '0.45rem 0.75rem',
    borderRadius: 10,
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    color: '#374151',
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    outline: 'none',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '0.85rem',
  },
  tripCard: {
    position: 'relative',
    background: 'var(--bg-primary, #fff)',
    borderRadius: 18,
    padding: '1.1rem 1.1rem 1.1rem 1.4rem',
    border: '1px solid #f1f5f9',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    overflow: 'hidden',
  },
  actionBtn: {
    padding: '0.5rem 0.75rem',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.78rem',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '4rem 2rem',
    background: 'var(--bg-primary, #fff)',
    borderRadius: 24,
    border: '1px solid #f1f5f9',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.6)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9000,
    padding: '1rem',
  },
  modal: {
    background: '#fff',
    borderRadius: 24,
    padding: '2rem',
    maxWidth: 380,
    width: '100%',
    boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
  },
};

export default TripHistory;
