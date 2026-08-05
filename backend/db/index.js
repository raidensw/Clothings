const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'wardrobe.db');
const db = new DatabaseSync(dbPath);

// Initialize database schema (creates new tables)
const schemaPath = path.resolve(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

// Migration: Add user_id to all resource tables if missing
const userMigrations = [
  "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, name TEXT, avatar_color TEXT DEFAULT '#5B664C', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);",
  "ALTER TABLE users ADD COLUMN bin_id TEXT;",
  "ALTER TABLE clothing_items ADD COLUMN user_id INTEGER DEFAULT 1;",
  "ALTER TABLE scents ADD COLUMN user_id INTEGER DEFAULT 1;",
  "ALTER TABLE outfit_presets ADD COLUMN user_id INTEGER DEFAULT 1;",
  "ALTER TABLE wishlist ADD COLUMN user_id INTEGER DEFAULT 1;",
  "ALTER TABLE trips ADD COLUMN user_id INTEGER DEFAULT 1;",
  "ALTER TABLE outfit_logs ADD COLUMN user_id INTEGER DEFAULT 1;",
  "ALTER TABLE clothing_items ADD COLUMN back_image_path TEXT;"
];

userMigrations.forEach(query => {
  try { db.exec(query); } catch (err) { /* column/table already exists */ }
});

// Create default user profile if none exists
try {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    db.prepare('INSERT INTO users (username, password, name, avatar_color) VALUES (?, ?, ?, ?)').run('demo', '1234', 'My Wardrobe', '#5B664C');
  }
} catch (e) {
  console.error('Error seeding default user:', e.message);
}

module.exports = db;
