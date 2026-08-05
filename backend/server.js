require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const ai = require('./ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Simple in-memory weather cache
const weatherCache = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Configure multer in-memory for serverless compatibility (Netlify/Lambda)
const upload = multer({ storage: multer.memoryStorage() });

// Profile Context Middleware
app.use((req, res, next) => {
  const userIdHeader = req.headers['x-user-id'];
  req.userId = userIdHeader ? String(userIdHeader).trim() : '1';
  next();
});

// In-memory Cloud User & Wardrobe Store for zero-reset cross-device account sync
const cloudUserAccounts = new Map();
const cloudWardrobes = new Map();

// ─── AUTHENTICATION & SYNC ROUTES ─────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUser = username.trim().toLowerCase();
  try {
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUser);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken. Please try logging in!' });
    }

    const userObj = {
      username: cleanUser,
      password: password.trim(),
      name: name || username,
    };

    db.prepare('INSERT INTO users (username, password, name) VALUES (?, ?, ?)')
      .run(userObj.username, userObj.password, userObj.name);

    res.json({ success: true, user: { username: userObj.username, name: userObj.name, bin_id: null } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUser = username.trim().toLowerCase();
  try {
    let user = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUser);

    if (!user) {
      // If account doesn't exist yet, auto-create it for smooth user experience!
      const userObj = {
        username: cleanUser,
        password: password.trim(),
        name: username,
      };
      db.prepare('INSERT INTO users (username, password, name) VALUES (?, ?, ?)')
        .run(userObj.username, userObj.password, userObj.name);
      
      user = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUser);
    } else if (user.password !== password.trim()) {
      return res.status(400).json({ error: 'Incorrect password for this username' });
    }

    res.json({ success: true, user: { username: user.username, name: user.name, bin_id: user.bin_id || null } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/update-bin', (req, res) => {
  const { username, bin_id } = req.body;
  if (!username || !bin_id) {
    return res.status(400).json({ error: 'Username and bin_id are required' });
  }

  const cleanUser = username.trim().toLowerCase();
  try {
    db.prepare('UPDATE users SET bin_id = ? WHERE username = ?').run(bin_id, cleanUser);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update bin ID:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/sync', (req, res) => {
  const username = (req.headers['x-user-id'] || 'demo').toLowerCase();
  const wardrobe = cloudWardrobes.get(username) || { clothing: [], scents: [], presets: [], logs: [] };
  res.json(wardrobe);
});

app.post('/api/auth/sync', (req, res) => {
  const username = (req.headers['x-user-id'] || 'demo').toLowerCase();
  const { clothing, scents, presets, logs } = req.body;
  
  const existing = cloudWardrobes.get(username) || { clothing: [], scents: [], presets: [], logs: [] };
  const updated = {
    clothing: clothing || existing.clothing,
    scents: scents || existing.scents,
    presets: presets || existing.presets,
    logs: logs || existing.logs
  };

  cloudWardrobes.set(username, updated);
  res.json({ success: true, wardrobe: updated });
});

// ─── CLOTHING ROUTES ────────────────────────────────────────────────────────

app.post('/api/clothing/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const mimeType = req.file.mimetype || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${req.file.buffer.toString('base64')}`;

    let draftTags = { category: 'Garment', color: 'Neutral', style: 'Casual', pattern: 'Solid', season_fit: 'All-season', warmth_level: 3 };
    try {
      if (process.env.GROQ_API_KEY) {
        draftTags = await ai.analyzeClothingImage(dataUrl);
      }
    } catch (aiErr) {
      console.warn('AI analysis fallback:', aiErr.message);
    }
    
    res.json({ image_path: dataUrl, tags: draftTags });
  } catch (err) {
    console.error('Clothing upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clothing/upload-back', upload.single('back_image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No back image uploaded' });
    const mimeType = req.file.mimetype || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${req.file.buffer.toString('base64')}`;
    res.json({ back_image_path: dataUrl });
  } catch (err) {
    console.error('Back clothing upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clothing', (req, res) => {
  const { image_path, back_image_path, category, color, style, pattern, season_fit, warmth_level, brand, purchase_price } = req.body;
  try {
    const formattedSeasonFit = Array.isArray(season_fit) ? season_fit.join(', ') : season_fit;
    const formattedStyle = Array.isArray(style) ? style.join(', ') : style;
    const stmt = db.prepare(`
      INSERT INTO clothing_items (user_id, image_path, back_image_path, category, color, style, pattern, season_fit, warmth_level, brand, purchase_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(req.userId, image_path, back_image_path || null, category, color, formattedStyle, pattern, formattedSeasonFit, warmth_level, brand || null, purchase_price || null);
    res.json({ id: info.lastInsertRowid, success: true });
  } catch (err) {
    console.error('Failed to save clothing item:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/clothing', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM clothing_items WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clothing/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM clothing_items WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/clothing/:id/dirty', (req, res) => {
  const { is_dirty } = req.body;
  try {
    db.prepare('UPDATE clothing_items SET is_dirty = ? WHERE id = ?').run(is_dirty ? 1 : 0, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update dirty status:', err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk actions: mark multiple items dirty/clean
app.patch('/api/clothing/bulk/dirty', (req, res) => {
  const { ids, is_dirty } = req.body;
  try {
    const stmt = db.prepare('UPDATE clothing_items SET is_dirty = ? WHERE id = ?');
    ids.forEach(id => stmt.run(is_dirty ? 1 : 0, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk archive
app.post('/api/clothing/bulk/archive', (req, res) => {
  const { ids } = req.body;
  try {
    const stmt = db.prepare('DELETE FROM clothing_items WHERE id = ?');
    ids.forEach(id => stmt.run(id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Duplicate check endpoint
app.post('/api/clothing/check-duplicate', (req, res) => {
  const { category, color } = req.body;
  try {
    const existing = db.prepare(
      'SELECT id, image_path, category, color, style FROM clothing_items WHERE LOWER(category) = LOWER(?) AND LOWER(color) = LOWER(?)'
    ).all(category || '', color || '');
    res.json({ duplicates: existing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SCENT ROUTES ────────────────────────────────────────────────────────────

app.post('/api/scents/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const imagePath = `/uploads/${req.file.filename}`;
    const fullPath = path.join(__dirname, imagePath);
    console.log('Analyzing scent image:', fullPath);
    const draftTags = await ai.analyzeScentImage(fullPath);
    console.log('AI scent tags:', draftTags);
    res.json({ image_path: imagePath, tags: draftTags });
  } catch (err) {
    console.error('Scent upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scents', (req, res) => {
  const { image_path, name, type, scent_profile, season_fit, occasions } = req.body;
  try {
    const formattedOccasions = Array.isArray(occasions) ? occasions.join(', ') : occasions;
    const formattedSeasonFit = Array.isArray(season_fit) ? season_fit.join(', ') : season_fit;
    const formattedScentProfile = Array.isArray(scent_profile) ? scent_profile.join(', ') : scent_profile;
    const stmt = db.prepare(`
      INSERT INTO scents (image_path, name, type, scent_profile, season_fit, occasions)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(image_path, name, type, formattedScentProfile, formattedSeasonFit, formattedOccasions);
    res.json({ id: info.lastInsertRowid, success: true });
  } catch (err) {
    console.error('Failed to save scent item:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/scents', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM scents ORDER BY created_at DESC').all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/scents/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM scents WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update fragrance ml_remaining
app.patch('/api/scents/:id/level', (req, res) => {
  const { ml_remaining } = req.body;
  try {
    db.prepare('UPDATE scents SET ml_remaining = ? WHERE id = ?').run(ml_remaining, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── OUTFIT HISTORY ROUTES ───────────────────────────────────────────────────

// Get all outfit logs
app.get('/api/history', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM outfit_logs ORDER BY date DESC').all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Log today's outfit
app.post('/api/history', (req, res) => {
  const { date, item_ids, scent_id, occasion } = req.body;
  try {
    const idsStr = Array.isArray(item_ids) ? JSON.stringify(item_ids) : item_ids;
    const stmt = db.prepare(`
      INSERT INTO outfit_logs (date, item_ids, scent_id, occasion)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET item_ids=excluded.item_ids, scent_id=excluded.scent_id, occasion=excluded.occasion
    `);
    stmt.run(date, idsStr, scent_id || null, occasion || '');
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to log outfit:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get items worn in the last N days (for cooldown)
app.get('/api/history/recent', (req, res) => {
  const days = parseInt(req.query.days || '3');
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const logs = db.prepare("SELECT item_ids, scent_id FROM outfit_logs WHERE date >= ?").all(cutoffStr);
    const itemIds = new Set();
    const scentIds = new Set();
    logs.forEach(log => {
      try {
        const ids = JSON.parse(log.item_ids || '[]');
        ids.forEach(id => itemIds.add(id));
      } catch {}
      if (log.scent_id) scentIds.add(log.scent_id);
    });
    res.json({ item_ids: [...itemIds], scent_ids: [...scentIds] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Most worn items this month
app.get('/api/history/stats', (req, res) => {
  try {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const cutoffStr = firstOfMonth.toISOString().split('T')[0];
    const logs = db.prepare("SELECT item_ids FROM outfit_logs WHERE date >= ?").all(cutoffStr);
    const counts = {};
    logs.forEach(log => {
      try {
        const ids = JSON.parse(log.item_ids || '[]');
        ids.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
      } catch {}
    });
    res.json({ counts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TRIP / PACKING ROUTES ───────────────────────────────────────────────────

app.post('/api/trips', (req, res) => {
  const { destination, start_date, end_date, packed_clothing_ids, packed_scent_ids } = req.body;
  try {
    const clothingIdsStr = JSON.stringify(packed_clothing_ids || []);
    const scentIdsStr = JSON.stringify(packed_scent_ids || []);
    // Lock packed items until trip ends
    if (packed_clothing_ids && packed_clothing_ids.length > 0) {
      const stmt = db.prepare('UPDATE clothing_items SET packed_until = ? WHERE id = ?');
      packed_clothing_ids.forEach(id => stmt.run(end_date, id));
    }
    const tripStmt = db.prepare(`
      INSERT INTO trips (destination, start_date, end_date, packed_clothing_ids, packed_scent_ids)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = tripStmt.run(destination, start_date, end_date, clothingIdsStr, scentIdsStr);
    res.json({ id: info.lastInsertRowid, success: true });
  } catch (err) {
    console.error('Failed to create trip:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/trips', (req, res) => {
  try {
    const trips = db.prepare('SELECT * FROM trips ORDER BY start_date DESC').all();
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/trips/:id', (req, res) => {
  try {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
    if (trip) {
      // Unpack clothing
      const ids = JSON.parse(trip.packed_clothing_ids || '[]');
      const stmt = db.prepare('UPDATE clothing_items SET packed_until = NULL WHERE id = ?');
      ids.forEach(id => stmt.run(id));
    }
    db.prepare('DELETE FROM trips WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PRESETS ROUTES ──────────────────────────────────────────────────────────

app.get('/api/presets', (req, res) => {
  try {
    const presets = db.prepare('SELECT * FROM outfit_presets ORDER BY created_at DESC').all();
    res.json(presets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/presets', (req, res) => {
  const { name, clothing_ids, scent_id } = req.body;
  try {
    const idsStr = JSON.stringify(clothing_ids || []);
    const info = db.prepare('INSERT INTO outfit_presets (name, clothing_ids, scent_id) VALUES (?, ?, ?)')
      .run(name, idsStr, scent_id || null);
    res.json({ id: info.lastInsertRowid, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/presets/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM outfit_presets WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if all preset pieces are clean
app.get('/api/presets/:id/check', (req, res) => {
  try {
    const preset = db.prepare('SELECT * FROM outfit_presets WHERE id = ?').get(req.params.id);
    if (!preset) return res.status(404).json({ error: 'Preset not found' });
    const ids = JSON.parse(preset.clothing_ids || '[]');
    const today = new Date().toISOString().split('T')[0];
    const items = ids.map(id => db.prepare('SELECT id, category, color, is_dirty, packed_until FROM clothing_items WHERE id = ?').get(id)).filter(Boolean);
    const dirtyItems = items.filter(i => i.is_dirty === 1);
    const packedItems = items.filter(i => i.packed_until && i.packed_until >= today);
    res.json({ ready: dirtyItems.length === 0 && packedItems.length === 0, dirty: dirtyItems, packed: packedItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WISHLIST ROUTES ─────────────────────────────────────────────────────────

app.get('/api/wishlist', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM wishlist ORDER BY purchased ASC, created_at DESC').all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wishlist', (req, res) => {
  const { item_name, category, price, link } = req.body;
  try {
    const info = db.prepare('INSERT INTO wishlist (item_name, category, price, link) VALUES (?, ?, ?, ?)')
      .run(item_name, category || '', price || null, link || '');
    res.json({ id: info.lastInsertRowid, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/wishlist/:id/purchased', (req, res) => {
  try {
    db.prepare('UPDATE wishlist SET purchased = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/wishlist/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM wishlist WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SUGGESTION ROUTES ───────────────────────────────────────────────────────

app.post('/api/suggest/outfit', async (req, res) => {
  const { occasion, weather, clothing: bodyClothing, scents: bodyScents } = req.body;
  try {
    const today = new Date().toISOString().split('T')[0];
    let clothing = db.prepare('SELECT * FROM clothing_items WHERE user_id = ? AND is_dirty = 0 AND (packed_until IS NULL OR packed_until < ?)').all(req.userId, today);
    let scents = db.prepare('SELECT * FROM scents WHERE user_id = ?').all(req.userId);

    // Fallback to client-provided items if DB returns empty on serverless
    if (clothing.length === 0 && Array.isArray(bodyClothing) && bodyClothing.length > 0) {
      clothing = bodyClothing;
    }
    if (scents.length === 0 && Array.isArray(bodyScents) && bodyScents.length > 0) {
      scents = bodyScents;
    }

    if (clothing.length === 0) {
      return res.json({
        styling_advice: "Your closet is currently empty! Upload a few clothing items on the 'Add Item' tab to generate custom outfit pairings.",
        clothing: [],
        scents: []
      });
    }

    const aiResult = await ai.suggestOutfit(clothing, scents, weather, occasion, []);

    const recommendedClothing = clothing.filter(item =>
      aiResult.recommended_clothing_ids && aiResult.recommended_clothing_ids.includes(item.id)
    );
    const recommendedScents = scents.filter(item =>
      aiResult.recommended_scent_ids && aiResult.recommended_scent_ids.includes(item.id)
    );

    res.json({
      styling_advice: aiResult.styling_advice || aiResult,
      clothing: recommendedClothing.length > 0 ? recommendedClothing : clothing.slice(0, 3),
      scents: recommendedScents.length > 0 ? recommendedScents : scents.slice(0, 1)
    });
  } catch (err) {
    console.error('Failed to get outfit suggestion:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suggest/multiday', async (req, res) => {
  const { occasion, weather, days } = req.body;
  try {
    const today = new Date().toISOString().split('T')[0];
    const clothing = db.prepare('SELECT * FROM clothing_items WHERE is_dirty = 0 AND (packed_until IS NULL OR packed_until < ?)').all(today);
    const scents = db.prepare('SELECT * FROM scents').all();
    const aiResult = await ai.suggestMultiDayOutfit(clothing, scents, weather, occasion || 'everyday', days || 2);

    // Resolve item objects for each day
    const resolvedDays = (aiResult.days || []).map(day => ({
      ...day,
      clothing: clothing.filter(c => (day.recommended_clothing_ids || []).includes(c.id)),
      scents: scents.filter(s => (day.recommended_scent_ids || []).includes(s.id))
    }));

    res.json({ styling_advice: aiResult.styling_advice, days: resolvedDays });
  } catch (err) {
    console.error('Failed to get multi-day suggestion:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suggest/shopping', async (req, res) => {
  try {
    const clothing = db.prepare('SELECT * FROM clothing_items').all();
    const scents = db.prepare('SELECT * FROM scents').all();
    const suggestion = await ai.suggestShopping(clothing, scents);
    res.json({ suggestion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suggest/packing', async (req, res) => {
  const { weatherForecast, tripDuration } = req.body;
  try {
    const today = new Date().toISOString().split('T')[0];
    const clothing = db.prepare('SELECT * FROM clothing_items WHERE is_dirty = 0 AND (packed_until IS NULL OR packed_until < ?)').all(today);
    const scents = db.prepare('SELECT * FROM scents').all();
    const aiResult = await ai.suggestPacking(clothing, scents, weatherForecast, tripDuration);

    const recommendedClothing = clothing.filter(item =>
      aiResult.recommended_clothing_ids && aiResult.recommended_clothing_ids.includes(item.id)
    );
    const recommendedScents = scents.filter(item =>
      aiResult.recommended_scent_ids && aiResult.recommended_scent_ids.includes(item.id)
    );

    res.json({
      packing_rationale: aiResult.packing_rationale || aiResult,
      clothing: recommendedClothing,
      scents: recommendedScents
    });
  } catch (err) {
    console.error('Failed to get packing suggestion:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve static frontend files in production
const frontendDist = path.join(__dirname, '../dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
