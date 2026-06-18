# gobuildgo — System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Browser                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Landing  │  │ Planner  │  │ Catalog  │  │  Dashboard    │  │
│  │  (SSR)    │  │ (CSR+   │  │ (SSR)    │  │  (SSR+CSR)   │  │
│  │           │  │  SSR)    │  │          │  │               │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────┴─────────────────────────────────────┐
│                    Cloudflare CDN + DNS                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Static cache: images (R2), JS/CSS bundles, OG images    │  │
│  │  DDoS protection, SSL termination                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                    Vercel Edge Network                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Next.js 14+ App Router (Server Components + Client)     │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │  │
│  │  │ API Routes │  │ Server     │  │ Middleware         │ │  │
│  │  │ (REST)     │  │ Actions    │  │ (auth, i18n,      │ │  │
│  │  │            │  │ (mutations)│  │  rate limit)       │ │  │
│  │  └────────────┘  └────────────┘  └────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────┬──────────────┬──────────────┬──────────────────────────┘
        │              │              │
┌───────┴──────┐ ┌─────┴──────┐ ┌────┴──────────────────────────┐
│  Neon        │ │ Upstash    │ │  External APIs                 │
│  PostgreSQL  │ │ Redis      │ │  ┌─────────┐ ┌─────────────┐ │
│              │ │            │ │  │ Shopee  │ │ Lazada      │ │
│  - users     │ │ - sessions │ │  │ API     │ │ (Involve    │ │
│  - components│ │ - prices   │ │  │         │ │  Asia)      │ │
│  - prices    │ │ - cache    │ │  └─────────┘ └─────────────┘ │
│  - setups    │ │ - rate     │ │  ┌─────────┐ ┌─────────────┐ │
│  - themes    │ │   limits   │ │  │ Tiki    │ │ Claude      │ │
│  - clicks    │ │            │ │  │ API     │ │ Vision API  │ │
│              │ │            │ │  └─────────┘ └─────────────┘ │
└──────────────┘ └────────────┘ │  ┌─────────┐ ┌─────────────┐ │
                                │  │ Resend  │ │ Google/     │ │
┌──────────────────────────┐    │  │ Email   │ │ Facebook    │ │
│  AWS                     │    │  │ API     │ │ OAuth       │ │
│  ┌────────┐ ┌──────────┐ │    │  └─────────┘ └─────────────┘ │
│  │ S3     │ │Lambda    │ │    └──────────────────────────────┘
│  │ (user  │ │(image    │ │
│  │ uploads│ │ process) │ │
│  │ )      │ │          │ │
│  └────────┘ └──────────┘ │
│  ┌──────────────────────┐ │
│  │ CloudFront CDN       │ │
│  │ (user upload delivery)│ │
│  └──────────────────────┘ │
└───────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Background Workers (GitHub Actions cron)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Every 6h:  Price scraper (Shopee → Lazada → Tiki)      │  │
│  │  Daily:     Affiliate link refresh, image optimization   │  │
│  │  Weekly:    Price history aggregation, stale data cleanup │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Service Decomposition

### Component Catalog Service
- **Responsibility**: Browse, search, filter components across 9 categories
- **Tables**: `components`, `prices`, `price_history`
- **APIs**: GET /api/v1/components, GET /api/v1/components/[id], GET /api/v1/components/search
- **Cache**: Redis (1 hour TTL for listings, 6 hours for prices)
- **Communication**: Direct DB reads, no inter-service calls

### Price Aggregation Service
- **Responsibility**: Scrape, normalize, cache prices from Shopee/Lazada/Tiki
- **Tables**: `prices`, `price_history`
- **APIs**: GET /api/v1/prices/compare, POST /api/v1/prices/refresh (admin)
- **Cache**: Redis (6 hours TTL)
- **Communication**: External API calls (Shopee/Lazada/Tiki), writes to DB, invalidates cache

### Setup Management Service
- **Responsibility**: CRUD setups, sharing, cloning, image export
- **Tables**: `setups`, `setup_items`, `setup_likes`, `setup_views`
- **APIs**: Full /api/v1/setups CRUD
- **Cache**: Redis (5 minutes TTL, user edits frequently)
- **Communication**: Calls Style Engine for scoring, calls Affiliate Link service for buy links

### Style Engine Service
- **Responsibility**: Color harmony, theme consistency, space fitting, budget balance scoring
- **Tables**: Read-only from `components`, `themes`
- **APIs**: Internal only (called by Setup Management)
- **Cache**: In-memory (theme rules rarely change)
- **Communication**: Pure computation, no external calls

