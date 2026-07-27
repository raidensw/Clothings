import React, { useState, useEffect } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function OutfitHistory() {
  const [logs, setLogs] = useState({});
  const [clothing, setClothing] = useState([]);
  const [scents, setScents] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [viewMonth, setViewMonth] = useState(new Date());
  const [logging, setLogging] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedScent, setSelectedScent] = useState('');

  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then(data => {
      const map = {};
      data.forEach(log => { map[log.date] = log; });
      setLogs(map);
    }).catch(() => {});
    fetch('/api/clothing').then(r => r.json()).then(setClothing).catch(() => {});
    fetch('/api/scents').then(r => r.json()).then(setScents).catch(() => {});
    fetch('/api/history/stats').then(r => r.json()).then(data => setStats(data.counts || {})).catch(() => {});
  }, []);

  // Calendar grid
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => setViewMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setViewMonth(new Date(year, month + 1, 1));

  const dateStr = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const logEntry = logs[selectedDate];
  const loggedItemIds = logEntry ? JSON.parse(logEntry.item_ids || '[]') : [];
  const loggedItems = clothing.filter(c => loggedItemIds.includes(c.id));
  const loggedScent = scents.find(s => s.id === logEntry?.scent_id);

  const toggleItem = (id) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleLogToday = async () => {
    if (selectedItems.length === 0) return alert('Select at least one item to log.');
    setLogging(true);
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, item_ids: selectedItems, scent_id: selectedScent ? parseInt(selectedScent) : null, occasion: '' })
      });
      if (!res.ok) throw new Error('Save failed');
      const updated = await fetch('/api/history').then(r => r.json());
      const map = {};
      updated.forEach(log => { map[log.date] = log; });
      setLogs(map);
      const statsData = await fetch('/api/history/stats').then(r => r.json());
      setStats(statsData.counts || {});
      setSelectedItems([]);
      setSelectedScent('');
    } catch (err) {
      alert(err.message);
    } finally {
      setLogging(false);
    }
  };

  // Most worn this month
  const mostWornId = Object.entries(stats).sort((a, b) => b[1] - a[1])[0];
  const mostWornItem = mostWornId ? clothing.find(c => c.id === parseInt(mostWornId[0])) : null;

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out', paddingBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Outfit History</h2>
        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.1rem' }}>
          Track what you've worn, understand your patterns, and avoid repeats
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2.5rem', alignItems: 'start' }}>
        {/* Calendar Panel */}
        <div className="hangtag" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={prevMonth}>← Prev</button>
            <h3 style={{ fontSize: '1.5rem' }}>{MONTHS[month]} {year}</h3>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={nextMonth}>Next →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '0.5rem' }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0.25rem 0' }}>{d}</div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={`empty-${i}`} />;
              const ds = dateStr(d);
              const hasLog = !!logs[ds];
              const isSelected = ds === selectedDate;
              const isToday = ds === getTodayStr();
              return (
                <button key={ds} onClick={() => setSelectedDate(ds)} style={{
                  border: isSelected ? '2px solid var(--accent-clay)' : '1px solid transparent',
                  background: hasLog ? 'rgba(91, 102, 76, 0.12)' : isToday ? 'var(--border-color)' : 'transparent',
                  borderRadius: '8px',
                  padding: '0.4rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  color: isSelected ? 'var(--accent-clay)' : 'var(--text-color)',
                  fontWeight: isToday ? '600' : '400',
                  position: 'relative'
                }}>
                  {d}
                  {hasLog && <span style={{ display: 'block', width: '4px', height: '4px', background: 'var(--accent-olive)', borderRadius: '50%', margin: '2px auto 0' }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Most worn stat */}
          {mostWornItem && (
            <div className="hangtag" style={{ padding: '1rem', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '50px', height: '60px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                <img src={mostWornItem.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Most Worn This Month</p>
                <h4 style={{ fontSize: '1.2rem', textTransform: 'capitalize' }}>{mostWornItem.category}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{mostWornId[1]}× worn</p>
              </div>
            </div>
          )}

          {/* Selected date log */}
          <div className="hangtag" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>{selectedDate}</h4>

            {logEntry ? (
              <div>
                <p style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Worn on this day</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {loggedItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem', background: 'var(--bg-color)', borderRadius: '8px' }}>
                      <div style={{ width: '36px', height: '44px', borderRadius: '5px', overflow: 'hidden', flexShrink: 0 }}>
                        <img src={item.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <span style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}>{item.category} — {item.color}</span>
                    </div>
                  ))}
                  {loggedScent && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem', background: 'var(--bg-color)', borderRadius: '8px' }}>
                      <div style={{ width: '36px', height: '44px', borderRadius: '5px', overflow: 'hidden', flexShrink: 0 }}>
                        <img src={loggedScent.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <span style={{ fontSize: '0.9rem' }}>🌸 {loggedScent.name}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.85rem', marginBottom: '1rem', fontStyle: 'italic' }}>No outfit logged for this date yet.</p>
                <p style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Select clothes worn</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem' }}>
                  {clothing.map(item => (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.5rem', borderRadius: '8px', cursor: 'pointer', background: selectedItems.includes(item.id) ? 'rgba(91,102,76,0.1)' : 'transparent' }}>
                      <input type="checkbox" checked={selectedItems.includes(item.id)} onChange={() => toggleItem(item.id)} style={{ accentColor: 'var(--accent-olive)' }} />
                      <div style={{ width: '32px', height: '36px', borderRadius: '5px', overflow: 'hidden', flexShrink: 0 }}>
                        <img src={item.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <span style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>{item.category} — {item.color}</span>
                    </label>
                  ))}
                </div>
                <select value={selectedScent} onChange={e => setSelectedScent(e.target.value)} style={{ marginBottom: '1rem', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-color)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', width: '100%' }}>
                  <option value="">No fragrance logged</option>
                  {scents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button className="btn btn-primary" onClick={handleLogToday} disabled={logging} style={{ width: '100%' }}>
                  {logging ? 'Saving...' : 'Log This Outfit'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
