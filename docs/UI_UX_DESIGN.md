# gobuildgo — UI/UX Design Specification

## Design System

### Color Palette (CSS Custom Properties)

```css
:root {
  /* Primary */
  --color-primary-50: #EFF6FF;
  --color-primary-100: #DBEAFE;
  --color-primary-500: #3B82F6;
  --color-primary-600: #2563EB;  /* main */
  --color-primary-700: #1D4ED8;

  /* Secondary */
  --color-secondary-100: #F1F5F9;
  --color-secondary-500: #64748B;
  --color-secondary-700: #334155;

  /* Accent */
  --color-accent-500: #F59E0B;
  --color-accent-600: #D97706;

  /* Semantic */
  --color-success: #22C55E;
  --color-warning: #F97316;
  --color-error: #EF4444;
  --color-info: #3B82F6;

  /* Neutrals */
  --color-white: #FFFFFF;
  --color-gray-50: #F8FAFC;
  --color-gray-100: #F1F5F9;
  --color-gray-200: #E2E8F0;
  --color-gray-300: #CBD5E1;
  --color-gray-400: #94A3B8;
  --color-gray-500: #64748B;
  --color-gray-600: #475569;
  --color-gray-700: #334155;
  --color-gray-800: #1E293B;
  --color-gray-900: #0F172A;
  --color-gray-950: #020617;
  --color-black: #000000;
}

[data-theme="dark"] {
  --color-bg: var(--color-gray-950);
  --color-surface: var(--color-gray-900);
  --color-surface-elevated: var(--color-gray-800);
  --color-text: var(--color-gray-100);
  --color-text-muted: var(--color-gray-400);
  --color-border: var(--color-gray-700);
  --color-primary: #60A5FA;  /* blue-400 for dark mode */
}
```

### Typography

| Token | Value | Usage |
|---|---|---|
| `--font-primary` | "Inter", "Noto Sans", system-ui | Body, UI |
| `--font-display` | "Inter", "Noto Sans", system-ui | Headings |
| `--font-mono` | "JetBrains Mono", monospace | Code, prices |

| Scale | Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| xs | 12px | 1.5 | 400 | Captions, badges |
| sm | 14px | 1.5 | 400 | Secondary text |
| base | 16px | 1.6 | 400 | Body (1.6 for Vietnamese) |
| lg | 18px | 1.6 | 500 | Subheadings |
| xl | 20px | 1.5 | 600 | Section headings |
| 2xl | 24px | 1.4 | 700 | Page headings |
| 3xl | 30px | 1.3 | 700 | Hero subheading |
| 4xl | 36px | 1.2 | 800 | Hero heading |

### Spacing (4px base)

| Token | Value |
|---|---|
| space-1 | 4px |
| space-2 | 8px |
| space-3 | 12px |
| space-4 | 16px |
| space-5 | 20px |
| space-6 | 24px |
| space-8 | 32px |
| space-10 | 40px |
| space-12 | 48px |
| space-16 | 64px |

### Border Radius

| Token | Value | Usage |
|---|---|---|
| radius-sm | 4px | Badges, small elements |
| radius-md | 8px | Buttons, inputs |
| radius-lg | 12px | Cards |
| radius-xl | 16px | Modals, panels |
| radius-full | 9999px | Avatars, pills |

### Shadows

| Token | Value | Usage |
|---|---|---|
| shadow-sm | 0 1px 2px rgba(0,0,0,0.05) | Subtle elevation |
| shadow-md | 0 4px 6px rgba(0,0,0,0.1) | Cards, dropdowns |
| shadow-lg | 0 10px 15px rgba(0,0,0,0.1) | Modals, panels |
| shadow-xl | 0 20px 25px rgba(0,0,0,0.15) | Floating elements |

### Component Variants

**Button**: primary, secondary, ghost, danger, link — each with sm(32px), md(40px), lg(48px) heights.

