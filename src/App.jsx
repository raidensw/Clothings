import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import ClosetBrowser from './pages/ClosetBrowser';
import UploadItem from './pages/UploadItem';
import Suggestions from './pages/Suggestions';
import TripPacking from './pages/TripPacking';
import OutfitHistory from './pages/OutfitHistory';
import Presets from './pages/Presets';
import LaundryQueue from './pages/LaundryQueue';
import Wishlist from './pages/Wishlist';

const NAV_LINKS = [
  { to: '/',        label: 'Home',     exact: true },
  { to: '/closet',  label: 'Closet' },
  { to: '/upload',  label: 'Add Item' },
  { to: '/suggest', label: 'Stylist' },
  { to: '/history', label: 'History' },
  { to: '/presets', label: 'Presets' },
  { to: '/laundry', label: 'Laundry' },
  { to: '/trip',    label: 'Trip Pack' },
  { to: '/wishlist',label: 'Wishlist' },
];

const THEMES = [
  { value: 'ecru',     label: 'Atelier Ecru' },
  { value: 'charcoal', label: 'Warm Charcoal' },
  { value: 'olive',    label: 'Sage Studio' },
  { value: 'clay',     label: 'Clay Studio' },
  { value: 'midnight', label: 'Midnight' },
  { value: 'blush',    label: 'Blush' },
];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function LaundryBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    fetch('/api/clothing')
      .then(r => r.json())
      .then(items => setCount(items.filter(i => i.is_dirty === 1).length))
      .catch(() => {});
  }, []);
  if (count === 0) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--accent-clay)', color: '#fff',
      fontSize: '0.55rem', fontFamily: 'var(--font-mono)',
      width: '15px', height: '15px', borderRadius: '50%',
      marginLeft: '4px', verticalAlign: 'middle', lineHeight: 1
    }}>{count}</span>
  );
}

