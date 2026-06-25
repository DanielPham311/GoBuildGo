# gobuildgo Codebase Reference

> Last updated: 2026-06-25 (Firecrawl hybrid scraper: search-only for Shopee/Lazada/Tiki, search+scrape fallback for PhongVu/GearVN. Credit budget guard at 900/1000. Daily cron. ~14 credits/run.)

## Project Overview

Vietnam-focused desk setup planner + marketplace. Users plan desk setups by picking room type, theme, and components; prices from Vietnamese e-commerce (Shopee, Lazada, Tiki) with affiliate links. Stack: Next.js 14 (App Router) + TypeScript + Prisma/PostgreSQL (Neon) + pgvector + Voyage embeddings + Pollinations.ai image gen + TailwindCSS.

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18 |
| Language | TypeScript 5.5 |
| DB | PostgreSQL (Neon) + Prisma |
| Vector search | pgvector (1024-dim, HNSW index, cosine `<=>`) |
| AI embeddings | Voyage AI (voyage-4, 1024-dim, 200M free tokens/mo) |
| AI image gen | Pollinations.ai (FLUX, free, no key) |
| Auth | NextAuth 4 (Google OAuth + Credentials, bcryptjs, JWT sessions) |
| Styling | TailwindCSS 3.4 + shadcn/ui (planned, not yet added) |
| State | Zustand 4.5 (persist middleware) |
| Validation | Zod 3.23 at every API boundary |
| i18n | next-intl 3.17 (vi/en, cookie-based, no URL prefix) |
| Testing | Vitest 2.0 + Playwright 1.45 |
| Scheduling | Vercel Cron |

## Directory Structure (current)

```
gobuildgo/
├── app/
│   ├── api/v1/                       # All API routes (versioned)
│   │   ├── admin/                    # Admin endpoints (some stubbed)
│   │   ├── auth/[...nextauth]/       # NextAuth handler ✅
│   │   ├── components/               # GET list + detail ✅
│   │   ├── cron/                     # ingest + embed ✅
│   │   ├── health/                   # Liveness ✅
│   │   ├── prices/                   # affiliate redirect + compare ✅
│   │   ├── search/                   # RAG vector search ✅
│   │   ├── setups/                   # Full CRUD + clone + like + score ✅
│   │   ├── themes/                   # list + detail ✅
│   │   ├── upload/room/              # AI room analysis (stub)
│   │   ├── users/me/                 # profile/setups/favorites/email-settings ✅
│   │   └── visualize/                # RAG → image ✅
│   ├── admin/                        # Admin dashboard page ✅
│   ├── planner/                      # Interactive setup planner ✅
│   │   └── _components/              # 7 planner components
│   ├── community/                    # Public setup gallery ✅
│   ├── themes/                       # Theme gallery list + [slug] detail ✅ (PR #14)
│   ├── dashboard/                    # User dashboard ✅ (PR #14)
│   │   ├── profile/                  # Profile edit + avatar ✅
│   │   ├── favorites/                # Favorited components ✅
│   │   └── settings/                 # Email/notification settings ✅
│   ├── signin/                       # Sign-in page ✅ (credentials + Google)
│   ├── signup/                       # Registration page ✅ (credentials + Google)
│   ├── visualize/                    # Visualize page ✅
│   ├── welcome/                      # Welcome page for new users ✅
│   ├── layout.tsx                    # Root layout (Providers + Navbar)
│   ├── page.tsx                      # Home page ✅
│   └── globals.css                   # Tailwind + CSS variables
├── modules/
│   ├── components/                   # ✅ Real — list + getById
│   ├── search/                       # ✅ Real — RAG search + embed refresh
│   ├── setups/                       # ✅ Real — full CRUD + clone + like + score
│   ├── themes/                       # ✅ Real — list + getThemeBySlug
│   ├── style/                        # ✅ Real — 4-dimension style scoring
│   ├── affiliate/                    # ✅ Real — HMAC-signed URLs + click tracking
│   ├── visualize/                    # ✅ Real — RAG → image pipeline + cache
│   ├── prices/                       # ✅ Real (new) — comparison + affiliate signing
│   └── users/                        # ✅ Real (new) — profile + favorites + email settings
├── shared/
│   ├── ai/                           # ✅ Voyage embed + Pollinations image + rate limiter + batch
│   ├── api/                          # ✅ Response envelope + error helpers
│   ├── auth/                         # ✅ NextAuth config + helpers
│   ├── audit-log/                    # ✅ writeAuditLog (fire-and-forget)
│   └── db/                           # ✅ Prisma singleton
├── components/
│   ├── shared/
│   │   ├── Navbar.tsx                # ✅ Sticky nav: logo + locale switcher + auth-aware
│   │   └── Providers.tsx             # ✅ SessionProvider + NextIntlClientProvider
│   └── ui/                           # ❌ Empty (shadcn primitives not yet added)
├── store/
│   └── setup.ts                      # ✅ Zustand setup store (persist to localStorage)
├── lib/
│   ├── constants.ts                  # Categories, rooms, shops, pagination
│   └── utils.ts                      # cn, formatCurrency, slugify
├── scripts/
│   ├── scraper-run.ts                # ✅ CLI runner
│   └── scrapers/                     # ✅ Shopee + clean + dedup + types
├── prisma/
│   ├── schema.prisma                 # 15 models
│   ├── seed/                         # ✅ 34 components + 6 themes
│   └── migrations/                   # 1 squashed migration (20260622000000_init)
├── i18n/
│   ├── config.ts                     # locales (en, vi), defaultLocale (vi)
│   ├── en.json                       # English translations
│   ├── vi.json                       # Vietnamese translations
│   └── request.ts                    # next-intl getRequestConfig
├── docs/                             # Design docs (see CLAUDE.md for index)
├── middleware.ts                     # Cookie-based locale + API version redirect + auth hint
├── next.config.mjs                   # Security headers, image patterns, i18n plugin
├── vercel.json                       # Cron schedules
└── CODEBASE.md                       # This file
```

