# Atelier — Wardrobe & Scent Assistant (Full Feature Specification)

Atelier is an editorial-grade, AI-powered personal styling and wardrobe management web application. It seamlessly integrates digital clothes and fragrance cataloging with intelligent weather-aware styling, outfit tracking, multi-day trip packing, laundry queue management, and wishlist shopping gap analysis.

---

## 🎨 Design & Customization Architecture

### Editorial Fashion Aesthetic
- **Typography**: Header titles set in *Cormorant Garamond* (Serif), body text in *Plus Jakarta Sans*, and tag labels in *JetBrains Mono*.
- **Card Layout**: Aspect ratio portrait hangtag cards with subtle hover elevations, smooth transitions, and responsive grid reflow.

### Multi-Theme Customization
Atelier includes 6 curated color themes selectable from the navigation bar (persisted in `localStorage`):
1. **Atelier Ecru** (Default): Bone/Ecru light linen background (`#FAF8F5`) with warm charcoal typography (`#201E1C`).
2. **Warm Charcoal**: High-fashion evening dark mode (`#161514`) with cream highlights.
3. **Sage Studio**: Calming nature olive aesthetic (`#F1F3ED`) with deep sage text (`#2D3425`).
4. **Clay Studio**: Warm terracotta clay earth tones (`#FAF4EF`).
5. **Midnight**: Dark indigo violet mode (`#0D0E12`).
6. **Blush**: Soft pastel rose/pink theme (`#FDF5F3`).

---

## 🌐 Application Pages & Key Features

### 1. Home (`/`)
- Brand hero banner featuring interactive SVG fashion icon.
- Overview of all key capabilities: Cataloging, Harmonizing, History Tracking, Trip Packing, Presets, and Wishlists.
- Quick navigation shortcuts to essential views.

### 2. Closet Catalog (`/closet`)
- **Category & Type Switching**: Toggle between Clothing Catalog and Fragrances. Filter clothes by category pills.
- **Bulk Actions**: Select multiple items with visual checkmark badges to perform batch actions: *Mark Dirty*, *Mark Clean*, or *Archive*.
- **Garment Metadata**: Displays category, color, style, season fit, brand name, and purchase price.
- **Fragrance Level Tracker**: Progress bar tracking remaining volume (`ml_remaining`) with inline level editor.
- **Status Indicators**: Badges for items currently in laundry (*Dirty*) or locked for travel (*Packed Until [Date]*).

### 3. Catalog New Pieces (`/upload`)
- **AI Vision Analysis**: Powered by Groq Vision (`qwen/qwen3.6-27b`). Automatically extracts category, dominant color, style elements, pattern, seasonal fit, warmth level, and scent notes from bottle photos.
- **Browser-Side Resizing**: Canvas-based image compressor limits upload size for sub-second AI turnaround.
- **Duplicate Prevention Warning**: Scans existing closet before saving and alerts user if a similar item (matching category & color) is already owned.
- **Editable Draft Cards**: Customize AI tags, add brand name and purchase price before committing to catalog.

### 4. AI Stylist (`/suggest`)
- **Live Local Weather Integration**: Geolocation + Open-Meteo API integration provides real-time temperature and climate conditions.
- **Today's Outfit Mode**: Generates single-day outfit and scent pairings based on weather and occasion (chilling, work, date night, gym, formal, travel).
- **Cooldown Warning System**: Detects items worn in the last 3 days and surfaces a warning to prevent over-wearing garments or scents.
- **Multi-Day Outfit Planner**: Curates distinct outfit itineraries across 2, 3, 5, or 7 days with minimal repeat overlap.
- **1-Tap Log Today**: Commit suggested outfit directly into the daily Outfit Log.
- **Save as Preset**: Convert any generated look into a reusable named preset.

### 5. Outfit History & Calendar Log (`/history`)
- **Interactive Calendar Grid**: Visual monthly view displaying logged daily outfits with indicator dots.
- **Most Worn Analytics**: Surfaces monthly rewear statistics highlighting your most worn item.
- **Retroactive Logging**: Select any day on the calendar to log or edit clothes worn and fragrance applied.

### 6. Outfit Presets (`/presets`)
- **Saved Combinations**: Create and label favorite outfit + scent combos ("Date Night", "Client Meeting").
- **Clean & Availability Check**: 1-Tap "Check" or "Wear Today" button validates that all items in the preset are clean and not locked for a trip before confirming.

### 7. Laundry Queue (`/laundry`)
- **Category Grouping**: Dedicated laundry manager grouping all dirty garments by category.
- **Batch Washing**: Multi-select dirty clothes or use "Select All" to mark items clean after doing laundry.
- **Live Nav Badge**: Counter badge in the top navigation header showing real-time dirty item count.

### 8. Trip Packing Mode (`/trip`)
- **Multi-Day Weather Forecast**: Enter any destination city and date range; app geocodes location via Open-Meteo and fetches forecast.
- **AI Packing List**: Auto-generates a balanced packing list tailored to expected weather and trip length.
- **"Pack This" Locking**: Locks selected items as reserved/unavailable for daily suggestions until trip end date (`packed_until`).

### 9. Shopping Wishlist & Gap Analysis (`/wishlist`)
- **Wishlist Manager**: Track desired clothing/scents with prices, categories, and direct store links.
- **Spent & Cost Analytics**: Real-time summary metrics for total spent on purchased items vs pending wishlist cost.
- **AI Gap Analysis**: Analyzes wardrobe catalog to identify missing core staples and suggests recommended additions.

---

## 🗄️ Database Schema & API Specifications

### Database Engine: SQLite (`node:sqlite` / `wardrobe.db`)

#### Tables:
1. `clothing_items`: `id`, `image_path`, `category`, `color`, `style`, `pattern`, `season_fit`, `warmth_level`, `brand`, `purchase_price`, `is_dirty`, `packed_until`, `created_at`
2. `scents`: `id`, `image_path`, `name`, `type`, `scent_profile`, `season_fit`, `occasions`, `ml_remaining`, `last_worn`, `created_at`
3. `outfit_logs`: `id`, `date` (UNIQUE), `item_ids` (JSON Array), `scent_id`, `occasion`, `created_at`
4. `trips`: `id`, `destination`, `start_date`, `end_date`, `packed_clothing_ids` (JSON Array), `packed_scent_ids` (JSON Array), `created_at`
5. `outfit_presets`: `id`, `name`, `clothing_ids` (JSON Array), `scent_id`, `created_at`
6. `wishlist`: `id`, `item_name`, `category`, `price`, `link`, `purchased`, `created_at`

---

## 🚀 Running the App

### Start Development Server:
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
