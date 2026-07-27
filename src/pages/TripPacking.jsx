import React, { useState, useEffect } from 'react';

function getDaysBetween(start, end) {
  const s = new Date(start), e = new Date(end);
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
}

export default function TripPacking() {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [trips, setTrips] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/trips').then(r => r.json()).then(setTrips).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!destination || !startDate || !endDate) return alert('Please fill in all trip details.');
    setLoading(true);
    setSuggestion(null);
    try {
      // Fetch multi-day forecast from Open-Meteo via geocoding
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      let weatherForecast = null;

      if (geoData.results && geoData.results.length > 0) {
        const { latitude, longitude } = geoData.results[0];
        const days = getDaysBetween(startDate, endDate);
        const forecastRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=auto&forecast_days=${Math.min(days, 16)}`
        );
        weatherForecast = await forecastRes.json();
      }

      const days = getDaysBetween(startDate, endDate);
      const packRes = await fetch('/api/suggest/packing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weatherForecast, tripDuration: days })
      });
      const data = await packRes.json();
      setSuggestion({ ...data, days });
    } catch (err) {
      console.error(err);
      alert('Failed to generate packing list. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePack = async () => {
    if (!suggestion) return;
    setSaving(true);
    try {
      const clothingIds = suggestion.clothing.map(c => c.id);
      const scentIds = suggestion.scents.map(s => s.id);
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          start_date: startDate,
          end_date: endDate,
          packed_clothing_ids: clothingIds,
          packed_scent_ids: scentIds
        })
      });
      if (!res.ok) throw new Error('Failed to save trip');
      const updated = await fetch('/api/trips').then(r => r.json());
      setTrips(updated);
      setSuggestion(null);
      setDestination(''); setStartDate(''); setEndDate('');
      alert(`Trip to ${destination} saved! Items are locked until ${endDate}.`);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelTrip = async (id) => {
    await fetch(`/api/trips/${id}`, { method: 'DELETE' });
    setTrips(trips.filter(t => t.id !== id));
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out', paddingBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Trip Packing Mode</h2>
        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.1rem' }}>
          Enter a destination and dates — we'll forecast the weather and build your travel wardrobe
        </p>
      </div>

      {/* Active Trips */}
      {trips.filter(t => t.end_date >= today).length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.6rem', marginBottom: '1rem' }}>Active Trips</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {trips.filter(t => t.end_date >= today).map(trip => (
              <div key={trip.id} className="hangtag" style={{ padding: '1.25rem', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.3rem' }}>✈️ {trip.destination}</h4>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{trip.start_date} → {trip.end_date}</p>
                </div>
                <button className="btn btn-danger" onClick={() => cancelTrip(trip.id)}>Cancel Trip</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan a Trip */}
      <div className="hangtag" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>Plan a New Trip</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Destination</label>
            <input type="text" value={destination} onChange={e => setDestination(e.target.value)} placeholder="e.g. Miami, Paris, Tokyo" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-color)', fontFamily: 'var(--font-body)', width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-color)', fontFamily: 'var(--font-body)', width: '100%' }} />
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading} style={{ width: '100%', height: '48px' }}>
          {loading ? 'Fetching Forecast & Building Packing List...' : 'Generate Packing List'}
        </button>

        {suggestion && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ padding: '1.25rem', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontStyle: 'italic' }}>Packing Strategy ({suggestion.days} days)</h4>
              <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-color)' }}>{suggestion.packing_rationale}</p>
            </div>

            {suggestion.clothing?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h5 style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Pack These Clothes</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {suggestion.clothing.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem', background: 'var(--card-bg)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <div style={{ width: '44px', height: '52px', borderRadius: '6px', overflow: 'hidden', background: '#F4F0EB', flexShrink: 0 }}>
                        <img src={item.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div>
                        <h6 style={{ fontSize: '0.95rem', textTransform: 'capitalize' }}>{item.category}</h6>
                        <span className="mono-tag" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>{item.color}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {suggestion.scents?.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <h5 style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Pack These Fragrances</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {suggestion.scents.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem', background: 'var(--card-bg)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <div style={{ width: '44px', height: '52px', borderRadius: '6px', overflow: 'hidden', background: '#F4F0EB', flexShrink: 0 }}>
                        <img src={item.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div>
                        <h6 style={{ fontSize: '0.95rem' }}>{item.name}</h6>
                        <span className="mono-tag" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>{item.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="btn btn-primary" onClick={handlePack} disabled={saving} style={{ width: '100%' }}>
              {saving ? 'Locking Items...' : '✈️ Pack This — Lock Items Until Trip Ends'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