**Input**: default, error (red border + message), disabled (grayed). Includes label, helper text, error message slots.

**Card**: default, interactive (hover: shadow-lg + translateY(-2px)), selected (2px primary border).

**Badge**: default (gray), success (green), warning (orange), error (red), info (blue). Pill shape.

**Toast**: success, error, warning, info. Top-right stack. Auto-dismiss 5s. Manual dismiss X.

---

## Page Wireframes

### 1. Landing Page

**Header** (sticky, backdrop-blur):
- Left: Logo "gobuildgo" + tagline
- Center: Nav links — Themes, Components, Community, Blog
- Right: Language switcher (EN | VI) + "Get Started" button

**Hero** (full-width, gradient bg primary-600 → primary-800):
- Left (50%): Headline "Build Your Dream Desk Setup" (4xl, white, bold). Subheadline "Plan, visualize, and buy everything for your perfect workspace — in Vietnamese Dong." (lg, white/80%). Two CTAs: "Start Planning" (primary white) + "Browse Themes" (ghost white). Trust badges: "Free to use" + "300+ products" + "Shopee & Lazada prices".
- Right (50%): Animated carousel of 3 beautiful desk setup photos, auto-rotate 5s, with subtle parallax.

**How It Works** (3 columns, icon + text):
1. "Choose Your Room" (room icon) — "Pick your room type and dimensions"
2. "Add Components" (grid icon) — "Browse desks, chairs, lighting, and more"
3. "Share & Buy" (share icon) — "Export your setup and shop with one click"

**Featured Themes** (horizontal scroll carousel):
- Theme card: cover image (320x200), theme name, 5-color palette dots, item count badge, "Apply Theme" button.
- 6 themes: Japandi, Industrial, Minimalist, Gaming RGB, Retro, Scandinavian.

**Popular Setups** (3-column grid):
- Setup card: cover image, setup name, creator avatar + name, like count, view count, total price (VND).
- "View All" link below grid.

**CTA Banner** (full-width, accent bg):
- "Compare prices across Shopee, Lazada, and Tiki — find the best deals for every component."
- "Browse Components" button.

**Footer** (4 columns):
- Product: Planner, Themes, Components, Blog
- Company: About, Contact, Careers
- Resources: Guides, FAQ, API
- Legal: Privacy, Terms, Affiliate Disclosure
- Bottom: Social icons (Facebook, Instagram, TikTok), language switcher, copyright.

---

### 2. Planner Page (Main Feature)

**Top Bar** (sticky, surface bg, border-bottom):
- Left: Back arrow, setup name (editable text input, inline)
- Center: Style score badge (circular progress ring, color-coded: green >80, yellow 50-80, red <50)
- Right: Save button, Share button, Export Image button

**Left Panel** (25% width, scrollable, surface bg):
- **Room Selector**: 4 room type cards in 2x2 grid. Each: icon + label. Selected: primary border.
  - Bedroom, Gaming Room, Office, Studio
- **Room Dimensions**: Two number inputs (Width × Depth, cm). Small visual preview rectangle that scales.
- **Budget Slider**: Range 500k — 50M VND. Current total shown above. Progress bar: green (under budget), orange (90-100%), red (over).
- **Category Sidebar**: 9 categories with icons. Each shows item count badge. Click to expand component picker.
  - Desk, Chair, Monitor, Keyboard, Mouse, Lighting, Decor, Audio, Accessory

**Center — Room Visualizer** (50% width, canvas area):
- SVG canvas showing room outline (scaled to dimensions)
- Desk shape centered, items placed as colored rectangles with icons
- Empty state: illustration + "Start by selecting a desk" + "Browse Desks" button
- Items draggable within visualizer
- Click item → tooltip: name, price, remove button, style tag badges
- Grid overlay (optional toggle) for alignment

