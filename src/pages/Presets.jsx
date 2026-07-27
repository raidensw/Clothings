import React, { useState, useEffect } from 'react';

export default function Presets() {
  const [presets, setPresets] = useState([]);
  const [clothing, setClothing] = useState([]);
  const [scents, setScents] = useState([]);
  const [creating, setCreating] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [selectedClothes, setSelectedClothes] = useState([]);
  const [selectedScent, setSelectedScent] = useState('');
  const [checkResults, setCheckResults] = useState({});
  const [wearing, setWearing] = useState(null);

  useEffect(() => {
    fetch('/api/presets').then(r => r.json()).then(setPresets).catch(() => {});
    fetch('/api/clothing').then(r => r.json()).then(setClothing).catch(() => {});
    fetch('/api/scents').then(r => r.json()).then(setScents).catch(() => {});
  }, []);

  const toggleClothes = (id) => {
    setSelectedClothes(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const savePreset = async () => {
    if (!presetName.trim()) return alert('Give your preset a name.');
    if (selectedClothes.length === 0) return alert('Select at least one clothing item.');
    try {
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: presetName, clothing_ids: selectedClothes, scent_id: selectedScent ? parseInt(selectedScent) : null })
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated = await fetch('/api/presets').then(r => r.json());
      setPresets(updated);
      setCreating(false);
      setPresetName('');
      setSelectedClothes([]);
      setSelectedScent('');
    } catch (err) {
      alert(err.message);
    }
  };

  const deletePreset = async (id) => {
    await fetch(`/api/presets/${id}`, { method: 'DELETE' });
    setPresets(presets.filter(p => p.id !== id));
  };

  const checkPreset = async (id) => {
    const res = await fetch(`/api/presets/${id}/check`);
    const data = await res.json();
    setCheckResults(prev => ({ ...prev, [id]: data }));
  };

  const wearPreset = async (preset) => {
    setWearing(preset.id);
    try {
      const check = await fetch(`/api/presets/${preset.id}/check`).then(r => r.json());
      if (!check.ready) {
        const dirtyNames = check.dirty.map(i => i.category).join(', ');
        const packedNames = check.packed.map(i => i.category).join(', ');
        alert(`Can't wear this preset — ${dirtyNames ? `Dirty: ${dirtyNames}. ` : ''}${packedNames ? `Packed for trip: ${packedNames}.` : ''}`);
        return;
      }
      // Log today's outfit
      const ids = JSON.parse(preset.clothing_ids || '[]');
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toISOString().split('T')[0], item_ids: ids, scent_id: preset.scent_id, occasion: preset.name })
      });
      alert(`"${preset.name}" logged as today's outfit! ✓`);
    } catch (err) {
      alert('Something went wrong.');
    } finally {
      setWearing(null);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out', paddingBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Outfit Presets</h2>
        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.1rem' }}>
          Save your best looks and re-activate them in one tap
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <button className="btn btn-primary" onClick={() => setCreating(!creating)}>
          {creating ? 'Cancel' : '+ New Preset'}
        </button>
      </div>

      {creating && (
        <div className="hangtag" style={{ maxWidth: '600px', margin: '0 auto 2.5rem', padding: '2rem' }}>
          <h3 style={{ fontSize: '1.6rem', marginBottom: '1.25rem' }}>Create Preset</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Preset Name</label>
              <input type="text" value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="e.g. Date Night, Client Meeting" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Select Clothes</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '220px', overflowY: 'auto' }}>
                {clothing.map(item => (
                  <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.5rem', borderRadius: '8px', cursor: 'pointer', background: selectedClothes.includes(item.id) ? 'rgba(91,102,76,0.1)' : 'transparent' }}>
                    <input type="checkbox" checked={selectedClothes.includes(item.id)} onChange={() => toggleClothes(item.id)} style={{ accentColor: 'var(--accent-olive)' }} />
                    <div style={{ width: '32px', height: '36px', borderRadius: '5px', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={item.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>{item.category} — {item.color}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Fragrance</label>
              <select value={selectedScent} onChange={e => setSelectedScent(e.target.value)} style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-color)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', width: '100%' }}>
                <option value="">No fragrance</option>
                {scents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={savePreset} style={{ width: '100%' }}>Save Preset</button>
          </div>
        </div>
      )}

      {presets.length === 0 && !creating && (
        <p style={{ textAlign: 'center', fontStyle: 'italic', margin: '3rem 0' }}>No presets saved yet. Create your first look above.</p>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {presets.map(preset => {
          const ids = JSON.parse(preset.clothing_ids || '[]');
          const items = clothing.filter(c => ids.includes(c.id));
          const scent = scents.find(s => s.id === preset.scent_id);
          const check = checkResults[preset.id];
          return (
            <div key={preset.id} className="hangtag" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{preset.name}</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {items.map(item => (
                  <div key={item.id} style={{ width: '52px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <img src={item.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
                {scent && (
                  <div style={{ width: '52px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                    <img src={scent.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.4)', fontSize: '0.5rem', textAlign: 'center', color: '#fff', padding: '2px' }}>Scent</div>
                  </div>
                )}
              </div>
              {check && !check.ready && (
                <div style={{ background: 'rgba(163,78,54,0.1)', border: '1px solid rgba(163,78,54,0.3)', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#A34E36' }}>
                  {check.dirty.length > 0 && `Dirty: ${check.dirty.map(i => i.category).join(', ')}. `}
                  {check.packed.length > 0 && `Packed for trip: ${check.packed.map(i => i.category).join(', ')}.`}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                <button className="btn btn-primary" style={{ flexGrow: 1 }} disabled={wearing === preset.id} onClick={() => wearPreset(preset)}>
                  {wearing === preset.id ? 'Checking...' : 'Wear Today'}
                </button>
                <button className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.5rem 0.75rem' }} onClick={() => checkPreset(preset.id)}>
                  Check
                </button>
                <button className="btn btn-danger" onClick={() => deletePreset(preset.id)}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
