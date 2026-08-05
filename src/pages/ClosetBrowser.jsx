import React, { useState, useEffect } from 'react';
import { fetchUserCloudWardrobe, saveUserCloudWardrobe } from '../utils/cloudSync';

export default function ClosetBrowser() {
  const [clothing, setClothing] = useState([]);
  const [scents, setScents] = useState([]);
  const [activeTab, setActiveTab] = useState('clothing');
  const [filter, setFilter] = useState('All');
  const [selectedItems, setSelectedItems] = useState([]);
  const [flippedItems, setFlippedItems] = useState({});
  const [editingScent, setEditingScent] = useState(null);
  const [newMl, setNewMl] = useState(100);

  const toggleFlip = (e, itemId) => {
    e.stopPropagation();
    setFlippedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const loadData = async () => {
    const username = localStorage.getItem('atelier-account-name') || 'guest';
    const accountKey = localStorage.getItem('atelier-account-key') || 'key';
    const userId = localStorage.getItem('atelier-user-id') || '1';

    const localClothingKey = `atelier-clothing-${userId}`;
    const localScentsKey = `atelier-scents-${userId}`;

    const savedLocalClothing = JSON.parse(localStorage.getItem(localClothingKey) || '[]');
    const savedLocalScents = JSON.parse(localStorage.getItem(localScentsKey) || '[]');

    // 1. Fetch from cloud storage
    const cloudData = await fetchUserCloudWardrobe(username, accountKey);
    if (cloudData) {
      if (Array.isArray(cloudData.clothing)) {
        setClothing(cloudData.clothing);
        localStorage.setItem(localClothingKey, JSON.stringify(cloudData.clothing));
      }
      if (Array.isArray(cloudData.scents)) {
        setScents(cloudData.scents);
        localStorage.setItem(localScentsKey, JSON.stringify(cloudData.scents));
      }
    } else {
      setClothing(savedLocalClothing);
      setScents(savedLocalScents);
    }

    // 2. Fetch from backend API
    fetch('/api/clothing', { headers: { 'x-user-id': userId } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setClothing(data);
          localStorage.setItem(localClothingKey, JSON.stringify(data));
          saveUserCloudWardrobe(username, accountKey, { clothing: data, scents: savedLocalScents });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const deleteItem = async (id, type) => {
    await fetch(`/api/${type}/${id}`, { method: 'DELETE' });
    if (type === 'clothing') {
      setClothing(clothing.filter(item => item.id !== id));
      setSelectedItems(selectedItems.filter(i => i !== id));
    } else {
      setScents(scents.filter(item => item.id !== id));
    }
  };

  const toggleDirty = async (id, currentStatus) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    try {
      const res = await fetch(`/api/clothing/${id}/dirty`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_dirty: newStatus })
      });
      if (!res.ok) throw new Error("Failed to toggle laundry status");
      
      setClothing(clothing.map(item => {
        if (item.id === id) {
          return { ...item, is_dirty: newStatus };
        }
        return item;
      }));
    } catch (err) {
      console.error(err);
      alert("Could not update laundry status");
    }
  };

  const toggleSelect = (id) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const bulkMarkDirty = async (isDirty) => {
    if (selectedItems.length === 0) return;
    try {
      await fetch('/api/clothing/bulk/dirty', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedItems, is_dirty: isDirty })
      });
      loadData();
      setSelectedItems([]);
    } catch (err) {
      alert("Failed to update items");
    }
  };

  const bulkArchive = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`Archive ${selectedItems.length} selected items?`)) return;
    try {
      await fetch('/api/clothing/bulk/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedItems })
      });
      loadData();
      setSelectedItems([]);
    } catch (err) {
      alert("Failed to archive items");
    }
  };

  const updateScentLevel = async (id) => {
    try {
      await fetch(`/api/scents/${id}/level`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ml_remaining: parseFloat(newMl) })
      });
      setScents(scents.map(s => s.id === id ? { ...s, ml_remaining: parseFloat(newMl) } : s));
      setEditingScent(null);
    } catch (err) {
      alert("Failed to update scent level");
    }
  };

  const categories = ['All', ...new Set(clothing.map(c => c.category))];
  const filteredClothing = filter === 'All' ? clothing : clothing.filter(c => c.category === filter);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out', paddingBottom: '4rem' }}>
      {/* Editorial Page Title */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Your Curated Wardrobe</h2>
        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.1rem' }}>
          Explore your collected garments and signature fragrances
        </p>
      </div>

      {/* Navigation Switcher (Clothes / Scents) */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0', marginBottom: '2.5rem' }}>
        <button 
          className={`type-selector-btn ${activeTab === 'clothing' ? 'active' : ''}`}
          onClick={() => setActiveTab('clothing')}
        >
          Clothing Catalog ({clothing.length})
        </button>
        <button 
          className={`type-selector-btn ${activeTab === 'scents' ? 'active' : ''}`}
          onClick={() => setActiveTab('scents')}
        >
          Fragrances ({scents.length})
        </button>
      </div>

      {activeTab === 'clothing' && (
        <>
          {/* Top Controls: Filter Pills & Bulk Action Bar */}
          <div style={{ 
            marginBottom: '2rem', 
            display: 'flex', 
            flexDirection: 'column',
            gap: '1rem',
            alignItems: 'center'
          }}>
            {/* Categories Pill Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem' }}>
              {categories.map(cat => (
                <button 
                  key={cat} 
                  className="btn btn-secondary" 
                  style={{ 
                    padding: '0.4rem 1rem', 
                    fontSize: '0.75rem', 
                    borderRadius: '20px',
                    backgroundColor: filter === cat ? 'var(--text-color)' : 'transparent',
                    color: filter === cat ? 'var(--bg-color)' : 'var(--text-color)',
                    borderColor: filter === cat ? 'var(--text-color)' : 'var(--border-color)',
                  }}
                  onClick={() => setFilter(cat)}
                >
                  {cat || 'Unknown'}
                </button>
              ))}
            </div>

            {/* Bulk Action Controls */}
            {selectedItems.length > 0 && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                background: 'var(--card-bg)',
                padding: '0.6rem 1.25rem',
                borderRadius: '30px',
                border: '1px solid var(--accent-olive)',
                boxShadow: 'var(--shadow-sm)',
                animation: 'fadeIn 0.3s ease'
              }}>
                <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-olive)', fontWeight: '600' }}>
                  {selectedItems.length} Selected
                </span>
                <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem' }} onClick={() => bulkMarkDirty(true)}>
                  Mark Dirty
                </button>
                <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem' }} onClick={() => bulkMarkDirty(false)}>
                  Mark Clean
                </button>
                <button className="btn btn-danger" style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem' }} onClick={bulkArchive}>
                  Archive
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem' }} onClick={() => setSelectedItems([])}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Clothing Grid */}
          <div className="grid">
            {filteredClothing.map(item => {
              const isSelected = selectedItems.includes(item.id);
              const isPacked = item.packed_until && item.packed_until >= today;
              const isFlipped = flippedItems[item.id] && item.back_image_path;
              const currentImg = isFlipped ? item.back_image_path : item.image_path;

              return (
                <div 
                  key={item.id} 
                  className="hangtag" 
                  onClick={() => toggleSelect(item.id)}
                  style={{ 
                    opacity: item.is_dirty ? 0.65 : 1,
                    border: isSelected ? '2px solid var(--accent-olive)' : '1px solid var(--border-color)',
                    background: isSelected ? 'rgba(91, 102, 76, 0.04)' : 'var(--card-bg)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {/* Selection Checkbox Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    zIndex: 5,
                    width: '22px',
                    height: '22px',
                    borderRadius: '6px',
                    border: isSelected ? 'none' : '1px solid var(--border-color)',
                    background: isSelected ? 'var(--accent-olive)' : 'rgba(255,255,255,0.85)',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                  }}>
                    {isSelected && '✓'}
                  </div>

                  {/* Front/Back Flip Badge */}
                  {item.back_image_path && (
                    <button
                      type="button"
                      onClick={(e) => toggleFlip(e, item.id)}
                      title="Toggle Front/Back View"
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        zIndex: 5,
                        padding: '0.25rem 0.6rem',
                        borderRadius: '20px',
                        background: 'rgba(30, 30, 30, 0.75)',
                        color: '#FFF',
                        fontSize: '0.65rem',
                        fontFamily: 'var(--font-mono)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      🔄 {isFlipped ? 'BACK' : 'FRONT'}
                    </button>
                  )}

                  {/* Visual Anchor: Portrait Mode Image Container */}
                  <div className="hangtag-img-container" style={{ position: 'relative' }}>
                    <img src={currentImg} alt={item.category || "clothing"} className="hangtag-img" />
                    
                    {/* Status Banners */}
                    {item.is_dirty === 1 && (
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        background: 'rgba(189, 116, 86, 0.9)',
                        color: '#FFFFFF',
                        padding: '0.35rem',
                        fontSize: '0.65rem',
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                        letterSpacing: '0.1em',
                        fontWeight: '600'
                      }}>
                        In Laundry / Dirty
                      </div>
                    )}

                    {isPacked && item.is_dirty === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        right: '0',
                        background: 'rgba(91, 102, 76, 0.9)',
                        color: '#FFFFFF',
                        padding: '0.35rem',
                        fontSize: '0.65rem',
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                        letterSpacing: '0.1em',
                        fontWeight: '600'
                      }}>
                        ✈️ Packed Until {item.packed_until}
                      </div>
                    )}
                  </div>
                  
                  {/* Details */}
                  <h3 style={{ fontSize: '1.5rem', margin: '0.5rem 0 0.25rem' }}>{item.category || 'Garment'}</h3>
                  
                  {/* Small labels & metadata tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem', marginTop: '0.25rem' }}>
                    <span className="mono-tag">{item.color}</span>
                    <span className="mono-tag">{item.style}</span>
                    <span className="mono-tag">{item.season_fit}</span>
                    {item.brand && <span className="mono-tag" style={{ borderColor: 'var(--accent-sandstone)', color: 'var(--accent-sandstone)' }}>{item.brand}</span>}
                    {item.purchase_price && <span className="mono-tag">${item.purchase_price}</span>}
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <button 
                      className={`btn ${item.is_dirty ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ 
                        padding: '0.5rem 0.8rem', 
                        fontSize: '0.7rem', 
                        flexGrow: '1',
                        borderColor: item.is_dirty ? 'var(--accent-clay)' : 'var(--border-color)',
                        backgroundColor: item.is_dirty ? 'var(--accent-clay)' : 'transparent',
                        color: item.is_dirty ? '#FFFFFF' : 'var(--text-color)'
                      }} 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDirty(item.id, item.is_dirty);
                      }}
                    >
                      {item.is_dirty ? 'Mark Clean' : 'Mark Dirty'}
                    </button>
                    <button className="btn btn-danger" onClick={(e) => {
                      e.stopPropagation();
                      deleteItem(item.id, 'clothing');
                    }} style={{ flexGrow: '0' }}>
                      Archive
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredClothing.length === 0 && (
            <p style={{ textAlign: 'center', margin: '3rem 0', fontStyle: 'italic' }}>No garments cataloged in this category.</p>
          )}
        </>
      )}

      {activeTab === 'scents' && (
        <>
          {/* Scents Grid */}
          <div className="grid">
            {scents.map(item => (
              <div key={item.id} className="hangtag">
                {/* Scent Visual Anchor */}
                <div className="hangtag-img-container">
                  <img src={item.image_path} alt={item.name} className="hangtag-img" />
                </div>
                
                {/* Details */}
                <h3 style={{ fontSize: '1.5rem', margin: '0.5rem 0 0.25rem' }}>{item.name}</h3>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem', marginTop: '0.25rem' }}>
                  <span className="mono-tag">{item.type}</span>
                  <span className="mono-tag">{item.scent_profile}</span>
                  <span className="mono-tag">{item.occasions}</span>
                </div>

                {/* Fragrance Volume Tracker */}
                <div style={{ marginBottom: '1.25rem', background: 'var(--bg-color)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem', fontFamily: 'var(--font-mono)' }}>
                    <span>Volume</span>
                    <span>{item.ml_remaining ?? 100} ml</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.max(0, (item.ml_remaining ?? 100)))}%`, height: '100%', background: 'var(--accent-olive)', transition: 'width 0.3s' }} />
                  </div>
                  {editingScent === item.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input 
                        type="number" 
                        value={newMl} 
                        onChange={e => setNewMl(e.target.value)} 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: '70px' }} 
                      />
                      <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem' }} onClick={() => updateScentLevel(item.id)}>Save</button>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem' }} onClick={() => setEditingScent(null)}>X</button>
                    </div>
                  ) : (
                    <button 
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', cursor: 'pointer', padding: 0, marginTop: '0.3rem', textDecoration: 'underline' }}
                      onClick={() => { setEditingScent(item.id); setNewMl(item.ml_remaining ?? 100); }}
                    >
                      Update Level
                    </button>
                  )}
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-danger" onClick={() => deleteItem(item.id, 'scents')}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          {scents.length === 0 && (
            <p style={{ textAlign: 'center', margin: '3rem 0', fontStyle: 'italic' }}>No scents in your wardrobe collection yet.</p>
          )}
        </>
      )}
    </div>
  );
}