**Right Panel** (25% width, scrollable, surface bg):
- **Selected Items List**: Grouped by category. Each: thumbnail (40x40), name (truncated), price (VND), remove X button.
- **Running Total**: Large bold VND amount. Budget progress bar below.
- **Style Score Breakdown**:
  - Color Harmony: label + progress bar (0-100)
  - Theme Consistency: label + progress bar
  - Space Fit: label + progress bar
  - Budget Balance: label + progress bar
  - Suggestions: bullet list of improvement tips
- **Buy All Button**: Full width, primary, "Buy All on Shopee" (opens all affiliate links)

**Component Picker Modal** (opens when clicking category):
- Search input at top (full width, prominent)
- Filter chips: brand, color swatches, price range
- Sort dropdown: Popular, Price Low→High, Newest
- Grid of component cards (3 columns): image, brand, name, lowest price, shop name, style tags, "Add" button
- Infinite scroll or load more

---

### 3. Component Catalog Page

**Header**: Search bar (full width, large, auto-focus), sort dropdown.

**Left Sidebar** (sticky, 20% width):
- Category checkboxes (9 categories)
- Price range slider
- Brand checkboxes (collapsible, show top 10)
- Color swatches (clickable circles)
- Style tag chips (multi-select)
- "Clear All" link

**Main Grid** (responsive):
- 1 col mobile, 2 col tablet, 3 col desktop, 4 col wide
- **Component Card**:
  - Image (aspect 4/3, lazy loaded, blur placeholder)
  - Brand name (xs, muted)
  - Product name (sm, medium weight, 2-line clamp)
  - Lowest price (lg, bold, primary color)
  - Shop name + star rating (xs)
  - Style tags (2-3 small badges)
  - "Add to Setup" button (appears on hover, floating bottom-right)
- Load more / infinite scroll at bottom

---

### 4. Theme Gallery Page

**Hero**: "Curated Desk Setups for Every Style" + description text.

**Grid** (2 columns desktop, 1 mobile):

- **Theme Card** (large):
  - Cover image (full card background, gradient overlay)
  - Theme name (2xl, white, on image)
  - Description (sm, white/80%)
  - Color palette (5 dots with hex codes on hover)
  - Item count badge
  - "View Theme" button

**Theme Detail Page**:
- Full-width cover image (parallax on scroll)
- Theme description (2 paragraphs)
- Color palette (large swatches with hex codes, clickable to copy)
- Recommended items grid (same component card design)
- "Apply This Theme" button (fills planner with suggested items)
- Related themes section at bottom

---

### 5. Community Setups Page

**Header**: "Community Setups" + filter chips (room type, theme, budget range, sort).

**Grid** (3 columns):
- Same as popular setups on landing, but with more metadata
- Setup card: cover image, name, creator (avatar + name), likes, views, total price, room type badge, theme badge.

