const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'wardrobe.db');
const db = new DatabaseSync(dbPath);

// Initialize database schema (creates new tables)
const schemaPath = path.resolve(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

// Migration: Add columns to clothing_items if they don't exist
const clothingMigrations = [
  "ALTER TABLE clothing_items ADD COLUMN is_dirty INTEGER DEFAULT 0;",
  "ALTER TABLE clothing_items ADD COLUMN brand TEXT;",
  "ALTER TABLE clothing_items ADD COLUMN purchase_price REAL;",
  "ALTER TABLE clothing_items ADD COLUMN packed_until TEXT;"
];

clothingMigrations.forEach(query => {
  try { db.exec(query); } catch (err) { /* column already exists */ }
});

// Migration: Add columns to scents if they don't exist
const scentMigrations = [
  "ALTER TABLE scents ADD COLUMN ml_remaining REAL DEFAULT 100;",
  "ALTER TABLE scents ADD COLUMN last_worn TEXT;"
];

scentMigrations.forEach(query => {
  try { db.exec(query); } catch (err) { /* column already exists */ }
});

// New tables: outfit_logs, trips, outfit_presets, wishlist
const newTableMigrations = [
  `CREATE TABLE IF NOT EXISTS outfit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    item_ids TEXT NOT NULL DEFAULT '[]',
    scent_id INTEGER,
    occasion TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    destination TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    packed_clothing_ids TEXT DEFAULT '[]',
    packed_scent_ids TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS outfit_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    clothing_ids TEXT DEFAULT '[]',
    scent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS wishlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    category TEXT DEFAULT '',
    price REAL,
    link TEXT DEFAULT '',
    purchased INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`
];

newTableMigrations.forEach(query => {
  try { db.exec(query); } catch (err) { console.warn('Table migration warning:', err.message); }
});

module.exports = db;
