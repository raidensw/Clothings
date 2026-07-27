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

        {/* Theme selector + hamburger */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Theme:</span>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            style={{
              padding: '0.35rem 0.75rem',
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
