# RAG + Generative Visualization — Design

> **Status:** Proposed. Extends `DESIGN.md`. This feature set **supersedes** the rule-based style engine + 2D canvas visualizer described in `ENGINEERING_PATTERNS.md` for the visualization path. The scraper/data layer reuses the existing `Component`/`Price`/`PriceHistory` schema.

## 1. Goal

A pipeline that:

1. **Ingests** e-commerce items weekly into our DB (free data sources only).
2. Lets users **search by natural-language query** ("cozy warm-light gaming desk under 5tr") via **RAG** over our item catalog.
3. **Generates a room visualization** placing the retrieved items into the user's room using **Gemini image generation**, to drive affiliate clicks.

**Constraint: low budget → everything on free tiers.** Single vendor (Gemini) for embeddings + image gen. One database (Postgres + pgvector) — no separate vector store.

## 2. Stack decisions (locked)

| Concern | Choice | Why |
|---|---|---|
| Item data | **Free affiliate APIs first, lightweight scrape fallback** | Zero cost; APIs are legal + stable, scrape fills gaps |
| Embeddings | **Gemini `text-embedding-004`** (free tier) | One vendor; strong Vietnamese support; free |
| Vector store | **pgvector on Neon Postgres** | Already have the DB; free; no extra infra |
| Image gen | **Gemini 2.5 Flash Image ("Nano Banana")** | Edits/composites real product photos into a room; free tier |
| Image storage | **Cloudflare R2** (generated) / existing R2 for product images | Zero egress |
| Scheduling | **Vercel Cron → `/api/v1/cron/*`** | Free on hobby (limited), no extra worker |

> ⚠️ **Free-tier reality check.** Gemini free tier has per-minute + per-day request caps. Weekly batch embedding of a large catalog must be **rate-limited and chunked** (queue + sleep), not fired all at once. Image gen is the scarcest quota — generate **on explicit user request only**, cache aggressively, never pre-generate.

## 3. Data ingestion (Pillar 1)

Reuses existing schema (`Component`, `Price`, `PriceHistory`, `Shop`). No schema change except adding the embedding column (§4).

**Sources, in priority order (all free):**
1. **Affiliate program feeds/APIs** — Involve Asia (Lazada), Tiki affiliate, Shopee affiliate. Product feeds are the legal, stable path. *Requires program signup.*
2. **Scrape fallback** for shops/categories not covered — Strategy pattern per shop under `scripts/scrapers/` (already prescribed in docs). Token-bucket rate limit, retry w/ backoff, serve stale on failure.

**Weekly job** (`/api/v1/cron/ingest`, Vercel Cron, `0 3 * * 1`):
```
for each source:
  fetch items (paged, rate-limited)
  upsert Component   (match on shop SKU / canonical URL → slug)
  upsert Price       (write PriceHistory row when price changed)
  mark embeddingStale = true on new/changed items
→ enqueue embedding refresh (§4)
```
Dedup key: prefer source SKU; fall back to normalized `(brand, name)`.

## 4. RAG retrieval (Pillar 2)

**Schema change** (`prisma/schema.prisma`, `Component`):
```prisma
// requires: CREATE EXTENSION vector;  (Neon supports pgvector)
embedding       Unsupported("vector(768)")?   // text-embedding-004 = 768 dims
embeddingStale  Boolean  @default(true)
```
Index: `CREATE INDEX ON components USING hnsw (embedding vector_cosine_ops);` (raw SQL migration — Prisma doesn't model vector indexes).

**Embedding text** per component (concatenate, then embed):
```
{name}. {brand}. category={category}. {description}.
colors: {colors}. style: {styleTags}. specs: {key specs}.
```

**Embedding refresh** (`/api/v1/cron/embed` or chained after ingest):
- Query `where embeddingStale = true`, batch in small chunks, call Gemini embeddings with rate limiting, write `embedding`, set `embeddingStale = false`.

**Query flow** (`POST /api/v1/search/visualize` or `modules/search`):
```
1. embed(userQuery)                      → query vector
2. SQL: ORDER BY embedding <=> $queryVec  → top-K
   + WHERE filters (category, price range, room compatibility, isActive)
3. optional: re-rank / diversify across categories (one desk, one chair, ...)
4. return item set (DTO via public.ts)
```
Filtering happens **in SQL alongside** the vector search (pgvector + WHERE), so budget/category constraints are hard, not approximate.

New module: `modules/search/` (`schema.ts`, `service.ts`, `public.ts`, `index.ts`).

## 5. Generative visualization (Pillar 3)

New module: `modules/visualize/`.

**Input:** retrieved item set (§4) + optional user room photo + room type/dimensions.
**Process:**
```
1. build prompt: "Place these items in a {roomType}: {item names + descriptions}.
   Style: {styleTags}. Lighting: {...}." 
2. attach product images (R2 URLs) + room photo as image inputs to Gemini 2.5 Flash Image
3. Gemini composites items into the room → generated image
4. upload to R2 → store URL on Setup.coverImageUrl (or a new GeneratedRender row)
5. return image + the item list with affiliate (HMAC-signed) buy links
```

**Quota discipline (critical for free tier):**
- Generate **only on explicit user action** ("Visualize my room"), never automatically.
- **Cache** by hash of (item set + room photo + style) → reuse identical renders.
- Rate-limit per user/IP; show a friendly "try again shortly" on quota exhaustion.
- Persist every render so it's never regenerated.

**Optional new model** (defer until needed):
```prisma
model GeneratedRender {
  id        String   @id @default(cuid())
  setupId   String?
  promptHash String  @unique
  imageUrl  String
  itemIds   String[]
  createdAt DateTime @default(now())
}
```

## 6. Phased build plan

| Phase | Deliverable | Verify |
|---|---|---|
| 0 | Enable pgvector on Neon; add `embedding`/`embeddingStale` cols + HNSW index migration | `\d components` shows vector col + index |
| 1 | `modules/search`: embed query + pgvector top-K over **seeded** items (no scraper yet) | Query returns sensible items; unit test on a fixed seed |
| 2 | Embedding refresh job over seeded catalog (rate-limited) | All seeded items get embeddings; re-run is idempotent |
| 3 | `modules/visualize`: item set → Gemini image → R2 → return URL + buy links | One query produces one cached room image |
| 4 | Ingestion: one affiliate source end-to-end → upsert + mark stale → re-embed | Weekly cron populates new items, they become searchable |
| 5 | Add scrape fallback for one shop; quota/rate-limit hardening; UI wiring | End-to-end on real data within free-tier limits |

**Recommendation:** build Phases 0→3 against **seed data first** (decouples the hard/risky scraper-and-affiliate-approval work from the RAG+image core). Prove the magic moment — query in, room image out — then wire real ingestion.

## 7. Open questions / risks

- **Affiliate program approval** gates legal data access; apply early. Until approved, develop on seed data.
- **Gemini free-tier caps** may be too tight for production image volume → plan a paid-tier switch path; keep the image provider behind an interface.
- **Vietnamese query quality** — validate embedding retrieval with native-language queries.
- **Image realism** — compositing real product photos vs. generating lookalikes affects buy-intent; test both with Nano Banana.
- **Env vars needed:** `GEMINI_API_KEY`, R2 credentials, affiliate API keys.