function Home() {
  return (
    <div style={{
      maxWidth: '800px',
      margin: '4rem auto 0',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2rem'
    }}>
      <div style={{
        width: '80px', height: '80px', opacity: 0.85,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--card-bg)', borderRadius: '50%',
        boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)'
      }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--accent-olive)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3c0 1 .5 1.5 1 2.5L2 17a2 2 0 0 0 1 3.5h18a2 2 0 0 0 1-3.5L14 7.5c.5-1 1-1.5 1-2.5a3 3 0 0 0-3-3z"/>
          <path d="M12 7v13"/>
        </svg>
      </div>

      <h1 style={{ fontSize: '3.5rem', lineHeight: '1.1', fontStyle: 'italic', fontWeight: '400' }}>
        Atelier Scent &amp; Style
      </h1>

      <p style={{
        fontSize: '1.2rem',
        fontFamily: 'var(--font-display)',
        color: 'var(--text-muted)',
        maxWidth: '560px',
        lineHeight: '1.5'
      }}>
        A refined digital closet companion that curates your outfits and harmonizes your wardrobe with your signature fragrances.
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <NavLink to="/closet" className="btn btn-primary">Browse Closet</NavLink>
        <NavLink to="/suggest" className="btn btn-secondary">Get Styled</NavLink>
        <NavLink to="/upload" className="btn btn-secondary">Add Item</NavLink>
      </div>

      <div style={{
        marginTop: '3rem',
        borderTop: '1px solid var(--border-color)',
        paddingTop: '2rem',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '2rem'
      }}>
        {[
          { icon: '👔', title: 'Organize', desc: 'Catalog your clothing and fragrances with smart categorization.' },
          { icon: '✨', title: 'Harmonize', desc: 'Get AI outfit + scent pairings tailored to weather and occasion.' },
          { icon: '📅', title: 'Track', desc: 'Log outfits daily and discover your wear patterns.' },
          { icon: '✈️', title: 'Travel', desc: 'Generate packing lists with live multi-day weather forecasts.' },
          { icon: '⭐', title: 'Presets', desc: 'Save your best looks and activate them in one tap.' },
          { icon: '🛍️', title: 'Wishlist', desc: "Track pieces you want and how much you've spent." },
        ].map(f => (
          <div key={f.title}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{f.icon}</div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>{f.title}</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserAccountAuth() {
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('atelier-account-name') || '');
  const [userAccountKey, setUserAccountKey] = useState(localStorage.getItem('atelier-account-key') || '');
  const [showModal, setShowModal] = useState(!localStorage.getItem('atelier-account-key'));
  const [isSignUp, setIsSignUp] = useState(false);
  const [inputName, setInputName] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!inputName.trim() || !inputKey.trim()) return;

    setLoading(true);
    setErrorMsg('');

    const cleanUsername = inputName.trim().toLowerCase().replace(/\s+/g, '_');
    const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          password: inputKey.trim(),
          name: inputName.trim()
        })
      });

      const data = await res.json();
      if (data.error && isSignUp) {
        setErrorMsg(data.error);
        setLoading(false);
        return;
      }

      // Save credentials & user session
      localStorage.setItem('atelier-account-name', inputName.trim());
      localStorage.setItem('atelier-account-key', inputKey.trim());
      localStorage.setItem('atelier-user-id', cleanUsername);

      setCurrentUser(inputName.trim());
      setUserAccountKey(inputKey.trim());
      setShowModal(false);
      setLoading(false);
      window.location.reload();
    } catch (err) {
      // Fallback local account creation if offline
      localStorage.setItem('atelier-account-name', inputName.trim());
      localStorage.setItem('atelier-account-key', inputKey.trim());
      localStorage.setItem('atelier-user-id', cleanUsername);

      setCurrentUser(inputName.trim());
      setUserAccountKey(inputKey.trim());
      setShowModal(false);
      setLoading(false);
      window.location.reload();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('atelier-account-name');
    localStorage.removeItem('atelier-account-key');
    localStorage.removeItem('atelier-user-id');
    window.location.reload();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="btn btn-secondary"
        style={{
          padding: '0.35rem 0.65rem',
          fontSize: '0.75rem',
          borderRadius: '20px',
          borderColor: 'var(--accent-olive)',
          background: 'var(--card-bg)',
          color: 'var(--text-color)',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem'
        }}
      >
        👤 {currentUser || 'Log In / Sign Up'}
      </button>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="hangtag" style={{ maxWidth: '400px', width: '100%', background: 'var(--card-bg)', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.5rem' }}>{isSignUp ? 'Create Wardrobe Account' : 'Log Into Account'}</h3>
              <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-olive)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {isSignUp ? 'Existing user? Log In' : 'Need an account? Sign Up'}
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              {isSignUp 
                ? 'Sign up to sync your closet across your phone and PC!' 
                : 'Enter your Username & Password to access your synced closet on any device.'}
            </p>
            
            {errorMsg && (
              <div style={{ background: 'rgba(163, 78, 54, 0.1)', color: '#A34E36', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Username / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. raiden"
                  value={inputName}
                  onChange={e => setInputName(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', fontSize: '0.9rem', marginTop: '0.25rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Account Password
                </label>
                <input
                  type="password"
                  placeholder="Password"
                  value={inputKey}
                  onChange={e => setInputKey(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', fontSize: '0.9rem', marginTop: '0.25rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                {userAccountKey && (
                  <button type="button" className="btn btn-danger" onClick={handleLogout} style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                    Log Out
                  </button>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                  {currentUser && <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>}
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Authenticating...' : (isSignUp ? 'Sign Up' : 'Log In')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('atelier-theme') || 'ecru');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('atelier-theme', theme);
  }, [theme]);

  return (
    <>
      <ScrollToTop />
      <nav>
        <NavLink to="/" className="nav-logo" onClick={() => setMenuOpen(false)}>
          Atelier
        </NavLink>

        {/* Desktop nav */}
        <div className="nav-links">
          {NAV_LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              className={({ isActive }) => `nav-link ${isActive ? 'active-link' : ''}`}
            >
              {link.label}
              {link.to === '/laundry' && <LaundryBadge />}
            </NavLink>
          ))}
        </div>

        {/* User Account Auth + Theme selector + hamburger */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <UserAccountAuth />
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            style={{
              padding: '0.35rem 0.5rem',
              fontSize: '0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-color)',
              cursor: 'pointer',
              width: 'auto'
            }}
          >
            {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          {/* Hamburger for mobile */}
          <button
            className="hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'none', flexDirection: 'column', gap: '5px',
              padding: '4px'
            }}
          >
            <span style={{ display: 'block', width: '22px', height: '2px', background: 'var(--text-color)', borderRadius: '2px', transition: 'all 0.25s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
            <span style={{ display: 'block', width: '22px', height: '2px', background: 'var(--text-color)', borderRadius: '2px', opacity: menuOpen ? 0 : 1, transition: 'all 0.25s' }} />
            <span style={{ display: 'block', width: '22px', height: '2px', background: 'var(--text-color)', borderRadius: '2px', transition: 'all 0.25s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0,
          background: 'var(--bg-color)', zIndex: 999,
          display: 'flex', flexDirection: 'column', padding: '1.5rem',
          gap: '0.25rem', overflowY: 'auto'
        }}>
          {NAV_LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              className={({ isActive }) => `nav-link ${isActive ? 'active-link' : ''}`}
              onClick={() => setMenuOpen(false)}
              style={{ fontSize: '1.2rem', padding: '0.75rem 0' }}
            >
              {link.label}
              {link.to === '/laundry' && <LaundryBadge />}
            </NavLink>
          ))}
        </div>
      )}

      <main className="container">
        <Routes>
          <Route path="/"        element={<Home />} />
          <Route path="/closet"  element={<ClosetBrowser />} />
          <Route path="/upload"  element={<UploadItem />} />
          <Route path="/suggest" element={<Suggestions />} />
          <Route path="/history" element={<OutfitHistory />} />
          <Route path="/presets" element={<Presets />} />
          <Route path="/laundry" element={<LaundryQueue />} />
          <Route path="/trip"    element={<TripPacking />} />
          <Route path="/wishlist" element={<Wishlist />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