## Models (Prisma) — 16 total

| Model | Status | Notes |
|---|---|---|
| User | ✅ Active | role (user/admin), authProvider, passwordHash, bio, location |
| Component | ✅ Active | + embedding vector(1024), embeddingStale |
| Price | ✅ Active | @@unique([componentId, shop, condition]) |
| PriceHistory | ✅ Active | Tracks price changes on upsert |
| Setup | ✅ Active | Full CRUD implemented |
| SetupItem | ✅ Active | |
| SetupLike | ✅ Active | |
| Theme | ✅ Active | Seeded (6 themes) |
| ThemeComponent | ✅ Active | |
| GeneratedRender | ✅ Active | Render caching by promptHash |
| ScraperHealth | ✅ Active | Per-scraper run tracking |
| AffiliateClick | ✅ Active | Click tracking |
| UserFavorite | ✅ Active | Component favorites |
| EmailSubscription | ✅ Active | price_alert, weekly_digest, promotions |
| SetupView | ✅ Active | View tracking (ipHash, viewerId) |
| PromptLog | ✅ Active | Observability: user search/visualize prompts + results (type, prompt, userId, resultCount, itemIds, imageUrl) |

## API Endpoints

### ✅ Implemented (real handlers)

| Method | Path | Module | Auth | Description |
|---|---|---|---|---|
| GET | /api/v1/components | components | Public | List with filter/search/pagination |
| GET | /api/v1/components/[id] | components | Public | Detail + prices |
| GET | /api/v1/themes | themes | Public | List curated themes |
| GET | /api/v1/themes/[slug] | themes | Public | Detail + recommended components |
| GET | /api/v1/setups | setups | Public | List public setups (Zod-validated query) |
| POST | /api/v1/setups | setups | requireUser | Create setup (slug gen, price calc) |
| GET | /api/v1/setups/[id] | setups | Public | Setup detail + author + like status |
| PATCH | /api/v1/setups/[id] | setups | requireUser (owner) | Update setup |
| DELETE | /api/v1/setups/[id] | setups | requireUser (owner) | Delete setup |
| POST | /api/v1/setups/[id]/clone | setups | requireUser | Clone public setup |
| POST | /api/v1/setups/[id]/like | setups | requireUser | Toggle like |
| GET | /api/v1/setups/[id]/score | style | Public | 4-dimension style analysis |
| GET | /api/v1/prices/compare | prices | Public | Compare prices across shops (+ affiliate URLs) |
| GET | /api/v1/prices/affiliate | prices | Public | Verify HMAC → 302 redirect to shop |
| GET | /api/v1/search | search | Public | RAG vector search (diversified) |
| GET | /api/v1/users/me | users | requireUser | Current user profile |
| PATCH | /api/v1/users/me | users | requireUser | Update profile (name, image, bio, location) |
| POST | /api/v1/users/me/avatar | users | requireUser | Upload avatar image → sets image URL |
| GET | /api/v1/users/me/setups | users | requireUser | User's saved setups |
| GET | /api/v1/users/me/favorites | users | requireUser | Favorited components (paginated) |
| POST/PUT/DELETE | /api/v1/users/me/favorites/[componentId] | users | requireUser | Toggle/add/remove favorite |
| GET/PATCH | /api/v1/users/me/email-settings | users | requireUser | Notification preferences |
| GET | /api/v1/users/me/affiliate-history | affiliate | requireUser | User click history (paginated) |
| GET/POST | /api/v1/affiliate/click | affiliate | Public | Signed affiliate redirect |
| POST | /api/v1/visualize | visualize | Public | RAG → Pollinations room image |
| GET | /api/v1/admin/scraper/status | admin | Public | Component counts + scraper health |
| POST | /api/v1/admin/scraper/run | admin | requireAdmin | Trigger scrape run |
| GET | /api/v1/admin/scraper/status | admin | requireAdmin | Component counts + scraper health |
| GET | /api/v1/admin/stats | admin | requireAdmin | Platform metrics (users, setups, clicks…) |
| GET | /api/v1/admin/components | admin | requireAdmin | List components (incl. inactive), paginated |
| POST | /api/v1/admin/components | admin | requireAdmin | Create component |
| PATCH | /api/v1/admin/components/[id] | admin | requireAdmin | Update component metadata |
| DELETE | /api/v1/admin/components/[id] | admin | requireAdmin | Delete component (cascades) |
| GET | /api/v1/admin/reports/clicks | admin | requireAdmin | Most-clicked components + per-shop breakdown |
| GET | /api/v1/admin/prompts | admin | requireAdmin | Paginated user prompt log (filter by type) |
| GET | /api/v1/prices/history | prices | Public | Per-shop price history series (F13) |

