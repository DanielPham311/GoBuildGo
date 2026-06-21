# gobuildgo Codebase Reference

> Last updated: 2026-06-22 (OpenRouter migration + pgvector 768→1536)

## Project Overview

Vietnam-focused desk setup planner + marketplace. Users plan desk setups by picking room type, theme, and components; prices are scraped from Vietnamese e-commerce (Shopee, eventually Lazada/Tiki). Stack: Next.js 14 (App Router) + TypeScript + Prisma/PostgreSQL (Neon) + pgvector + Voyage embeddings + Pollinations.ai image gen + TailwindCSS.

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18 |
| Language | TypeScript 5.5 |
| DB | PostgreSQL (Neon) + Prisma 5.18 |
| Vector search | pgvector (1024-dim, HNSW index) |
| AI embeddings | Voyage (voyage-4, 1024-dim, 200M free tokens/mo) |
| AI image gen | Pollinations.ai (FLUX, completely free, no signup/key) |
| Auth | NextAuth 4 (Google OAuth + CredentialsProvider, bcryptjs, JWT sessions) |
| Styling | TailwindCSS 3.4 + shadcn/ui primitives |
| State | Zustand 4.5 |
| Validation | Zod 3.23 |
| i18n | next-intl 3.17 (vi/en) |
| Testing | Vitest 2.0 + Playwright 1.45 |
| Scheduling | Vercel Cron |

## Directory Structure

```
gobuildgo/
├── app/                          # Next.js App Router
│   ├── api/v1/                   # All API routes (versioned)
│   │   ├── admin/                # Admin endpoints (dashboard + scraper) ✅
│   │   ├── auth/
│   │   │   ├── [...nextauth]/   # NextAuth handler ✅
│   │   │   └── signup/          # Credentials signup ✅
│   │   ├── components/           # GET list + detail ✅
│   │   ├── cron/                 # ingest + embed ✅
│   │   ├── health/               # Liveness check ✅
│   │   ├── prices/               # affiliate + compare (stubs)
│   │   ├── search/               # RAG vector search ✅
│   │   ├── setups/               # CRUD + clone/export/like (stubs)
│   │   ├── themes/               # list + detail ✅
│   │   ├── upload/room/          # AI room analysis (stubs)
│   │   ├── users/me/             # profile/setups/favorites (stubs)
│   │   └── visualize/            # RAG → Gemini image ✅
│   ├── admin/                    # Admin dashboard page ✅
│   │   ├── page.tsx              # Stats cards + scraper run + health log
│   │   └── layout.tsx            # Auth + role guard (admin only)
│   ├── planner/                  # Interactive setup planner ✅
│   │   ├── page.tsx              # 3-panel layout (room config / visualizer / items)
│   │   └── _components/          # Planner-specific components
│   │       ├── PlannerTopBar.tsx    # Name input, reset, save/share buttons
│   │       ├── RoomSelector.tsx     # Room type 2x2 grid + dimensions + Lucide icons
│   │       ├── BudgetSlider.tsx     # Range slider + presets + progress bar + status
│   │       ├── CategorySidebar.tsx  # 9 categories with Lucide icons + item counts
│   │       ├── RoomVisualizer.tsx   # SVG canvas: drag-and-drop, category shapes, tooltips
│   │       ├── SelectedItems.tsx    # Grouped items with prices, shop badges, remove
│   │       ├── StyleScore.tsx       # Circular score ring + 4 bars + suggestions
│   │       └── ComponentPicker.tsx  # Modal: search + category tabs + grid + add
│   ├── signin/                   # Sign-in page ✅ (credentials)
│   ├── signup/                   # Registration page ✅ (credentials)
│   ├── visualize/                # Visualize page (client + server) ✅
│   ├── error.tsx                 # Client error boundary
│   ├── global-error.tsx          # Root error boundary
│   ├── globals.css               # Tailwind + shadcn CSS variables
│   ├── layout.tsx                # Root layout with <Providers> + <Navbar>
│   ├── loading.tsx               # Root loading spinner
│   └── page.tsx                  # Home page — hero + feature cards + theme previews ✅
├── modules/                      # Domain logic
│   ├── components/               # ✅ Real — list + getById
│   ├── search/                   # ✅ Real — RAG search + embed refresh
│   ├── setups/                   # ⚠️ Partial — listPublic only
│   ├── themes/                   # ✅ Real — list + getThemeBySlug
│   └── visualize/                # ✅ Real — full RAG → image pipeline
├── shared/                       # Cross-cutting infra
│   ├── ai/                       # ✅ OpenRouter embed + Pollinations image gen + rate limiter + batch embed
│   ├── api/                      # ✅ Response envelope + error helpers
│   ├── auth/                     # ✅ NextAuth config (CredentialsProvider) + helpers
│   ├── audit-log/                # ⚠️ Stub — console.log only
│   └── db/                       # ✅ Prisma singleton
├── components/                   # Shared UI components
│   ├── shared/
│   │   ├── Navbar.tsx            # ✅ Sticky nav: logo, auth-aware links, user menu
│   │   └── Providers.tsx         # ✅ SessionProvider wrapper
│   └── ui/                       # ❌ Empty (shadcn primitives not yet added)
├── scripts/
│   ├── scraper-run.ts            # ✅ CLI runner (dedup + history + health)
│   └── scrapers/                 # ✅ Shopee + clean + dedup + types
├── prisma/
│   ├── schema.prisma             # 15 models (including GeneratedRender, ScraperHealth)
│   ├── seed/                     # ✅ 34 components + 6 themes
│   └── migrations/               # 4 migrations (embedding + scraper_health + generated_render + resize_1536)
│       ├── 20260620000000_add_embedding/       # vector column + HNSW index
│       ├── 20260621000000_add_scraper_health/  # scraper_health table
│       └── 20260621000001_add_generated_render/ # generated_renders table
├── lib/
│   ├── constants.ts              # Categories, rooms, shops, pagination
│   └── utils.ts                  # cn, formatCurrency, slugify
├── store/
│   └── setup.ts                  # ✅ Zustand setup store (persist to localStorage)
├── docs/                         # Design docs (see CLAUDE.md for index)
├── .cursor/rules/architecture.mdc # Module layout rules
├── middleware.ts                 # Redirects unversioned /api/ → /api/v1/ + role check
├── next.config.mjs               # Security headers, image patterns
├── vercel.json                   # Cron schedules
├── playwright.config.ts          # E2E config (Chromium)
└── package.json                  # Scripts + deps (includes bcryptjs)
```

