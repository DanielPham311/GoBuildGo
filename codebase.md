# gobuildgo Codebase Reference

> Last updated: 2026-06-21

## Project Overview

Vietnam-focused desk setup planner + marketplace. Users plan desk setups by picking room type, theme, and components; prices are scraped from Vietnamese e-commerce (Shopee, eventually Lazada/Tiki). Stack: Next.js 14 (App Router) + TypeScript + Prisma/PostgreSQL (Neon) + pgvector + Gemini AI + TailwindCSS.

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18 |
| Language | TypeScript 5.5 |
| DB | PostgreSQL (Neon) + Prisma 5.18 |
| Vector search | pgvector (768-dim, HNSW index) |
| AI | Gemini text-embedding-004 + Gemini 2.5 Flash Image |
| Auth | NextAuth 4 (Google + Facebook, JWT sessions) |
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
│   │   ├── admin/                # Admin endpoints (mostly stubs)
│   │   ├── auth/[...nextauth]/   # NextAuth handler
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
│   ├── visualize/                # Visualize page (client + server) ✅
│   ├── error.tsx                 # Client error boundary
│   ├── global-error.tsx          # Root error boundary
│   ├── globals.css               # Tailwind + shadcn CSS variables
│   ├── layout.tsx                # Root layout (vi lang, metadata)
│   ├── loading.tsx               # Root loading spinner
│   └── page.tsx                  # Home page (placeholder)
├── modules/                      # Domain logic
│   ├── components/               # ✅ Real — list + getById
│   ├── search/                   # ✅ Real — RAG search + embed refresh
│   ├── setups/                   # ⚠️ Partial — listPublic only
│   ├── themes/                   # ✅ Real — list + getThemeBySlug
│   └── visualize/                # ✅ Real — full RAG → image pipeline
├── shared/                       # Cross-cutting infra
│   ├── ai/                       # ✅ Gemini client + rate limiter + batch embed
│   ├── api/                      # ✅ Response envelope + error helpers
│   ├── auth/                     # ✅ NextAuth config + helpers
│   ├── audit-log/                # ⚠️ Stub — console.log only
│   └── db/                       # ✅ Prisma singleton
├── scripts/
│   ├── scraper-run.ts            # ✅ CLI runner (dedup + history + health)
│   └── scrapers/                 # ✅ Shopee + clean + dedup + types
├── prisma/
│   ├── schema.prisma             # 15 models (including GeneratedRender, ScraperHealth)
│   ├── seed/                     # ✅ 34 components + 6 themes
│   └── migrations/               # 2 migrations (embedding + scraper_health)
├── lib/
│   ├── constants.ts              # Categories, rooms, shops, pagination
│   └── utils.ts                  # cn, formatCurrency, slugify
├── components/                   # ❌ Empty (no UI primitives built yet)
├── docs/                         # Design docs (see CLAUDE.md for index)
├── .cursor/rules/architecture.mdc # Module layout rules
├── middleware.ts                 # Redirects unversioned /api/ → /api/v1/
├── next.config.mjs               # Security headers, image patterns
├── vercel.json                   # Cron schedules
├── playwright.config.ts          # E2E config (Chromium)
└── package.json                  # Scripts + deps
```

## Models (Prisma)

| Model | Status | Notes |
|---|---|---|
| User | ✅ Schema only | NextAuth |
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
| POST | /api/v1/admin/scraper/run | admin | Trigger scrape run |
| GET | /api/v1/admin/scraper/status | admin | Component counts + scraper health |
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

### `shared/ai/gemini.ts`
- `embedText(text)` → `number[]` (768-dim). Uses `geminiRateLimiter.acquire()` before each call.
- `generateRoomImage(prompt, refs?)` → `string` (data URL). Same rate limiting.
- Models: `text-embedding-004` (embed), `gemini-2.5-flash-image` (image gen)
- Calls Gemini REST directly (no SDK dependency)

### `shared/ai/rate-limit.ts`
- `RateLimiter` class — token bucket. `geminiRateLimiter` = 50 req/min

### `shared/ai/embed-batch.ts`
- `embedBatch(items, onProgress?)` → `Map<id, vector>`. Sequential with retry (3 attempts, exponential backoff)

### `shared/api/response.ts`
- `jsonError(code, message, details?)` — standard error envelope
- `paginated(data, total, page, limit)` — list envelope
- `notImplemented(endpoint)` — 501 helper
- `ERROR_STATUS` map for HTTP codes

### `shared/auth/`
- `options.ts`: Google + Facebook providers, JWT session, empty client IDs from env
- `helpers.ts`: `getCurrentUser()`, `requireUser()` (throws AuthError), `requireAdmin()` (TODO role check)

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

- **Home page** (`/`): Placeholder with tagline, no functionality
- **Visualize page** (`/visualize`): Fully working client component — form → API → display items + generated image
- **No other pages built** — no planner UI, no setup CRUD, no auth pages
- **No UI component library** — `components/` directory is empty
- **globals.css**: shadcn-style CSS variables (light + dark), but no Tailwind config file present (uses default)

## Key Design Patterns

1. **Thin handlers**: API routes validate → call module service → map with public DTO
2. **Module structure**: `schema.ts` (Zod) + `service.ts` (Prisma) + `public.ts` (DTOs) + `index.ts` (barrel)
3. **`@/*` alias** = project root (tsconfig paths)
4. **`embeddingStale` flag**: Scrapers set it, embed cron clears it. Idempotent.
5. **Vector dedup**: Before creating new component, check pgvector for similarity > 0.90 in same category
6. **PromptHash caching**: SHA-256 of query + roomType + sorted itemIds for render dedup
7. **ScraperHealth**: Every ingestion run writes per-scraper status/duration/counts

## Environment Variables Required

```
DATABASE_URL          # Neon Postgres
GEMINI_API_KEY        # Gemini embeddings + image gen
CRON_SECRET           # Vercel cron auth
GOOGLE_CLIENT_ID      # NextAuth
GOOGLE_CLIENT_SECRET  # NextAuth
FACEBOOK_CLIENT_ID     # NextAuth
FACEBOOK_CLIENT_SECRET # NextAuth
NEXTAUTH_SECRET       # NextAuth encryption
```

## Migrations

| Migration | What it does |
|---|---|
| `20260620000000_add_embedding` | `CREATE EXTENSION vector` + `embedding vector(768)` + `embedding_stale boolean` on components + HNSW index |
| `20260621000000_add_scraper_health` | `scraper_health` table (scraperName, status, durationMs, upserted, skipped, errors, ranAt) + index |

## What's Next (per MVP roadmap)

### Week 2: Planner UI
- Room type selector (bedroom, gaming room, WFH office, studio)
- Component slots with drag/add interaction
- Budget slider with total
- Component picker (search/filter by category, brand, price)

### Week 3: Style Engine + Space Calculator
- Color harmony scoring (HSL-based, not RGB)
- Theme consistency validation
- Room dimension input + space fitting validation

### Week 4: Price Display + Affiliate Links
- Price comparison across shops
- Affiliate link signing (HMAC)
- Click tracking

### Week 5: 2D Visualizer + Setup Sharing
- Top-down 2D room render
- Export as image (html2canvas)
- Save/share setups

### Week 6: Polish + i18n + Deploy
- Vietnamese translations
- Lighthouse optimization
- Vercel deploy
