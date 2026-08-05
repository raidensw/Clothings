import React, { useState, useEffect } from 'react';

const OCCASIONS = ['just chilling', 'work', 'date night', 'gym', 'going out', 'formal', 'travel'];

function WarmthIcon({ level }) {
  const icons = ['🌿', '☀️', '🌤️', '🧣', '🧥'];
  return <span title={`Warmth level ${level}/5`}>{icons[(level || 1) - 1]}</span>;
}

export default function Suggestions() {
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [occasion, setOccasion] = useState('just chilling');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('single'); // 'single' | 'multiday' | 'selection-based'
  const [selectedItems, setSelectedItems] = useState([]);
  const [allClothing, setAllClothing] = useState([]);

  // Fetch all clothing items for selection mode
  useEffect(() => {
    const userId = localStorage.getItem('atelier-user-id') || '1';
    const localKey = `atelier-clothing-${userId}`;
    const localSaved = JSON.parse(localStorage.getItem(localKey) || '[]');

    fetch('/api/clothing', { headers: { 'x-user-id': userId } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAllClothing(data);
        } else {
          setAllClothing(localSaved);
        }
      })
      .catch(() => setAllClothing(localSaved));
  }, [mode]);
  const [days, setDays] = useState(3);
  const [multiResult, setMultiResult] = useState(null);
  const [cooldownWarning, setCooldownWarning] = useState([]);
  const [logging, setLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const [showPresetInput, setShowPresetInput] = useState(false);

  // Fetch user's geolocation & weather on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setWeatherError('Geolocation not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current_weather=true&hourly=relative_humidity_2m&temperature_unit=fahrenheit&wind_speed_unit=mph`
          );
          const data = await res.json();
          setWeather(data);
        } catch {
          setWeatherError('Could not fetch weather data.');
        }
      },
      () => setWeatherError('Location access denied. Suggestions will be weather-independent.')
    );
  }, []);

  const getSuggestion = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setMultiResult(null);
    setCooldownWarning([]);
    setLogSuccess(false);
    setShowPresetInput(false);

    if (mode === 'selection-based') {
      if (selectedItems.length === 0) {
        setError('Please select at least one item.');
        setLoading(false);
        return;
      }

      const selectedClothingDetails = allClothing.filter(item => selectedItems.includes(item.id));
      const categories = selectedClothingDetails.map(item => item.category);

      let tip = "Great selection! Here are some general styling tips.";
      let suggestedCategories = [];

      if (categories.includes('shirt') && categories.includes('shoes')) {
        suggestedCategories.push('pants', 'shorts');
        tip = "You've got a shirt and shoes! Consider adding some pants or shorts to complete your look.";
      } else if (categories.includes('shirt')) {
        suggestedCategories.push('pants', 'shorts', 'shoes');
        tip = "A stylish shirt needs companions! How about some pants or shorts and a nice pair of shoes?";
      } else if (categories.includes('pants') || categories.includes('shorts')) {
        suggestedCategories.push('shirt', 'shoes');
        tip = "Got your bottoms covered! Now, let's find a great shirt and some shoes to match.";
      } else if (categories.includes('dress')) {
        suggestedCategories.push('shoes', 'accessories');
        tip = "That dress looks fabulous! Pair it with some elegant shoes and complementary accessories.";
      } else if (categories.includes('jacket') || categories.includes('coat')) {
        suggestedCategories.push('shirt', 'pants', 'shoes');
        tip = "Layering up! Pick a base outfit like a shirt, pants, and shoes to go with your outerwear.";
      }

      const suggestions = allClothing.filter(item => suggestedCategories.includes(item.category) && !selectedItems.includes(item.id));

      setResult({
        styling_advice: tip,
        clothing: suggestions.slice(0, 3) // Limit to 3 suggestions for now
      });
      setLoading(false);
      return;
    }

    try {
      const userId = localStorage.getItem('atelier-user-id') || '1';

      if (mode === 'single') {
        const res = await fetch('/api/suggest/outfit', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': userId
          },
          body: JSON.stringify({
            occasion,
            weather: weather?.current_weather,
            clothing: allClothing
          })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
        const data = await res.json();
        setResult(data);

        // Identify cooldown warnings
        const warned = (data.clothing || []).filter(c => recentData.item_ids?.includes(c.id));
        if (warned.length > 0) {
          setCooldownWarning(warned.map(c => `${c.color} ${c.category}`));
        }
      } else {
        const res = await fetch('/api/suggest/multiday', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ occasion, weather: weather?.current_weather, days })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
        const data = await res.json();
        setMultiResult(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logToday = async () => {
    if (!result) return;
    setLogging(true);
    try {
      const clothingIds = result.clothing.map(c => c.id);
      const scentId = result.scents?.[0]?.id || null;
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          item_ids: clothingIds,
          scent_id: scentId,
          occasion
        })
      });
      setLogSuccess(true);
    } catch {
      alert('Failed to log outfit.');
    } finally {
      setLogging(false);
    }
  };

  const saveAsPreset = async () => {
    if (!presetName.trim()) return alert('Enter a preset name.');
    setSavingPreset(true);
    try {
      const clothingIds = result.clothing.map(c => c.id);
      const scentId = result.scents?.[0]?.id || null;
      await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: presetName, clothing_ids: clothingIds, scent_id: scentId })
      });
      setShowPresetInput(false);
      setPresetName('');
      alert(`Preset "${presetName}" saved!`);
    } catch {
      alert('Failed to save preset.');
    } finally {
      setSavingPreset(false);
    }
  };

  const temp = weather?.current_weather?.temperature;
  const weatherCode = weather?.current_weather?.weathercode;
  const weatherEmoji = weatherCode <= 3 ? '☀️' : weatherCode <= 48 ? '🌫️' : weatherCode <= 67 ? '🌧️' : weatherCode <= 77 ? '❄️' : '⛈️';

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out', paddingBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>AI Stylist</h2>
        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.1rem' }}>
          Outfit and scent recommendations tailored to your weather and vibe
        </p>
      </div>

      {/* Weather Banner */}
      {weatherError ? (
        <div style={{ background: 'rgba(163,78,54,0.08)', border: '1px solid rgba(163,78,54,0.2)', borderRadius: '12px', padding: '0.75rem 1.25rem', marginBottom: '2rem', fontSize: '0.85rem', color: 'var(--accent-clay)' }}>
          ⚠️ {weatherError}
        </div>
      ) : weather ? (
        <div className="hangtag" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2rem' }}>{weatherEmoji}</div>
          <div>
            <h4 style={{ fontSize: '1.2rem', marginBottom: '0.15rem' }}>
              {temp !== undefined ? `${Math.round(temp)}°F` : 'Loading...'}
            </h4>
            <p style={{ fontSize: '0.8rem', margin: 0 }}>Live local weather · used for today's suggestions</p>
          </div>
        </div>
      ) : (
        <div style={{ height: '56px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1rem' }}>
          <div style={{ width: '18px', height: '18px', border: '2px solid var(--accent-olive)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Fetching your local weather…</span>
        </div>
      )}

            {/* Item Selection UI */}
      {mode === 'selection-based' && (
        <div className="hangtag" style={{ maxWidth: '800px', margin: '0 auto 2.5rem', padding: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>Select Items for Tips</h3>
          {allClothing.length === 0 ? (
            <p style={{ textAlign: 'center', fontStyle: 'italic' }}>No clothing items available. Please add some items to your closet first.</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                {Array.from(new Set(allClothing.map(item => item.category))).map(category => (
                  <button
                    key={category}
                    className={`btn ${selectedItems.some(id => allClothing.find(c => c.id === id)?.category === category) ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', borderRadius: '20px' }}
                    onClick={() => {
                      // Toggle all items of this category
                      const categoryItems = allClothing.filter(item => item.category === category).map(item => item.id);
                      setSelectedItems(prev => {
                        const allSelected = categoryItems.every(id => prev.includes(id));
                        return allSelected
                          ? prev.filter(id => !categoryItems.includes(id))
                          : [...new Set([...prev, ...categoryItems])];
                      });
                    }}
                  >
                    {category} ({allClothing.filter(item => item.category === category).length})
                  </button>
                ))}
              </div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
                {allClothing.map(item => {
                  const isSelected = selectedItems.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className="hangtag"
                      style={{
                        padding: '0',
                        overflow: 'hidden',
                        opacity: item.is_dirty ? 0.65 : 1,
                        border: isSelected ? '2px solid var(--accent-olive)' : '1px solid var(--border-color)',
                        background: isSelected ? 'rgba(91, 102, 76, 0.04)' : 'var(--card-bg)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => setSelectedItems(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])}
                    >
                      <div style={{ position: 'absolute', top: '6px', left: '6px', zIndex: 5, width: '20px', height: '20px', borderRadius: '5px', border: isSelected ? 'none' : '1px solid var(--border-color)', background: isSelected ? 'var(--accent-olive)' : 'rgba(255,255,255,0.85)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        {isSelected && '✓'}
                      </div>
                      <div className="hangtag-img-container" style={{ marginBottom: 0, paddingTop: '100%' }}>
                        <img src={item.image_path} alt={item.category} className="hangtag-img" />
                      </div>
                      <div style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <h4 style={{ fontSize: '0.8rem', textTransform: 'capitalize', marginBottom: '0.1rem' }}>{item.category}</h4>
                        <p style={{ fontSize: '0.7rem', textTransform: 'capitalize', color: 'var(--text-muted)' }}>{item.color}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedItems.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <button className="btn btn-secondary" onClick={() => setSelectedItems([])}>Clear Selection ({selectedItems.length})</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Controls */} 
      <div className="hangtag" style={{ maxWidth: '600px', margin: '0 auto 2.5rem', padding: '2rem' }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[{ key: 'single', label: 'Today\'s Outfit' }, { key: 'multiday', label: 'Multi-Day Plan' }, { key: 'selection-based', label: 'By Selection' }].map(m => (
            <button key={m.key} className={`btn ${mode === m.key ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, fontSize: '0.78rem' }} onClick={() => setMode(m.key)}>
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Occasion</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {OCCASIONS.map(o => (
                <button key={o} onClick={() => setOccasion(o)} style={{
                  padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer', textTransform: 'capitalize',
                  border: occasion === o ? '1.5px solid var(--accent-olive)' : '1px solid var(--border-color)',
                  background: occasion === o ? 'rgba(91,102,76,0.12)' : 'transparent',
                  color: occasion === o ? 'var(--accent-olive)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)', transition: 'all 0.2s ease'
                }}>
                  {o}
                </button>
              ))}
            </div>
          </div>

          {mode === 'multiday' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Days</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[2, 3, 5, 7].map(d => (
                  <button key={d} onClick={() => setDays(d)} style={{
                    padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer',
                    border: days === d ? '1.5px solid var(--accent-olive)' : '1px solid var(--border-color)',
                    background: days === d ? 'rgba(91,102,76,0.12)' : 'transparent',
                    color: days === d ? 'var(--accent-olive)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-body)', transition: 'all 0.2s ease'
                  }}>{d}d</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="btn btn-primary" onClick={getSuggestion} disabled={loading} style={{ width: '100%', height: '48px' }}>
          {loading ? 'Styling your look…' : mode === 'multiday' ? `Plan ${days}-Day Wardrobe` : mode === 'selection-based' ? 'Get Tips' : 'Get Styled Today'}
        </button>
      </div>
      {error && (
        <div style={{ background: 'rgba(163,78,54,0.08)', border: '1px solid rgba(163,78,54,0.2)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'center', color: 'var(--accent-clay)' }}>
          {error}
        </div>
      )}

      {/* Single-day result */}
      {result && mode === 'single' && (
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          {/* Cooldown warning */}
          {cooldownWarning.length > 0 && (
            <div style={{ background: 'rgba(163,78,54,0.08)', border: '1px solid rgba(163,78,54,0.25)', borderRadius: '12px', padding: '0.75rem 1.25rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--accent-clay)' }}>
              ⚠️ Cooldown notice: You wore {cooldownWarning.join(' and ')} in the last 3 days. Consider swapping for variety.
            </div>
          )}

          {/* Styling advice */}
          <div className="hangtag" style={{ padding: '1.5rem 2rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Stylist Notes</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', lineHeight: '1.65', fontStyle: 'italic', color: 'var(--text-color)' }}>
              {result.styling_advice}
            </p>
          </div>

          {/* Clothing */}
          {result.clothing?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>Wear These</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                {result.clothing.map(item => (
                  <div key={item.id} className="hangtag" style={{ padding: '0', overflow: 'hidden' }}>
                    <div className="hangtag-img-container" style={{ marginBottom: 0 }}>
                      <img src={item.image_path} alt={item.category} className="hangtag-img" />
                    </div>
                    <div style={{ padding: '0.75rem' }}>
                      <h4 style={{ fontSize: '1rem', textTransform: 'capitalize', marginBottom: '0.25rem' }}>{item.category}</h4>
                      <p style={{ fontSize: '0.78rem', marginBottom: '0.4rem', textTransform: 'capitalize' }}>{item.color} · {item.style}</p>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        <span className="mono-tag" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>{item.pattern}</span>
                        {item.warmth_level && <WarmthIcon level={item.warmth_level} />}                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scents */}
          {result.scents?.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>Pair With</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                {result.scents.map(item => (
                  <div key={item.id} className="hangtag" style={{ padding: '0', overflow: 'hidden' }}>
                    <div className="hangtag-img-container" style={{ marginBottom: 0 }}>
                      <img src={item.image_path} alt={item.name} className="hangtag-img" />
                    </div>
                    <div style={{ padding: '0.75rem' }}>
                      <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{item.name}</h4>
                      <span className="mono-tag" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>{item.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action row */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={logToday} disabled={logging || logSuccess}>
              {logSuccess ? '✓ Logged!' : logging ? 'Logging...' : '📅 Log as Today\'s Outfit'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowPresetInput(p => !p)}>
              ⭐ Save as Preset
            </button>
            <button className="btn btn-secondary" onClick={getSuggestion}>
              🔄 Regenerate
            </button>
          </div>

          {showPresetInput && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input type="text" value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Preset name (e.g. Date Night)" style={{ maxWidth: '280px' }} />
              <button className="btn btn-primary" onClick={saveAsPreset} disabled={savingPreset}>
                {savingPreset ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      )}

      {result && mode === 'selection-based' && (
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          {/* Styling advice */}
          <div className="hangtag" style={{ padding: '1.5rem 2rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Stylist Notes</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', lineHeight: '1.65', fontStyle: 'italic', color: 'var(--text-color)' }}>
              {result.styling_advice}
            </p>
          </div>

          {/* Clothing */}
          {result.clothing?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>Suggested Items</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                {result.clothing.map(item => (
                  <div key={item.id} className="hangtag" style={{ padding: '0', overflow: 'hidden' }}>
                    <div className="hangtag-img-container" style={{ marginBottom: 0 }}>
                      <img src={item.image_path} alt={item.category} className="hangtag-img" />
                    </div>
                    <div style={{ padding: '0.75rem' }}>
                      <h4 style={{ fontSize: '1rem', textTransform: 'capitalize', marginBottom: '0.25rem' }}>{item.category}</h4>
                      <p style={{ fontSize: '0.78rem', marginBottom: '0.4rem', textTransform: 'capitalize' }}>{item.color} · {item.style}</p>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        <span className="mono-tag" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>{item.pattern}</span>
                        {item.warmth_level && <WarmthIcon level={item.warmth_level} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action row for selection-based mode */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={getSuggestion}>
              🔄 Regenerate Tips
            </button>
            <button className="btn btn-secondary" onClick={() => setResult(null)}>
              ✖ Clear Tips
            </button>
          </div>
        </div>
      )}

      {/* Multi-day result */}
      {multiResult && mode === 'multiday' && (
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          {multiResult.styling_advice && (
            <div className="hangtag" style={{ padding: '1.5rem 2rem', marginBottom: '2rem' }}>
              <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Style Theme</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', lineHeight: '1.65', fontStyle: 'italic', color: 'var(--text-color)' }}>
                {multiResult.styling_advice}
              </p>
            </div>
          )}

          {(multiResult.days || []).map(day => (
            <div key={day.dayNumber} className="hangtag" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Day {day.dayNumber}</h3>
              {day.advice && (
                <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', marginBottom: '1rem', fontSize: '1rem' }}>{day.advice}</p>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {(day.clothing || []).map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', background: 'var(--bg-color)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ width: '36px', height: '44px', borderRadius: '5px', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={item.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span style={{ fontSize: '0.82rem', textTransform: 'capitalize' }}>{item.category}</span>
                  </div>
                ))}
                {(day.scents || []).map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', background: 'var(--bg-color)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ width: '36px', height: '44px', borderRadius: '5px', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={item.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span style={{ fontSize: '0.82rem' }}>🌸 {item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