## Models (Prisma)

| Model | Status | Notes |
|---|---|---|
| User | ✅ Active | Credentials auth: passwordHash, role (user/admin), authProvider |
| Component | ✅ Active | + embedding vector(768)?, embeddingStale |
| Price | ✅ Active | @@unique([componentId, shop, condition]) |
| PriceHistory | ✅ Active | Tracks price changes on upsert |
| Setup | ⚠️ Schema only | CRUD not implemented |
| SetupItem | ⚠️ Schema only | |
| Theme | ✅ Active | Seeded (6 themes) |
| ThemeComponent | ✅ Active | |
| GeneratedRender | ✅ Active | Render caching by promptHash |
| ScraperHealth | ✅ Active | Per-scraper run tracking |
| AffiliateClick | ⚠️ Schema only | |
| UserFavorite | ⚠️ Schema only | |
| SetupLike | ⚠️ Schema only | |
| SetupView | ⚠️ Schema only | |
| EmailSubscription | ⚠️ Schema only | |

## API Endpoints

### ✅ Implemented (return real data)

| Method | Path | Module | Description |
|---|---|---|---|
| GET | /api/v1/components | components | List with filter/search/pagination |
| GET | /api/v1/components/[id] | components | Single component + prices |
| GET | /api/v1/themes | themes | List curated themes |
| GET | /api/v1/themes/[slug] | themes | Theme detail + recommended components |
| GET | /api/v1/setups | setups | List public setups (paginated) |
| GET | /api/v1/search | search | RAG vector search (diversified) |
| POST | /api/v1/visualize | visualize | RAG retrieval → Gemini room image |
| POST | /api/v1/cron/ingest | cron | Weekly scrape → clean → dedup → upsert |
| POST | /api/v1/cron/embed | cron | Batch-embed stale components |
| POST | /api/v1/admin/scraper/run | admin | Trigger scrape run + write ScraperHealth |
| GET | /api/v1/admin/scraper/status | admin | Component counts + scraper health |
| POST | /api/v1/auth/signup | auth | Credentials signup (bcrypt, Zod validation) |
| GET | /api/v1/health | — | Liveness check |

