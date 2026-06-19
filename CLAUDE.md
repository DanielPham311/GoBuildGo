# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current State: Scaffolded

The project is scaffolded and builds (`npm run build`). A runnable Next.js 14 app exists with the full Prisma schema, the `/api/v1` route surface, and the core module/shared layers wired.

**Architecture (as built) — this supersedes `docs/PROJECT_STRUCTURE.md`'s `src/` layout.** The repo follows the rule in `.cursor/rules/architecture.mdc`: a root-level modular layout, NOT `src/`.

| Dir | Role |
|---|---|
| `app/` | App Router: pages, layouts, and `app/api/v1/**` HTTP handlers only. Handlers stay **thin** — validate → call a module service → map with a `public.ts` DTO. |
| `modules/<feature>/` | Domain logic: `schema.ts` (Zod), `service.ts` (Prisma queries), `public.ts` (API-safe DTO mappers), `index.ts` barrel. `components` and `themes` are fully wired exemplars; `setups` is a skeleton. |
| `shared/` | Cross-cutting infra: `db` (Prisma singleton), `auth` (NextAuth + helpers), `api` (response/error envelope), `audit-log`. |
| `components/{ui,shared}/` | shadcn-style primitives + app chrome (not yet populated). |
| `lib/` | Generic utils (`cn`, `formatCurrency`, `slugify`) + `constants.ts`. |
| `prisma/` | `schema.prisma` (canonical, all 14 models) + `seed/` stubs. |

Imports use the **`@/*` alias = project root** (e.g. `@/modules/components`, `@/shared/db`). Data layer is **Prisma + PostgreSQL** — the `.cursor/rules/architecture.mdc` rule keeps Prisma even though its source template mentioned Mongoose.

The `docs/` are still the source of truth for *domain* detail (schemas, endpoint contracts, algorithms) — but for *layout and import boundaries*, the cursor rule wins. Most API handlers are `notImplemented` (501) stubs awaiting their module service.

## Document Map

| Doc | Read it when you need… |
|---|---|
| `DESIGN.md` | Top-level overview; links to everything else |
| `PLAN.md` | Business plan, tech-stack rationale, phased roadmap, intended folder tree |
| `docs/requirements-document.md` | Functional requirements with IDs (F1–F19), priorities, NFRs, acceptance criteria |
| `docs/SYSTEM_ARCHITECTURE.md` | Service decomposition, integration patterns, caching, observability |
| `docs/database-design.md` | Full ERD, all 14 tables, enums, indexing, the canonical `schema.prisma` reference |
| `docs/API_DESIGN.md` | 40+ REST endpoints, request/response shapes, Zod schemas, error format |
| `docs/PROJECT_STRUCTURE.md` | Complete intended folder tree and module boundaries |
| `docs/UI_UX_DESIGN.md` | Design system, wireframes, interaction specs |
| `docs/ENGINEERING_PATTERNS.md` | Implementation patterns: style engine, scrapers, caching, auth, security, testing (largest, most prescriptive doc) |

## Intended Stack

Next.js 14+ (App Router) + TypeScript, TailwindCSS + shadcn/ui, Zustand (planner state), Framer Motion. Backend is Next.js API Routes + Server Actions (no separate server). Prisma → PostgreSQL (Neon). Redis (Upstash) for cache. NextAuth.js (Google/Facebook/credentials). Product images on Cloudflare R2; user uploads on AWS S3 + CloudFront → Lambda → Claude Vision. All UI and content support Vietnamese + English (next-intl); prices are VND.

## Conventions That Cross Many Files

These are decided in the docs — honor them, don't reinvent:

- **API versioning**: every endpoint lives under `/api/v1/`. Unversioned `/api/...` redirects (307) to current version via `middleware.ts`. Route files are `app/api/v1/.../route.ts`.
- **Validation**: Zod at every API boundary; infer TypeScript types from the Zod schemas (single source of truth). Schemas are catalogued in `API_DESIGN.md` §12.
- **Error responses**: always `{ "error": { "code", "message", "details?[] } }`. Use the custom error class hierarchy in `ENGINEERING_PATTERNS.md` §5. List endpoints use the paginated envelope (API_DESIGN §11); single-resource endpoints return the resource directly.
- **Color math**: HSL, not RGB (style engine, `ENGINEERING_PATTERNS.md` §2).
- **Scrapers**: Strategy pattern over a shared interface; one file per shop under `scripts/scrapers/`. Token-bucket rate limiting, retry with backoff, graceful stale-data degradation.
- **Themes & scoring are config-driven**: new themes = JSON config entries (zero code); the style-engine scoring is a plugin architecture — extend, don't modify core.
- **Affiliate links**: HMAC-signed to prevent tampering (`ENGINEERING_PATTERNS.md` §4, §8.6).
- **Caching**: multi-level L1/L2/L3 with the key patterns and invalidation rules in `ENGINEERING_PATTERNS.md` §3.

## Commands

Defined in `package.json`:

- `npm run dev` / `npm run build` / `npm start` — Next.js dev / production build / serve.
- `npm run lint` / `npm run typecheck` — ESLint (next config) / `tsc --noEmit`.
- `npm test` / `npm run test:watch` — Vitest (unit/integration). `npm run test:e2e` — Playwright.
- DB: `npm run db:migrate` (dev), `npm run db:deploy` (CI/prod), `npm run db:seed`, `npm run db:reset`. Requires `DATABASE_URL`; copy `.env.example` → `.env.local`.
- `prisma generate` runs automatically on `postinstall`.

Note: `next.config.mjs` (not `.ts` as the spec names it — TS config needs Next 15; project is on Next 14).

## Notes

- Vietnamese text: never use `text-transform: uppercase` (breaks diacritics); use the Vietnamese-safe font stack (Inter, Noto Sans).
- The two top-level `README.md`/`PLAN.md` and `DESIGN.md` overlap heavily — `DESIGN.md` is the curated entry point.

---

# Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
