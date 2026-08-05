import React, { useState, useEffect } from 'react';

export default function LaundryQueue() {
  const [clothing, setClothing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);

  const loadClothing = () => {
    setLoading(true);
    const userId = localStorage.getItem('atelier-user-id') || '1';
    const localItems = JSON.parse(localStorage.getItem(`atelier-clothing-${userId}`) || '[]');
    if (localItems.length > 0) {
      setClothing(localItems);
      setLoading(false);
    }
    fetch('/api/clothing', { headers: { 'x-user-id': userId } }).then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setClothing(data);
        localStorage.setItem(`atelier-clothing-${userId}`, JSON.stringify(data));
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  };

  useEffect(() => { loadClothing(); }, []);

  const dirtyItems = clothing.filter(c => c.is_dirty === 1);
  const grouped = dirtyItems.reduce((acc, item) => {
    const key = item.category || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => setSelected(dirtyItems.map(i => i.id));
  const deselectAll = () => setSelected([]);

  const markClean = async (ids) => {
    const userId = localStorage.getItem('atelier-user-id') || '1';
    // Update localStorage immediately
    const localItems = JSON.parse(localStorage.getItem(`atelier-clothing-${userId}`) || '[]');
    const updated = localItems.map(i => ids.includes(i.id) ? { ...i, is_dirty: 0 } : i);
    localStorage.setItem(`atelier-clothing-${userId}`, JSON.stringify(updated));
    setClothing(prev => prev.map(i => ids.includes(i.id) ? { ...i, is_dirty: 0 } : i));
    setSelected([]);
    // Also try API
    fetch('/api/clothing/bulk/dirty', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, is_dirty: false })
    }).catch(() => {});
  };

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out', paddingBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Laundry Queue</h2>
        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.1rem' }}>
          All your dirty items, grouped by category — mark them clean after washing
        </p>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', fontStyle: 'italic' }}>Loading wardrobe...</p>
      ) : dirtyItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
          <h3 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>All Clean!</h3>
          <p style={{ fontStyle: 'italic' }}>Your entire wardrobe is ready to wear.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {dirtyItems.length} item{dirtyItems.length !== 1 ? 's' : ''} in laundry
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.45rem 0.9rem' }} onClick={selected.length === dirtyItems.length ? deselectAll : selectAll}>
                {selected.length === dirtyItems.length ? 'Deselect All' : 'Select All'}
              </button>
              {selected.length > 0 && (
                <button className="btn btn-primary" onClick={() => markClean(selected)}>
                  ✓ Mark {selected.length} Item{selected.length > 1 ? 's' : ''} Clean
                </button>
              )}
            </div>
          </div>

          {Object.entries(grouped).sort().map(([category, items]) => (
            <div key={category} style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.3rem', textTransform: 'capitalize', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {category}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', background: 'var(--border-color)', padding: '0.15rem 0.5rem', borderRadius: '20px', color: 'var(--text-muted)' }}>{items.length}</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {items.map(item => {
                  const isSelected = selected.includes(item.id);
                  return (
                    <div key={item.id} onClick={() => toggleSelect(item.id)} style={{
                      border: isSelected ? '2px solid var(--accent-olive)' : '1px solid var(--border-color)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(91,102,76,0.07)' : 'var(--card-bg)',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}>
                      {isSelected && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', width: '22px', height: '22px', background: 'var(--accent-olive)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, fontSize: '0.75rem', color: '#fff' }}>✓</div>
                      )}
                      <div style={{ width: '100%', height: '160px', background: '#F4F0EB', overflow: 'hidden' }}>
                        <img src={item.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ padding: '0.75rem' }}>
                        <h4 style={{ fontSize: '0.95rem', textTransform: 'capitalize', marginBottom: '0.25rem' }}>{item.category}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{item.color} · {item.style}</p>
                        <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.4rem' }}>
                          <span className="mono-tag" style={{ background: 'rgba(163,78,54,0.12)', color: 'var(--accent-clay)', borderColor: 'rgba(163,78,54,0.2)' }}>🧺 Dirty</span>
                        </div>
                      </div>
                      <div style={{ padding: '0 0.75rem 0.75rem' }}>
                        <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.75rem', padding: '0.45rem' }} onClick={(e) => { e.stopPropagation(); markClean([item.id]); }}>
                          Mark Clean
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