### User/Auth Service
- **Responsibility**: Authentication, sessions, profiles, favorites
- **Tables**: `users`, `user_favorites`, `email_subscriptions`
- **APIs**: /api/v1/auth/*, /api/v1/users/me/*
- **Cache**: Redis (sessions, 30 days)
- **Communication**: Google/Facebook OAuth, Resend for emails

### Affiliate Link Service
- **Responsibility**: Generate trackable affiliate links, track clicks
- **Tables**: `affiliate_clicks`
- **APIs**: POST /api/v1/affiliate/click
- **Cache**: In-memory (link templates)
- **Communication**: Async click tracking (fire-and-forget)

### Notification Service
- **Responsibility**: Price alerts, weekly digests, promotional emails
- **Tables**: `email_subscriptions`
- **APIs**: /api/v1/users/me/email-settings
- **Communication**: Resend API, triggered by price scraper

### AI Analysis Service
- **Responsibility**: Room photo analysis, setup suggestions
- **Tables**: None (stateless)
- **APIs**: POST /api/v1/upload/room, GET /api/v1/upload/room/[id]/status
- **Communication**: S3 upload → Lambda trigger → Claude Vision API → store result in DB

## Integration Patterns

### External API Integration
```
Next.js API Route
  → Check Redis cache
  → Cache miss: call external API (Shopee/Lazada/Tiki)
  → Normalize response
  → Store in Redis (TTL 6h)
  → Return to client
```

### Event-Driven Pipeline (AI Analysis)
```
User uploads photo → POST /api/v1/upload/room
  → Upload to S3
  → S3 event triggers Lambda
  → Lambda calls Claude Vision API
  → Lambda stores result in PostgreSQL
  → Client polls GET /api/v1/upload/room/[id]/status
  → Status: completed → return suggestions
```

### Async Work Queue
```
Price scraper (GitHub Actions)
  → For each component:
    → Call external API
    → Normalize
    → Upsert price in DB
    → Log to price_history
    → Invalidate Redis cache key
  → Send summary to admin email
```

## Caching Strategy

### Multi-Level Cache

| Level | Storage | Use Case | TTL |
|---|---|---|---|
| L1 | In-memory Map | Theme rules, style config, constants | 1 hour |
| L2 | Redis (Upstash) | Prices, component listings, sessions | 6h / 1h / 30d |
| L3 | CDN (Cloudflare) | Static assets, product images | 24 hours |

### Cache Key Patterns
```
component:{id}                          — single component with prices
components:cat:{cat}:p:{p}:l:{l}       — paginated listing
prices:component:{id}                   — price comparison data
setup:{id}                              — saved setup with items
themes:all                              — theme list
theme:{slug}                            — single theme with items
session:{token}                         — user session
rate:{ip}:{endpoint}                    — rate limit counter
search:{hash}                           — search results
```

### Invalidation
- **Event-based**: Scraper updates price → delete `prices:component:{id}` → next request repopulates
- **TTL-based**: Safety net, everything expires eventually
- **Stale-while-revalidate**: Serve stale Redis data immediately, fetch fresh in background
- **Cache warming**: After scraper run, pre-populate top 50 popular components

## Authentication Flow

```
User clicks "Sign In"
  → NextAuth.js redirects to Google/Facebook OAuth
  → OAuth callback → NextAuth.js creates JWT session
  → JWT stored in httpOnly cookie
  → Middleware validates JWT on protected routes
  → Server components read session via getServerSession()
  → API routes read session via getServerSession()
```

Session strategy: JWT (stateless, works with serverless). Session lifetime: 30 days.

## Error Handling

### Error Class Hierarchy
```
AppError (base)
  ├── ValidationError (400)
  ├── NotFoundError (404)
  ├── UnauthorizedError (401)
  ├── ForbiddenError (403)
  ├── RateLimitError (429)
  ├── ExternalApiError (502)
  └── InternalError (500)
```

### API Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "path": ["items", 0, "componentId"], "message": "Required" }
    ]
  }
}
```

### Graceful Degradation
- Price fetch fails → show last known price with "last updated" timestamp
- Image fails → show placeholder with component initial
- Scraper fails → serve cached data, show banner "Prices may be outdated"
- AI analysis fails → show manual suggestion form

## Observability

### Structured Logging
```json
{
  "timestamp": "2026-06-18T10:30:00Z",
  "level": "info",
  "message": "Price scraper completed",
  "requestId": "req_abc123",
  "userId": "user_xyz",
  "path": "/api/v1/prices/refresh",
  "duration": 45000,
  "metadata": { "componentsUpdated": 287 }
}
```

### Health Check
`GET /api/v1/health` → `{ "status": "ok", "db": "connected", "redis": "connected", "uptime": 3600 }`

### Metrics (PostHog)
- Setups created per day
- Affiliate click-through rate
- API response times (p50, p95, p99)
- Scraper success rate
- Error rate by endpoint
- Style score distribution

## Security

### Rate Limiting (Redis sliding window)
| Tier | Limit | Window |
|---|---|---|
| Public | 100 req | 1 minute |
| Authenticated | 1000 req | 1 minute |
| Admin | 2000 req | 1 minute |
| AI analysis | 5 req | 1 minute |
| Image export | 10 req | 1 minute |

### Security Headers (next.config.js)
- Content-Security-Policy
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security: max-age=31536000
- Referrer-Policy: strict-origin-when-cross-origin

### Input Validation
- Zod schemas at every API boundary
- File uploads: type whitelist (JPEG/PNG/WebP), size max 5MB, dimensions max 4000px
- SQL: Prisma parameterized queries (automatic)
- XSS: React auto-escapes, sanitize user text

## Cost Optimization

| Strategy | Savings |
|---|---|
| Serverless scaling to zero | Pay nothing when no users |
| Aggressive Redis caching | 80% cache hit rate = 80% fewer DB queries |
| R2 for product images | Zero egress fees vs S3 |
| S3 only for user uploads | Minimal usage = ~$3-5/mo |
| Image optimization (WebP/AVIF) | 60-80% smaller images = less bandwidth |
| Code splitting per route | Users only download what they need |
| Stale-while-revalidate | Fast UX without fresh data every request |

**Target: Under $15/mo at launch, under $50/mo at 100k pageviews/month**