### ⚠️ Stubs (501 notImplemented)

| Method | Path | Description |
|---|---|---|
| POST | /api/v1/upload/room | Upload room photo |
| GET | /api/v1/upload/room/[id]/result | AI analysis result |
| GET | /api/v1/upload/room/[id]/status | AI analysis status |
| GET | /api/v1/setups/[id]/export | Export setup (PDF/JSON) |

## Module Details

### `modules/admin/` ✅
- **service.ts**: `getDashboardStats()`, `listAdminComponents(query)` (incl. inactive + price count), `createComponent(input)`, `updateComponent(id, input)`, `deleteComponent(id)`, `getAffiliateReport(limit)` (groupBy click counts + per-shop), `listPromptLogs({page,limit,type})`. Editing name/brand/description restages embedding (`embeddingStale: true`).
- **public.ts**: `toAdminComponent(c)` (exposes `isActive`, `embeddingStale`, `priceCount`), `toAdminPromptLog(p)`
- **schema.ts**: `listAdminComponentsQuerySchema`, `createComponentSchema`, `updateComponentSchema`, `listPromptLogsQuerySchema`
- **Error**: `AdminError("NOT_FOUND" | "DUPLICATE_SLUG")` → 404 / 409 via `toErrorResponse`
- All routes gated by `requireAdmin()`.