### ⚠️ Stubs (return 501 notImplemented)

| Method | Path | Description |
|---|---|---|
| POST | /api/v1/setups | Create setup |
| GET/PATCH/DELETE | /api/v1/setups/[id] | Setup CRUD |
| POST | /api/v1/setups/[id]/clone | Clone setup |
| GET | /api/v1/setups/[id]/export | Export as image |
| POST | /api/v1/setups/[id]/like | Toggle like |
| GET/POST | /api/v1/admin/components | Admin component management |
| PATCH/DELETE | /api/v1/admin/components/[id] | Admin component edit/delete |
| GET | /api/v1/admin/stats | Dashboard metrics |
| GET | /api/v1/prices/affiliate | Resolve affiliate link |
| GET | /api/v1/prices/compare | Compare prices across shops |
| POST | /api/v1/upload/room | Upload room photo for AI analysis |
| GET | /api/v1/upload/room/[id]/result | AI analysis result |
| GET | /api/v1/upload/room/[id]/status | AI analysis status |
| GET/PATCH | /api/v1/users/me | User profile |
| GET | /api/v1/users/me/setups | User's saved setups |
| PUT/DELETE | /api/v1/users/me/favorites/[id] | Favorite management |
| GET/PATCH | /api/v1/users/me/email-settings | Notification preferences |

## Module Details

### `modules/components/` ✅
- **schema.ts**: `listComponentsQuerySchema` — page, limit, category, brand, search, sort
- **service.ts**: `listComponents(query)` — findMany with filters + count; `getComponentById(id)` — findUnique with prices
- **public.ts**: `toPublicComponent(c)` — drops internal fields
- **TODO**: price_asc/price_desc/popular sort (commented); no create/update/delete (admin-only)

### `modules/search/` ✅
- **schema.ts**: `searchQuerySchema` — q, category?, maxPrice?, topK (default 8)
- **service.ts**: `searchComponents(query)` — embed query → pgvector cosine search → diversify → attach offers. Fetches 3× topK, round-robin by category, fill by similarity
- **public.ts**: `SearchResultItem` (with similarity + offer), `SearchResult`
- **embed-refresh.ts**: `refreshEmbeddings()` — query stale items → build text → embedBatch → write vectors via `$executeRawUnsafe`

### `modules/visualize/` ✅
- **schema.ts**: `visualizeRequestSchema` — query, roomType?, maxPrice?, topK (default 6)
- **service.ts**: `visualize(req)` — embed → search → check GeneratedRender cache → generate or return cached → fire-and-forget cache write
- **public.ts**: `RetrievedItem`, `VisualizeResult`, `BuyOffer`

### `modules/themes/` ✅
- **schema.ts**: `listThemesQuerySchema` — page, limit, featured?
- **service.ts**: `listThemes(query)`, `getThemeBySlug(slug)` — with components included
- **public.ts**: `toPublicTheme(t)`

### `modules/setups/` ⚠️
- **service.ts**: `listPublicSetups(page, limit)` — findMany where isPublic=true. No schema file. All mutations are TODO.

## Shared Layer

### `shared/ai/openrouter.ts`
- `embedText(text)` → `number[]` (1024-dim). Uses `aiRateLimiter.acquire()` before each call.
- Model: `voyage-4` on Voyage AI (1024-dim, 200M free tokens/mo)
- Calls Voyage AI via standard REST (no SDK dependency)

### `shared/ai/image-gen.ts`
- `generateRoomImage(prompt, refs?)` → `string` (base64 data URL). Uses `aiRateLimiter.acquire()`.
- Model: `flux` on Pollinations.ai (completely free, no signup/key required)
- GET request to `https://image.pollinations.ai/prompt/{prompt}` — returns image binary, converted to base64

