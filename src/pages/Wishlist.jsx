import React, { useState, useEffect } from 'react';

const CATEGORIES = ['tops', 'bottoms', 'dress', 'outerwear', 'shoes', 'accessories', 'other'];

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ item_name: '', category: '', price: '', link: '' });
  const [filter, setFilter] = useState('all');

  const loadWishlist = () => {
    fetch('/api/wishlist').then(r => r.json()).then(setItems).catch(() => {});
  };

  useEffect(() => { loadWishlist(); }, []);

  const handleAdd = async () => {
    if (!form.item_name.trim()) return alert('Enter an item name.');
    await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    loadWishlist();
    setForm({ item_name: '', category: '', price: '', link: '' });
    setAdding(false);
  };

  const markPurchased = async (id) => {
    await fetch(`/api/wishlist/${id}/purchased`, { method: 'PATCH' });
    loadWishlist();
  };

  const deleteItem = async (id) => {
    await fetch(`/api/wishlist/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const displayed = items.filter(i => {
    if (filter === 'want') return !i.purchased;
    if (filter === 'purchased') return !!i.purchased;
    return true;
  });

  const totalSpent = items.filter(i => i.purchased && i.price).reduce((s, i) => s + parseFloat(i.price || 0), 0);
  const totalWant = items.filter(i => !i.purchased && i.price).reduce((s, i) => s + parseFloat(i.price || 0), 0);

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out', paddingBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Shopping Wishlist</h2>
        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.1rem' }}>
          Track pieces you're eyeing — mark them when you've bought them
        </p>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Saved Items', value: items.filter(i => !i.purchased).length, color: 'var(--accent-olive)' },
          { label: 'Purchased', value: items.filter(i => i.purchased).length, color: 'var(--accent-clay)' },
          { label: 'Total Spent', value: `$${totalSpent.toFixed(2)}`, color: 'var(--accent-sandstone)' },
          { label: 'Wishlist Cost', value: `$${totalWant.toFixed(2)}`, color: 'var(--text-muted)' }
        ].map(stat => (
          <div key={stat.label} className="hangtag" style={{ flex: 1, minWidth: '120px', padding: '1rem', textAlign: 'center' }}>
            <h4 style={{ fontSize: '1.5rem', color: stat.color }}>{stat.value}</h4>
            <p style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginTop: '0.25rem' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="pill-selector">
          {['all', 'want', 'purchased'].map(f => (
            <button key={f} className={`pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(!adding)}>
          {adding ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {adding && (
        <div className="hangtag" style={{ maxWidth: '540px', margin: '0 auto 2rem', padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Add to Wishlist</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Item Name</label>
              <input type="text" value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} placeholder="e.g. White Linen Shirt" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-color)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', width: '100%' }}>
                  <option value="">Select...</option>
                  {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Price ($)</label>
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" min="0" step="0.01" />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Link (optional)</label>
              <input type="url" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
            </div>
            <button className="btn btn-primary" onClick={handleAdd} style={{ width: '100%' }}>Save to Wishlist</button>
          </div>
        </div>
      )}

      {displayed.length === 0 && (
        <p style={{ textAlign: 'center', fontStyle: 'italic', margin: '3rem 0' }}>Nothing to show — add your first wish item above.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {displayed.map(item => (
          <div key={item.id} className="hangtag" style={{ padding: '1rem 1.25rem', flexDirection: 'row', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', opacity: item.purchased ? 0.65 : 1 }}>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <h4 style={{ fontSize: '1.1rem', textDecoration: item.purchased ? 'line-through' : 'none', marginBottom: '0.2rem' }}>{item.item_name}</h4>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {item.category && <span className="mono-tag" style={{ fontSize: '0.6rem', textTransform: 'capitalize' }}>{item.category}</span>}
                {item.price && <span className="mono-tag" style={{ fontSize: '0.6rem' }}>${parseFloat(item.price).toFixed(2)}</span>}
                {item.purchased && <span className="mono-tag" style={{ fontSize: '0.6rem', background: 'rgba(91,102,76,0.12)', color: 'var(--accent-olive)', borderColor: 'rgba(91,102,76,0.2)' }}>✓ Purchased</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {item.link && (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.4rem 0.75rem', textDecoration: 'none' }}>
                  View →
                </a>
              )}
              {!item.purchased && (
                <button className="btn btn-primary" style={{ fontSize: '0.7rem', padding: '0.4rem 0.75rem' }} onClick={() => markPurchased(item.id)}>
                  ✓ Purchased
                </button>
              )}
              <button className="btn btn-danger" style={{ fontSize: '0.7rem', padding: '0.4rem 0.75rem' }} onClick={() => deleteItem(item.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