### `modules/prices/` ✅ (new in PR #12)
- **service.ts**: `getComponentPrices(componentId)`, `getPrice(id)`, `recordAffiliateClick(args)`
- **public.ts**: `toPriceComparison(component)` → prices with `affiliateUrl` per shop
- **affiliate.ts**: `signAffiliate(priceId, componentId, shop)`, `verifyAffiliate(...)`, `affiliateUrl(...)` — HMAC-SHA256, message = `priceId:componentId:shop`
- **Error**: `PriceError("NOT_FOUND")`

### `modules/users/` ✅ (new in PR #12)
- **service.ts**: `getProfile(userId)`, `updateProfile(userId, input)`, `toggleFavorite(userId, componentId)`, `addFavorite(...)`, `removeFavorite(...)`, `getEmailSettings(userId)`, `updateEmailSettings(userId, input)`, `listFavorites(userId, page, limit)`
- **public.ts**: `toPublicProfile(u)`, `toFavoriteComponent(row)`
- **schema.ts**: `updateProfileSchema` (name?, image?), `updateEmailSettingsSchema` (priceAlerts?, weeklyDigest?, promotions?)
- **Error**: `UserError("NOT_FOUND")`

### `modules/setups/` ✅ (fully rewritten in PR #12)
- **service.ts**: `listPublicSetups(query)`, `listUserSetups(userId, page, limit, includePrivate)`, `getSetup(id, viewerId?)` (throws SetupError), `createSetup(userId, input)`, `updateSetup(id, userId, input)`, `deleteSetup(id, userId)`, `cloneSetup(id, userId, name?)`, `toggleLike(setupId, userId)`, `isLikedBy(setupId, userId?)`
- **public.ts**: `toPublicSetup(s)`, `toUserSetupSummary(s)`, `toSetupDetail(s, isLiked?)`
- **schema.ts**: `createSetupSchema`, `updateSetupSchema`, `listSetupsQuerySchema`, `cloneSetupSchema`
- **Error**: `SetupError("NOT_FOUND" | "FORBIDDEN" | "INVALID_COMPONENT" | "DUPLICATE_SLUG")`
- **Note**: `listUserSetups` returns raw Prisma entities (NOT mapped through `toPublicSetup`) — `toUserSetupSummary` needs `_count`, `isPublic`, timestamps

### `modules/style/` ✅
- **service.ts**: `scoreSetup(setupId)` — 4 dimensions (color harmony, theme consistency, space fit, budget balance)
- **color.ts**: HSL color wheel math, 50+ keyword→hue map, pairwise harmony analysis
- **themes.ts**: `scoreThemeConsistency(setupTheme, setupTags, setupColors)` — Jaccard similarity + palette match
- **schema.ts**: `scoreSetupSchema`
- **public.ts**: `toPublicStyleScore` passthrough

### `modules/affiliate/` ✅
- **service.ts**: `buildAffiliateUrl(url, itemId)`, `parseAffiliatePayload`, `recordClick`, `hashIp`, `getClickStats`
- **Note**: Two affiliate signing implementations coexist — `modules/affiliate/service.ts` (old, url+itemId) and `modules/prices/affiliate.ts` (new canonical, priceId+componentId+shop). New code should use `modules/prices/affiliate.ts`.