### `shared/ai/rate-limit.ts`
- `RateLimiter` class — token bucket. `aiRateLimiter` = 20 req/min (OpenRouter free tier)

### `shared/ai/embed-batch.ts`
- `embedBatch(items, onProgress?)` → `Map<id, vector>`. Sequential with retry (3 attempts, exponential backoff)

### `shared/api/response.ts`
- `jsonError(code, message, details?)` — standard error envelope
- `paginated(data, total, page, limit)` — list envelope
- `notImplemented(endpoint)` — 501 helper
- `ERROR_STATUS` map for HTTP codes

### `shared/auth/`
- `options.ts`: GoogleProvider + CredentialsProvider (bcryptjs, cost 12). JWT session with role in token/session callbacks. `authProvider` field on User model.
- `helpers.ts`: `getCurrentUser()`, `requireUser()` (throws AuthError), `requireAdmin()` (checks `user.role !== "admin"`). `SessionUser` type with `role?` field.

### `shared/audit-log/`
- `writeAuditLog(entry)` — currently just `console.info`, no persistence

## Scripts

### `scripts/scrapers/shopee.ts`
- `Scraper` interface: `search(query, limit)` → raw items, `normalize(raw)` → `NormalizedProduct`
- 5 rotating User-Agents, `fetchWithRetry()` (3 retries, backoff on 429/503/5xx)
- Vietnamese keywords for category/brand inference

### `scripts/scrapers/clean.ts`
- `cleanProduct(normalized)` — rule-based: name cleanup, brand normalization, category validation, color inference (Vietnamese + English), style tag inference

### `scripts/scrapers/dedup.ts`
- `findDuplicate(product)` → `string | null`. Embeds product text, queries pgvector for similarity > 0.90 within same category

### `scripts/scraper-run.ts`
- CLI: `npx tsx scripts/scraper-run.ts "query1,query2"`
- Flow: search → normalize → clean → dedup → upsert (with PriceHistory + embeddingStale)
- Writes ScraperHealth record per scraper

## Cron / Ingestion Flow

```
Vercel Cron (Monday 3am) → POST /api/v1/cron/ingest
  → getAllScrapers() × INGEST_QUERIES (18 queries)
  → search → normalize → clean → findDuplicate (vector dedup)
  → new: upsert Component + Price (embeddingStale=true)
  → duplicate: upsert Price on existing + mark stale
  → write ScraperHealth record per scraper

Vercel Cron (Monday 4am) → POST /api/v1/cron/embed
  → refreshEmbeddings()
  → query embeddingStale=true components
  → embedBatch (sequential, rate-limited)
  → write vectors via $executeRawUnsafe
```

## Frontend Status

- **Home page** (`/`): ✅ Hero section with gradient text, decorative blobs, 3 feature cards, 4 theme preview cards with color palettes
- **Planner page** (`/planner`): ✅ 3-panel layout — room config (RoomSelector + BudgetSlider + CategorySidebar), SVG visualizer (drag-and-drop, category-specific shapes, tooltips, grid toggle), item list (prices, shop badges, remove) + StyleScore. Component picker modal with search + category tabs. Zustand store with localStorage persistence.
- **Visualize page** (`/visualize`): ✅ Form → API → display items + generated image
- **Sign-in page** (`/signin`): ✅ Credentials form (email/password), error handling, Vietnamese text
- **Sign-up page** (`/signup`): ✅ Registration (name/email/password min 8 chars), calls `/api/v1/auth/signup`, auto-sign-in after register
- **Admin dashboard** (`/admin`): ✅ Stats cards (components, prices, stale embeddings), scraper run button with results display, health log table with status badges. Auth + role guard layout.
- **Navbar** (`components/shared/Navbar.tsx`): ✅ Sticky nav with logo, auth-aware links (Visualize, Planner, Admin for admins), sign in/sign up buttons or user menu with role badge and sign out
- **Providers** (`components/shared/Providers.tsx`): ✅ SessionProvider wrapper
- **globals.css**: shadcn-style CSS variables (light + dark)

## State Management