**Setup Detail Page**:
- Large cover image
- Setup name, creator info, like button, share button
- Room info: type, dimensions, theme
- Style score display
- Items list: grouped by category, each with image, name, price, affiliate link
- "Clone This Setup" button (copies to user's planner)
- Related setups at bottom

---

### 6. User Dashboard

**Sidebar** (left, fixed):
- Avatar (large), name, email
- Navigation: My Setups, Favorites, Affiliate History, Email Settings
- Sign Out at bottom

**My Setups**:
- Grid of user's setup cards with Edit / Delete / Share actions
- Empty state: illustration + "Create your first setup" + CTA

**Favorites**:
- Grid of favorited component cards with "Remove" action
- Empty state: "Browse components and click the heart icon"

**Affiliate History**:
- Table: Date, Component, Shop, Price, Status (clicked)
- Paginated

**Email Settings**:
- Toggle switches: Price Alerts, Weekly Digest, Promotional Emails
- Save button

---

## Interaction Patterns

### Adding Items
1. User clicks category in left panel → Component Picker modal opens
2. User clicks "Add" on component → Item slides into visualizer with animation
3. Style score recalculates (animated counter, 300ms)
4. Total price updates (animated number, 200ms)
5. Toast: "Added [Component Name]" with undo option

### Removing Items
1. Click X on item → Item fades out (200ms)
2. Visualizer updates
3. Score recalculates
4. Toast: "Removed [Component Name]" with undo

### Style Score
- Circular progress ring, animated on change
- Color: green (>80), yellow (50-80), red (<50)
- Click to expand: breakdown bars + suggestions list
- Recalculates on every item add/remove (debounced 100ms)

### Loading States
- Skeleton screens matching component card layout (shimmer animation)
- Visualizer: gray room outline with pulsing item placeholders
- Full page: centered spinner with "Loading your setup..." text

### Empty States
- **Empty visualizer**: Illustration (empty desk) + "Start by selecting a desk" + "Browse Desks" button
- **No search results**: "No components found" + "Try different filters" + "Clear Filters" button
- **No favorites**: "No favorites yet" + "Browse Components" button
- **No setups**: "No setups yet" + "Create Your First Setup" button

### Error States
- **API error**: Toast notification (red) + "Try Again" button
- **Image load failure**: Placeholder with component initial letter + muted background
- **Page crash**: Error boundary with friendly message + "Go Home" button

### Toast Notifications
- Position: top-right, stacked (max 4 visible)
- Types: success (green), error (red), warning (orange), info (blue)
- Auto-dismiss: 5 seconds
- Manual dismiss: X button
- Animation: slide in from right, fade out

---

## Responsive Design

### Breakpoints
| Token | Value | Target |
|---|---|---|
| sm | 640px | Large phones |
| md | 768px | Tablets |
| lg | 1024px | Laptops |
| xl | 1280px | Desktops |
| 2xl | 1536px | Wide screens |

### Mobile Adaptations (< 768px)
- **Planner**: Full-screen visualizer. Bottom sheet for controls (swipe up). FAB (floating action button) for add item. Top bar collapses to icon-only.
- **Catalog**: Single column grid. Filters in bottom sheet (swipe up). Search bar sticky at top.
- **Navigation**: Hamburger menu with slide-out drawer. Language switcher in drawer.
- **Touch**: Minimum 44px tap targets. Swipe gestures for carousels. Pull-to-refresh on listings.

### Tablet Adaptations (768px - 1024px)
- **Planner**: Side panels collapse to icons (narrow rail). Visualizer takes 70% width.
- **Catalog**: 2-column grid. Filters in collapsible sidebar.

---

## Theming (Light/Dark Mode)

### Light Mode (default)
- Background: white
- Surface: gray-50
- Text: gray-900
- Muted text: gray-500
- Border: gray-200
- Primary: blue-600

### Dark Mode
- Background: gray-950
- Surface: gray-900
- Text: gray-100
- Muted text: gray-400
- Border: gray-700
- Primary: blue-400

### Persistence
- Store preference in localStorage (key: "theme")
- Read from cookie for SSR (prevent flash)
- Toggle: sun/moon icon in header
- Default: system preference (prefers-color-scheme)

### CSS Variables Approach
```css
:root {
  --color-bg: #FFFFFF;
  --color-surface: #F8FAFC;
  --color-text: #0F172A;
  /* ... all tokens */
}

[data-theme="dark"] {
  --color-bg: #020617;
  --color-surface: #0F172A;
  --color-text: #F1F5F9;
  /* ... all tokens */
}
```

---

## Vietnamese Typography

### Font Stack
```css
font-family: "Inter", "Noto Sans", "Noto Sans Vietnamese", system-ui, sans-serif;
```

### Rules
- Minimum line-height: 1.5 for body text, 1.75 for long-form content
- Never use `text-transform: uppercase` on Vietnamese text (breaks diacritics)
- Test overflow with long strings: "Bàn làm việc gỗ tự nhiên cao cấp"
- Font size: minimum 14px for Vietnamese body text (diacritics need space)
- Word break: `word-break: break-word` for Vietnamese (no spaces between words in some cases)