### Scraper Infrastructure ✅ (Firecrawl Hybrid)
- **`scripts/scrapers/firecrawl-api.ts`**: Firecrawl REST client — `firecrawlSearch()` + `firecrawlScrape()`. Tracks credits per call.
- **`scripts/scrapers/extract.ts`**: `extractProduct()` (full scrape) + `extractFromSearchResult()` (search-only from title+desc).
- **`scripts/scrapers/firecrawl.ts`**: Hybrid mode — search-only for Shopee/Lazada/Tiki (blocked), search+scrape fallback for PhongVu/GearVN.
- **`scripts/scrapers/queries.ts`**: 12 queries (1 per shop+category). ~14 credits/run. Daily schedule.
- **`scripts/scrapers/credits.ts`**: Credit tracking — search=1 credit, scrape=~5 credits.
- **`scripts/scrapers/index.ts`**: Registry — `firecrawlCrawler` (primary) + `shopeeScraper` (fallback).
- **`scripts/scrape.ts`**: Standalone runner. Logs creditsUsed to ScraperHealth.
- **`scripts/snapshot.ts`**: Daily price snapshot.
- **`app/api/v1/cron/scrape/route.ts`**: Budget guard — skips if >900 credits used this month.
- **Migration**: `20260625_add_credits_used` — adds `creditsUsed` to `scraper_health`.
- **Cron**: scrape (daily 3AM UTC), snapshot (daily 2AM UTC). Gated by `CRON_SECRET`.
- **Data flow**: search → extract from result → (if no price + gearvn/phongvu) scrape → clean → dedup → upsert → ScraperHealth

### `modules/search/` ✅
- **service.ts**: `searchComponents(query)` — embed → pgvector cosine → diversify by category → attach offers
- **public.ts**: `SearchResultItem` (with similarity + offer), `SearchResult`

### `modules/visualize/` ✅
- **service.ts**: `visualize(req)` — embed → search → check GeneratedRender cache → generate or return cached
- **public.ts**: `RetrievedItem`, `VisualizeResult`, `BuyOffer` (with `affiliateUrl`)

### `modules/components/` ✅
- **service.ts**: `listComponents(query)`, `getComponentById(id)`
- **public.ts**: `toPublicComponent(c)`

### `modules/themes/` ✅
- **service.ts**: `listThemes(query)`, `getThemeBySlug(slug)`
- **public.ts**: `toPublicTheme(t)`

## Shared Layer

### `shared/api/handle.ts` (new in PR #12)
- `toErrorResponse(err)` — maps domain errors → HTTP responses:
  - `AuthError` → uses `.code` directly
  - `SetupError` → NOT_FOUND→404, FORBIDDEN→403, INVALID_COMPONENT→400, DUPLICATE_SLUG→409
  - `UserError` → 404
  - `PriceError` → 404
  - `ZodError` → 400 with field-level details

### `shared/api/response.ts`
- `jsonError(code, message, details?)`, `paginated(data, total, page, limit)`, `notImplemented(endpoint)`, `ERROR_STATUS` map

### `shared/auth/options.ts`
- GoogleProvider + CredentialsProvider (bcryptjs cost 12). JWT session with role in token/session callbacks. Auto-create user on Google sign-in.

### `shared/auth/helpers.ts`
- `getCurrentUser()`, `requireUser()` (throws AuthError), `requireAdmin()`, `SessionUser` type with `role?`

### `shared/ai/`
- `openrouter.ts`: `embedText(text)` → `number[]` (1024-dim Voyage)
- `image-gen.ts`: `generateRoomImage(prompt, refs?)` → `string` (base64 data URL)
- `rate-limit.ts`: `RateLimiter` class, `aiRateLimiter` = 20 req/min
- `embed-batch.ts`: `embedBatch(items, onProgress?)` → `Map<id, vector>`

## Error Handling Pattern

All API routes use try/catch with `toErrorResponse(err)`:

```ts
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    // ... business logic
  } catch (err) {
    return toErrorResponse(err);
  }
}
```

## Key Type Notes

- **SetupDetail**: `Prisma.SetupGetPayload<{ include: detailInclude }>` where `detailInclude = { user, items: { component: { prices } }, _count: { likes } }`
- **createSetup return**: Uses `include: detailInclude` but TS may not infer `create` return matches `findUnique` return — use `as any` cast when passing to `toSetupDetail()`
- **listUserSetups**: Returns raw `SetupWithCounts` entities (NOT mapped through `toPublicSetup`) because `toUserSetupSummary` needs `_count`, `isPublic`, `createdAt`, `updatedAt`
- **Affiliate signing (canonical)**: `modules/prices/affiliate.ts` — message = `priceId:componentId:shop`, secret = `AFFILIATE_SECRET` env var