### `store/setup.ts` — Zustand store (persist middleware)
- **State**: roomType, roomWidth, roomDepth, name, theme, budget, items[]
- **Actions**: setRoomType, setRoomDimensions, setName, setTheme, setBudget, addItem, removeItem, updateItemPosition, reorderItems, reset, loadSetup
- **Persists to**: localStorage key `gobuildgo-setup`
- **Derived**: selectTotalPrice(state), selectBudgetProgress(state)
- **Types**: SetupItem { id, component: PublicComponent, position?, sortOrder }

## Key Design Patterns

1. **Thin handlers**: API routes validate → call module service → map with public DTO
2. **Module structure**: `schema.ts` (Zod) + `service.ts` (Prisma) + `public.ts` (DTOs) + `index.ts` (barrel)
3. **`@/*` alias** = project root (tsconfig paths)
4. **`embeddingStale` flag**: Scrapers set it, embed cron clears it. Idempotent.
5. **Vector dedup**: Before creating new component, check pgvector for similarity > 0.90 in same category
6. **PromptHash caching**: SHA-256 of query + roomType + sorted itemIds for render dedup
7. **ScraperHealth**: Every ingestion run writes per-scraper status/duration/counts
8. **Auth**: Google OAuth + credentials (bcryptjs cost 12) + JWT sessions. No Facebook — removed.
9. **Role-based access**: `UserRole` enum (user/admin), `requireAdmin()` guard in API routes and admin layout

## Environment Variables Required

```
DATABASE_URL          # Neon Postgres
VOYAGE_API_KEY       # Voyage AI (embeddings — voyage-4, 1024-dim, 200M free tokens/mo)
CRON_SECRET           # Vercel cron auth
NEXTAUTH_SECRET       # NextAuth encryption
GOOGLE_CLIENT_ID      # NextAuth Google OAuth
GOOGLE_CLIENT_SECRET  # NextAuth Google OAuth
```

## Migrations

| Migration | What it does |
|---|---|
| `20260620000000_add_embedding` | `CREATE EXTENSION vector` + `embedding vector(768)` + `embedding_stale boolean` on components + HNSW index |
| `20260622000842_resize_embedding_to_1536` | Resize `embedding` column to `vector(1536)`, drop/recreate HNSW index, mark all existing embeddings stale |
| `20260622000002_resize_embedding_to_1024` | Resize `embedding` column to `vector(1024)` for Voyage AI voyage-4, drop/recreate HNSW index |
| `20260621000000_add_scraper_health` | `scraper_health` table (scraperName, status, durationMs, upserted, skipped, errors, ranAt) + index |
| `20260621000001_add_generated_render` | `generated_renders` table (promptHash unique, imageUrl, itemIds[], roomType?) |

**Note:** `GEMINI_API_KEY` removed — embeddings via Voyage AI `voyage-4` (1024-dim), image gen via Pollinations.ai.

## P0 Requirements — Current Status

| Req | Requirement | Status |
|---|---|---|
| F1 | Auth (Credentials sign-in/sign-up) | ✅ Pages + API + NextAuth config done |
| F2 | Component catalog browse | ✅ API + data + picker modal |
| F3 | Interactive setup planner | ✅ Layout, store, picker, drag-and-drop, prices in items |
| F4 | 2D room visualizer | ✅ SVG canvas with drag-and-drop, category shapes, grid toggle, tooltips |
| F5 | Style score engine | 🔄 UI exists (animated scores + suggestions), backend logic pending |
| F6 | Price display per component | ✅ Prices shown in SelectedItems + tooltips |
| F7 | Affiliate link generation | ❌ Stub (501) |
| F8 | Save/load setups | ❌ Stub (501) — store has `loadSetup()` ready |
| F9 | Public setup gallery | ❌ Stub (501) |
| F10 | Theme gallery | ✅ API + data exist, no UI page |
| F11 | Vietnamese i18n | ❌ Not started (next-intl installed) |
| F12 | VND currency formatting | ✅ `formatCurrency()` utility |

## Next Steps (current sprint)

1. **F5** — Style engine backend (color harmony + theme consistency scoring — UI already shows animated scores)
2. **F8** — Wire up setup save/load API routes (store already has `loadSetup()`)
3. **F7** — Affiliate link generation + click tracking
4. **F9** — Community gallery page
5. **F11** — Vietnamese i18n
