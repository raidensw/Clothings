CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT,
  avatar_color TEXT DEFAULT '#5B664C',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clothing_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT DEFAULT '1',
  image_path TEXT NOT NULL,
  back_image_path TEXT,
  category TEXT,
  color TEXT,
  style TEXT,
  pattern TEXT,
  season_fit TEXT,
  warmth_level INTEGER,
  is_dirty INTEGER DEFAULT 0,
  brand TEXT,
  purchase_price REAL,
  packed_until TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT DEFAULT '1',
  image_path TEXT NOT NULL,
  name TEXT DEFAULT 'unnamed',
  type TEXT,
  scent_profile TEXT,
  season_fit TEXT,
  occasions TEXT,
  ml_remaining REAL DEFAULT 100,
  last_worn TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outfit_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT 1,
  name TEXT NOT NULL,
  clothing_ids TEXT, -- JSON array of clothing item IDs
  scent_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wishlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT 1,
  item_name TEXT NOT NULL,
  category TEXT,
  price REAL,
  link TEXT,
  purchased INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT 1,
  destination TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  packed_clothing_ids TEXT, -- JSON array
  packed_scent_ids TEXT, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outfit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT 1,
  date TEXT NOT NULL, -- format YYYY-MM-DD
  item_ids TEXT, -- JSON array of item IDs
  scent_id INTEGER,
  weather_snapshot TEXT, -- JSON string
  occasion TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);