## Frontend Status

| Page | Route | Status |
|---|---|---|
| Home | `/` | ✅ Hero + feature cards + theme previews |
| Planner | `/planner` | ✅ 3-panel: room config / SVG visualizer / items + style score |
| Visualize | `/visualize` | ✅ Form → API → items + generated image |
| Community | `/community` | ✅ Gallery grid + filters + pagination |
| Components | `/components`, `/components/[id]` | ✅ Category grid + detail with price chart (F13) |
| Themes | `/themes`, `/themes/[slug]` | ✅ Theme gallery + detail (PR #14) |
| Dashboard | `/dashboard` (+ profile/favorites/settings) | ✅ User dashboard (PR #14) |
| Welcome | `/welcome` | ✅ Hero + 6 feature cards + 3-step guide |
| Sign-in | `/signin` | ✅ Credentials + Google, callbackUrl support |
| Sign-up | `/signup` | ✅ Credentials + Google, redirects to /welcome |
| Admin | `/admin` | ✅ Stats + scraper run + health log (tabbed nav) |
| Admin Items | `/admin/items` | ✅ All components, activate/deactivate, delete, search |
| Admin Reports | `/admin/reports` | ✅ Most-clicked items + per-shop breakdown |
| Admin Prompts | `/admin/prompts` | ✅ User search/visualize prompt log, filter by type |
| Navbar | shared | ✅ Sticky, auth-aware, locale switcher (cookie-based) |

## i18n

- Cookie-based (`NEXT_LOCALE`), no URL prefix
- Default: `vi`, supported: `en`, `vi`
- Middleware sets locale from `Accept-Language` header on first visit
- Navbar locale switcher writes cookie directly + `router.refresh()`
- Translation files: `i18n/en.json`, `i18n/vi.json`

## Middleware

- Cookie-based locale detection (no intlMiddleware — was removed, interfered with routing)
- API versioning redirect: `/api/*` → `/api/v1/*` (307)
- Auth gating done in route handlers via `requireUser()`, NOT in middleware
- Public paths that bypass any auth: `/`, `/signin`, `/signup`, `/api`, `/community`, `/welcome`

## Common Pitfalls

1. **Raw SQL columns**: Prisma camelCase vs DB snake_case. In `$queryRawUnsafe`, use quoted snake_case: `c."isActive"`, `p."componentId"`.
2. **Two affiliate modules**: `modules/affiliate/service.ts` (old) vs `modules/prices/affiliate.ts` (new canonical). Use prices module for new code.
3. **SetupDetail cast**: `createSetup` returns `SetupDetail` via `create` + `include`, but TS may not match `findUnique` type — use `as any` for `toSetupDetail()`.
4. **User setups raw entities**: `listUserSetups` does NOT map through `toPublicSetup` — intentional, `toUserSetupSummary` needs the extra fields.
5. **window.location.href for auth redirects**: `router.push()` doesn't trigger full page reload, so session cookies don't propagate to middleware. Use `window.location.href` after signin/signup.
6. **Vietnamese text**: Never use `text-transform: uppercase` (breaks diacritics).

## Environment Variables

```
DATABASE_URL          # Neon Postgres
VOYAGE_API_KEY       # Voyage AI (embeddings)
AFFILIATE_SECRET     # HMAC signing key (new in PR #12)
CRON_SECRET           # Vercel cron auth (scrape + snapshot)
FIRECRAWL_API_KEY     # Firecrawl (multi-shop product crawler)
NEXTAUTH_SECRET       # NextAuth encryption
GOOGLE_CLIENT_ID      # NextAuth Google OAuth
GOOGLE_CLIENT_SECRET  # NextAuth Google OAuth
```

## Migrations (2 total)

| Migration | What it does |
|---|---|
| `20260622000000_init` | Squashed baseline: 15 tables, `CREATE EXTENSION vector`, `embedding vector(1024)` + HNSW index, all enums and indexes |
| `20260623000000_add_prompt_log` | `PromptType` enum + `prompt_logs` table (user prompt observability) |

> The earlier incremental migrations (add_embedding, resize_*, add_scraper_health, etc.) were squashed into the `init` migration.

## Feature Implementation Status

| ID | Feature | Status |
|---|---|---|
| F1 | Auth (Google + email) | Partial — Google + credentials work, email verification missing |
| F2 | Component catalog browse | ✅ Real |
| F3 | Interactive planner | ✅ Real |
| F4 | 2D room visualizer | ✅ Real (SVG canvas) |
| F5 | Style score engine | ✅ Real (4 dimensions) |
| F6 | Price display | ✅ Real |
| F7 | Affiliate links | ✅ Real (HMAC-signed) |
| F8 | Save/load setups | ✅ Real (full CRUD) |
| F9 | Public setup gallery | ✅ Real |
| F10 | Theme gallery page | ✅ Real (PR #14 — `/themes` list + `/themes/[slug]`) |
| F11 | Vietnamese i18n | ✅ Real |
| F12 | VND formatting | ✅ Real |
| F13 | Price history charts | ✅ API (`/prices/history`) + `PriceHistoryChart` component (needs host page) |
| F14 | Price drop alerts | ❌ Missing |
| F15 | Community comments | ❌ Missing |
| F16 | User profiles + dashboard | ✅ Real (PR #14 — `/dashboard` + profile/favorites/settings) |
| F17 | AI room photo analysis | ❌ Missing |
| F18 | SEO blog | ❌ Missing |
| F19 | AdSense | ❌ Missing |
| F20 | AI build recommendations | ❌ Missing |
| F21 | 3D visualization | ❌ Missing |
| F22 | Mobile PWA | ❌ Missing |
| F23 | Admin panel | ✅ Real — stats + component CRUD APIs, all admin routes gated by requireAdmin |
| F24 | Affiliate reporting | ✅ Real — `/admin/reports` (most-clicked + per-shop) |
| F25 | Prompt observability | ✅ Real — `PromptLog` + `/admin/prompts` (search & visualize prompts logged fire-and-forget) |

## 🔴 Need-to-Do (Remaining Work)

### P1 — High Priority (next sprint)

| ID | Feature | What's needed | Difficulty |
|---|---|---|---|
| **F14** | Price drop alerts | Cron job: query PriceHistory for drops → match EmailSubscription (price_alert) → send email (Resend). | Medium |
| **F15** | Community comments | New `Comment` model (setupId, userId, body, parentId). API CRUD + nested UI on setup detail. | Medium |

### P2 — Medium Priority

| ID | Feature | What's needed | Difficulty |
|---|---|---|---|
| **F1** | Email verification | Add email verification flow (magic link or token). | Low |
| **F17** | AI room photo analysis | Upload photo → Claude Vision API → extract items → match components → suggest setup. | High |
| **F20** | AI build recommendations | User preferences → embed → pgvector similarity → ranked component list. | Medium |

### P3 — Lower Priority / Stretch

| ID | Feature | What's needed | Difficulty |
|---|---|---|---|
| **F18** | SEO blog | MDX content collection, `/blog/[slug]` pages, RSS feed, sitemap. | Medium |
| **F19** | AdSense | Add AdSense script, ad placements in sidebar/gallery. | Low |
| **F21** | 3D visualization | Three.js or React Three Fiber room renderer. | High |
| **F22** | Mobile PWA | next-pwa, manifest.json, service worker, offline cache. | Low |

### Quick Wins (< 1 day each)

| Task | Effort |
|---|---|
| AdSense script + placements | 1h |
| PWA manifest + next-pwa config | 2h |
| Email verification token flow | 4h |
| Consolidate two affiliate modules | 2h |
| Tests (Vitest + Playwright configured, no tests written) | Ongoing |
