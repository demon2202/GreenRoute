import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/* ── SVG medal icons ── */
const Medal = ({ rank }) => {
  const colors = {
    1: { fill: '#fbbf24', text: '#78350f', label: '1st' }, // Gold
    2: { fill: '#94a3b8', text: '#1e293b', label: '2nd' }, // Silver
    3: { fill: '#b45309', text: '#fff',    label: '3rd' }, // Bronze
  };
  const c = colors[rank];
  if (!c) return null;
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%',
      background: c.fill, color: c.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 900, fontSize: '0.8rem',
      boxShadow: `0 4px 12px ${c.fill}45`,
      border: '2px solid rgba(255,255,255,0.4)',
      flexShrink: 0,
    }}>
      {c.label}
    </div>
  );
};

const TrophyIcon = ({ size = 40, color = '#fbbf24' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 0.5rem' }}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/>
    <path d="M12 2a5 5 0 0 0-5 5v5c0 2.21 2.24 4 5 4s5-1.79 5-4V7a5 5 0 0 0-5-5z"/>
  </svg>
);

const SearchIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

/* ── Avatar Circle ── */
const LeaderboardAvatar = ({ name, image, size = 40, border = 'none' }) => {
  const initials = (name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
      {image ? (
        <img src={image} alt={`${name}'s avatar`}
          style={{ width: size, height: size, borderRadius: '50%', border, objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary, #10b981), #34d399)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: size * 0.36, fontWeight: 800, userSelect: 'none',
          boxShadow: '0 2px 8px rgba(16,185,129,0.15)', border,
        }}>
          {initials}
        </div>
      )}
    </div>
  );
};

/* ── Main Component ── */
const Leaderboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('green'); // 'green' or 'territory'
  const [sortBy, setSortBy] = useState('empireScore'); // sorting inside territory tab

  // Green Tab Data
  const [greenList, setGreenList] = useState([]);
  const [currentGreenUser, setCurrentGreenUser] = useState(null);

  // Territory Tab Data
  const [territoryList, setTerritoryList] = useState([]);
  const [currentTerritoryUser, setCurrentTerritoryUser] = useState(null);
  const [mostActiveToday, setMostActiveToday] = useState([]);
  const [mostAggressive, setMostAggressive] = useState([]);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch travel/carbon leaderboard
  const fetchGreenLeaderboard = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/leaderboard');
      setGreenList(data.leaderboard || []);
      setCurrentGreenUser(data.currentUser || null);
    } catch (err) {
      console.error('Green leaderboard fetch error:', err);
    }
  }, []);

  // Fetch territory leaderboard
  const fetchTerritoryLeaderboard = useCallback(async () => {
    try {
      const [leaderboardRes, activeRes, aggressiveRes] = await Promise.all([
        axios.get(`/api/territory/leaderboard?sortBy=${sortBy}`),
        axios.get('/api/territory/leaderboard/active'),
        axios.get('/api/territory/leaderboard/aggressive')
      ]);
      setTerritoryList(leaderboardRes.data.leaderboard || []);
      setCurrentTerritoryUser(leaderboardRes.data.currentUser || null);
      setMostActiveToday(activeRes.data || []);
      setMostAggressive(aggressiveRes.data || []);
    } catch (err) {
      console.error('Territory leaderboard fetch error:', err);
    }
  }, [sortBy]);

  // Combined fetch handler
  const loadData = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'green') {
      await fetchGreenLeaderboard();
    } else {
      await fetchTerritoryLeaderboard();
    }
    setLoading(false);
  }, [activeTab, fetchGreenLeaderboard, fetchTerritoryLeaderboard]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter list by search query
  const getFilteredList = () => {
    const list = activeTab === 'green' ? greenList : territoryList;
    if (!query.trim()) return list;
    return list.filter(u => 
      (u.displayName || u.ownerName || '').toLowerCase().includes(query.toLowerCase())
    );
  };

  const filtered = getFilteredList();

  // Top 3 Podium
  const first = filtered.find(u => u.rank === 1);
  const second = filtered.find(u => u.rank === 2);
  const third = filtered.find(u => u.rank === 3);

  // Remaining list items (rank > 3)
  const remainingList = filtered.filter(u => u.rank > 3);

  if (loading) {
    return (
      <div style={{ width: '100%', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="bl-wrap" style={{ animation: 'blBounce 2s infinite ease-in-out' }}>
          <div style={{ width: 48, height: 48, border: '4px solid var(--border-color, #e2e8f0)', borderTopColor: 'var(--primary, #10b981)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
        <p style={{ marginTop: '1.25rem', color: 'var(--text-secondary, #64748b)', fontWeight: 600, fontSize: '0.95rem' }}>Loading Rankings…</p>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes blBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto', fontFamily: 'inherit', paddingBottom: '3.5rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary, #0f172a)' }}>
            Leaderboards
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary, #64748b)', fontSize: '0.92rem' }}>
            Compete for the highest green impact or dominate the map.
          </p>
        </div>

        {/* Tab Selector */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-secondary, #fff)',
          border: '1.5px solid var(--border-color, #e2e8f0)',
          borderRadius: '14px',
          padding: '4px'
        }}>
          <button
            onClick={() => { setActiveTab('green'); setQuery(''); }}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              background: activeTab === 'green' ? 'var(--primary, #10b981)' : 'transparent',
              color: activeTab === 'green' ? '#fff' : 'var(--text-secondary, #64748b)',
              transition: 'all 0.2s'
            }}
          >
            Green Journeys
          </button>
          <button
            onClick={() => { setActiveTab('territory'); setQuery(''); }}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              background: activeTab === 'territory' ? 'var(--primary, #10b981)' : 'transparent',
              color: activeTab === 'territory' ? '#fff' : 'var(--text-secondary, #64748b)',
              transition: 'all 0.2s'
            }}
          >
            Territory Empire
          </button>
        </div>
        
        {/* Pinned Your Stats summary */}
        {activeTab === 'green' && currentGreenUser && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(52,211,153,0.05))',
            border: '1.5px solid var(--primary, #10b981)',
            borderRadius: 16, padding: '0.65rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <LeaderboardAvatar name={currentGreenUser.displayName} image={currentGreenUser.image} size={38} border="1.5px solid var(--primary)" />
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary, #2d6a4a)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your Standing</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary, #10b981)' }}>#{currentGreenUser.rank}</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>· {currentGreenUser.totalCo2Saved} kg saved</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'territory' && currentTerritoryUser && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(52,211,153,0.05))',
            border: '1.5px solid var(--primary, #10b981)',
            borderRadius: 16, padding: '0.65rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <LeaderboardAvatar name={currentTerritoryUser.displayName} image={currentTerritoryUser.image} size={38} border="1.5px solid var(--primary)" />
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary, #2d6a4a)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your Standing</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary, #10b981)' }}>#{currentTerritoryUser.rank}</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>· {currentTerritoryUser.empireScore} pts ({currentTerritoryUser.cellsCount} cells)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Filter Section (Only on Territory tab) */}
      {activeTab === 'territory' && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-secondary, #fff)',
          border: '1.5px solid var(--border-color, #e2e8f0)',
          borderRadius: '16px',
          padding: '12px 18px',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Sort Empire Standings By:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                background: 'var(--bg-primary, #f8fafc)',
                border: '1px solid var(--border-color, #cbd5e1)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.86rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="empireScore">Empire Score (Overall)</option>
              <option value="cellsCount">Cells Owned (Area)</option>
              <option value="captures">Successful Captures</option>
              <option value="defenses">Successful Defenses</option>
            </select>
          </div>

          {/* Viral Badges Sub-Grids */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {/* Most Active Card */}
            {mostActiveToday.length > 0 && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '10px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>Most Active Today</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {mostActiveToday[0].userName} ({mostActiveToday[0].count} actions)
                  </div>
                </div>
              </div>
            )}

            {/* Most Aggressive Card */}
            {mostAggressive.length > 0 && (
              <div style={{
                background: 'rgba(249, 115, 22, 0.05)',
                border: '1px solid rgba(249, 115, 22, 0.15)',
                borderRadius: '10px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#f97316', textTransform: 'uppercase' }}>Most Aggressive</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {mostAggressive[0].userName} ({mostAggressive[0].count} steals)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PODIUM DISPLAY ── */}
      {filtered.length > 0 && !query && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem', marginBottom: '2.5rem',
          alignItems: 'end',
        }}>
          
          {/* Rank 2 (Silver) */}
          {second && (
            <div style={{
              background: 'var(--bg-secondary, #fff)',
              borderRadius: 24, border: '1.5px solid var(--border-color, #e2e8f0)',
              padding: '1.5rem', textAlign: 'center', order: 1,
              boxShadow: 'var(--shadow-md)', position: 'relative',
              animation: 'slideUp 0.3s ease',
            }}>
              <div style={{ position: 'absolute', top: 12, left: 16 }}><Medal rank={2} /></div>
              <LeaderboardAvatar name={second.displayName} image={second.image} size={70} border="3px solid #cbd5e1" />
              <h3 style={{ margin: '0.75rem 0 0.25rem', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{second.displayName}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 500 }}>
                {activeTab === 'green' ? `${second.totalTrips} journeys` : `${second.cellsCount} cells owned`}
              </p>
              <div style={{
                marginTop: '1rem', background: 'var(--bg-primary, #f8fafc)',
                padding: '0.6rem', borderRadius: 12, fontWeight: 800,
                color: '#64748b', fontSize: '0.95rem',
              }}>
                {activeTab === 'green' ? `${second.totalCo2Saved} kg CO₂` : `${second.empireScore} Empire pts`}
              </div>
            </div>
          )}

          {/* Rank 1 (Gold - Larger Card) */}
          {first && (
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(16,185,129,0.06) 100%)',
              borderRadius: 28, border: '2.5px solid var(--primary, #10b981)',
              padding: '2rem 1.5rem 1.75rem', textAlign: 'center', order: 0,
              boxShadow: 'var(--shadow-lg), 0 10px 30px rgba(16,185,129,0.12)',
              position: 'relative', transform: 'scale(1.03)', zIndex: 5,
              animation: 'slideUp 0.2s ease',
            }}>
              <div style={{ position: 'absolute', top: 16, left: 16 }}><Medal rank={1} /></div>
              <div style={{ animation: 'bounce 3s infinite', marginBottom: '0.75rem' }}>
                <TrophyIcon size={44} />
              </div>
              <LeaderboardAvatar name={first.displayName} image={first.image} size={84} border="4px solid var(--primary, #10b981)" />
              <h3 style={{ margin: '0.85rem 0 0.25rem', fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{first.displayName}</h3>
              <p style={{ margin: 0, color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700 }}>
                EMPIRE CHAMPION · {activeTab === 'green' ? `${first.totalTrips} trips` : `${first.cellsCount} cells owned`}
              </p>
              <div style={{
                marginTop: '1.1rem', background: 'var(--bg-secondary)',
                border: '1.5px solid var(--primary)',
                padding: '0.7rem', borderRadius: 14, fontWeight: 900,
                color: 'var(--primary)', fontSize: '1.05rem',
                boxShadow: '0 2px 10px rgba(16,185,129,0.15)',
              }}>
                {activeTab === 'green' ? `${first.totalCo2Saved} kg CO₂` : `${first.empireScore} Empire pts`}
              </div>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {third && (
            <div style={{
              background: 'var(--bg-secondary, #fff)',
              borderRadius: 24, border: '1.5px solid var(--border-color, #e2e8f0)',
              padding: '1.5rem', textAlign: 'center', order: 2,
              boxShadow: 'var(--shadow-md)', position: 'relative',
              animation: 'slideUp 0.4s ease',
            }}>
              <div style={{ position: 'absolute', top: 12, left: 16 }}><Medal rank={3} /></div>
              <LeaderboardAvatar name={third.displayName} image={third.image} size={70} border="3px solid #d97706" />
              <h3 style={{ margin: '0.75rem 0 0.25rem', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{third.displayName}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 500 }}>
                {activeTab === 'green' ? `${third.totalTrips} journeys` : `${third.cellsCount} cells owned`}
              </p>
              <div style={{
                marginTop: '1rem', background: 'var(--bg-primary, #f8fafc)',
                padding: '0.6rem', borderRadius: 12, fontWeight: 800,
                color: '#b45309', fontSize: '0.95rem',
              }}>
                {activeTab === 'green' ? `${third.totalCo2Saved} kg CO₂` : `${third.empireScore} Empire pts`}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── SEARCH FILTER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        background: 'var(--bg-secondary, #fff)', border: '1.5px solid var(--border-color, #e2e8f0)',
        borderRadius: 14, padding: '0.65rem 1rem', marginBottom: '1.25rem',
        boxShadow: 'var(--shadow-xs)',
      }}>
        <SearchIcon />
        <input
          type="text"
          placeholder={activeTab === 'green' ? "Search travel champions by name…" : "Search conquerors by name…"}
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            flex: 1, border: 'none', outline: 'none',
            fontSize: '0.9rem', background: 'transparent',
            color: 'var(--text-primary, #0f172a)',
            fontFamily: 'inherit',
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted, #94a3b8)', padding: 0 }}
          >
            ✕
          </button>
        )}
      </div>

      {/* ── RANKED LIST TABLE ── */}
      <div style={{
        background: 'var(--bg-secondary, #fff)',
        borderRadius: 20, border: '1.5px solid var(--border-color, #f1f5f9)',
        boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 500 }}>
            <thead>
              {activeTab === 'green' ? (
                <tr style={{ borderBottom: '1.5px solid var(--border-color)', background: 'var(--bg-primary, #f8fafc)' }}>
                  <th style={S.th}>Rank</th>
                  <th style={S.th}>Champion</th>
                  <th style={S.th}>CO₂ Saved</th>
                  <th style={S.th}>Trips Completed</th>
                </tr>
              ) : (
                <tr style={{ borderBottom: '1.5px solid var(--border-color)', background: 'var(--bg-primary, #f8fafc)' }}>
                  <th style={S.th}>Rank</th>
                  <th style={S.th}>Conqueror</th>
                  <th style={S.th}>Empire Score</th>
                  <th style={S.th}>Area Owned</th>
                  <th style={S.th}>Captures</th>
                  <th style={S.th}>Defenses</th>
                </tr>
              )}
            </thead>
            <tbody>
              {/* If query is active, show matching items, otherwise show remaining ranks > 3 */}
              {activeTab === 'green' ? (
                // Green Tab Table Rows
                (query ? filtered : remainingList).map(u => (
                  <tr key={u.userId} style={{
                    borderBottom: '1px solid var(--border-color, #f1f5f9)',
                    background: user.email === u.email ? 'linear-gradient(90deg, rgba(16,185,129,0.06) 0%, transparent 100%)' : 'transparent',
                    transition: 'background var(--dur-fast)',
                    boxShadow: user.email === u.email ? 'inset 2.5px 0 0 var(--primary)' : 'none',
                  }}>
                    <td style={S.td}>
                      {u.rank <= 3 ? <Medal rank={u.rank} /> : <span style={S.rankText}>#{u.rank}</span>}
                    </td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <LeaderboardAvatar name={u.displayName} image={u.image} size={36} />
                        <div>
                          <span style={{ fontSize: '0.9rem', fontWeight: user.email === u.email ? 800 : 700, color: 'var(--text-primary)' }}>{u.displayName}</span>
                          {user.email === u.email && <span style={S.youBadge}>YOU</span>}
                        </div>
                      </div>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary, #10b981)' }}>{u.totalCo2Saved} kg</span>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{u.totalTrips} journeys</span>
                    </td>
                  </tr>
                ))
              ) : (
                // Territory Tab Table Rows
                (query ? filtered : remainingList).map(u => (
                  <tr key={u.userId} style={{
                    borderBottom: '1px solid var(--border-color, #f1f5f9)',
                    background: user._id === u.userId ? 'linear-gradient(90deg, rgba(16,185,129,0.06) 0%, transparent 100%)' : 'transparent',
                    transition: 'background var(--dur-fast)',
                    boxShadow: user._id === u.userId ? 'inset 2.5px 0 0 var(--primary)' : 'none',
                  }}>
                    <td style={S.td}>
                      {u.rank <= 3 ? <Medal rank={u.rank} /> : <span style={S.rankText}>#{u.rank}</span>}
                    </td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <LeaderboardAvatar name={u.displayName} image={u.image} size={36} />
                        <div>
                          <span style={{ fontSize: '0.9rem', fontWeight: user._id === u.userId ? 800 : 700, color: 'var(--text-primary)' }}>{u.displayName}</span>
                          {user._id === u.userId && <span style={S.youBadge}>YOU</span>}
                        </div>
                      </div>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{u.empireScore}</span>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary, #10b981)' }}>
                        {u.areaKm2} km² <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 500 }}>({u.cellsCount} cells)</span>
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{u.successfulCaptures}</span>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{u.successfulDefenses}</span>
                    </td>
                  </tr>
                ))
              )}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'green' ? "4" : "6"} style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-secondary)' }}>
                    No travel champions match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        @keyframes bounce { 0%, 100% { transform: translateY(-50%) translateY(0); } 50% { transform: translateY(-50%) translateY(-6px); } }
      `}</style>
    </div>
  );
};

/* ── Inline styles ── */
const S = {
  th: {
    padding: '0.85rem 1.25rem',
    fontSize: '0.74rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: 'var(--text-muted, #94a3b8)',
  },
  td: {
    padding: '0.9rem 1.25rem',
    verticalAlign: 'middle',
  },
  rankText: {
    fontSize: '0.9rem',
    fontWeight: 800,
    color: 'var(--text-secondary)',
    width: 32,
    display: 'inline-block',
    textAlign: 'center',
  },
  youBadge: {
    marginLeft: 8,
    fontSize: '0.65rem',
    background: 'rgba(16,185,129,0.18)',
    color: 'var(--primary, #10b981)',
    padding: '1px 6px',
    borderRadius: 20,
    fontWeight: 800,
  }
};

export default Leaderboard;
