# gobuildgo — Master Design Document

> Vietnam-focused interactive desk setup planner. Plan your dream workspace, visualize it, and buy everything via affiliate links.

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Requirements](docs/requirements-document.md)
3. [System Architecture](docs/SYSTEM_ARCHITECTURE.md)
4. [Database Design](docs/database-design.md)
5. [API Design](docs/API_DESIGN.md) — includes versioning strategy (URL path: `/api/v1/`)
6. [Project Structure](docs/PROJECT_STRUCTURE.md)
7. [UI/UX Design](docs/UI_UX_DESIGN.md)
8. [Engineering Patterns](docs/ENGINEERING_PATTERNS.md)
9. [Infrastructure & Cost](#9-infrastructure--cost)
10. [Development Phases](#10-development-phases)
11. [Risks & Mitigations](#11-risks--mitigations)

---

## 1. Project Overview

### What is gobuildgo?
Vietnam-focused interactive desk setup planner. Users pick a room type, choose a theme, add components (desk, chair, monitor, peripherals, lighting, decor), see a 2D/3D visualization, get a style score, and buy everything via Shopee/Lazada/Tiki affiliate links.

### Why This Exists
- 5M+ people in Vietnam have desks (WFH, gamers, students, creators)
- No localized tool exists for Vietnamese market (VND pricing, Vietnamese language, local e-commerce)
- Cheaper items = higher affiliate conversion than PC parts
- Visual content = viral on social media

### Tech Stack Summary

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router), TypeScript |
| UI | TailwindCSS, shadcn/ui, Framer Motion |
| 3D | React Three Fiber (Phase 2) |
| State | Zustand |
| Auth | NextAuth.js (Google + Facebook) |
| ORM | Prisma |
| Database | PostgreSQL (Neon, serverless) |
| Cache | Redis (Upstash, serverless) |
| Product Images | Cloudflare R2 (zero egress) |
| User Uploads | AWS S3 + CloudFront |
| AI | Claude Vision API via AWS Lambda |
| Email | Resend |
| Analytics | PostHog |
| Errors | Sentry |
| Hosting | Vercel |
| DNS/CDN | Cloudflare |

### Key Metrics
- **Launch cost**: ~$13-55/mo
- **Year 1 cost**: ~$400-600
- **Target revenue (Month 6)**: ~$400-540/mo
- **Target revenue (Month 12)**: ~$2,000-3,500/mo

---

## 9. Infrastructure & Cost

### Storage Strategy (Hybrid)
```
Product images (static catalog)  → Cloudflare R2 (free, zero egress)
User uploads (room photos for AI) → AWS S3 + CloudFront (~$3-5/mo)
  └── S3 event trigger → Lambda → Claude Vision API → room analysis
```

### Cost Breakdown

| Service | Provider | Monthly Cost | Purpose |
|---|---|---|---|
| Hosting | Vercel | $0-20 | Next.js app |
| Database | Neon | $0-19 | PostgreSQL |
| Cache | Upstash | $0-10 | Redis |
| Product images | Cloudflare R2 | $0 | Zero egress |
| User uploads | AWS S3 + CF | $3-5 | AI pipeline |
| Domain | Cloudflare | ~$1/yr | DNS |
| Email | Resend | $0 | 3k emails/mo free |
| Monitoring | Sentry | $0 | 5k errors/mo free |
| **Total** | | **~$13-55/mo** | |

### AWS Cost Detail
| Item | Usage | Cost |
|---|---|---|
| S3 storage | 5GB | $0.12 |
| CloudFront transfer | 20GB/mo | $1.70 |
| Lambda | 5k invocations | $0.20 |
| **Total AWS** | | **~$2-5/mo** |

---

## 10. Development Phases

### Phase 1: MVP (Weeks 1-6)

| Week | Deliverable |
|---|---|
| 1 | Project init, DB schema, seed 300+ components + 6 themes, auth |
| 2 | Planner UI: room selector, component slots, budget slider, running total |
| 3 | Style engine: color harmony, theme consistency, space fitting, scoring |
| 4 | Price display + Shopee/Lazada/Tiki affiliate links |
| 5 | 2D room visualizer + setup sharing (image export) |
| 6 | Polish, Vietnamese i18n, deploy to Vercel |

**MVP Features:**
- Room type selection (4 types) + dimension input
- Component catalog (9 categories, 300+ items) with search/filter
- Setup planner with item selection + 2D visualization
- Style engine with 4-axis scoring (color, theme, space, budget)
- Theme gallery (6 curated themes) with one-click apply
- Price comparison across 3 shops with affiliate links
- User accounts (Google + Facebook)
- Save/load/share setups
- Export setup as PNG image
- Vietnamese + English i18n

### Phase 2: Growth (Weeks 7-12)
- 3D room visualization (React Three Fiber)
- Color palette generator
- Budget-based recommendations
- Setup comparison tool (budget vs premium)
- Price history charts
- Email drip campaigns (Resend)
- 10 SEO blog posts
- AdSense integration
- Analytics pipeline (PostHog)
- Design system + Storybook
- Testing: Vitest + Playwright

### Phase 3: Scale (Months 4-6)
- Real-time collaborative editing (WebSocket + CRDT)
- AI room analysis (upload photo → Claude Vision → suggestions)
- Price alerts
- Community features (browse/like/clone setups)
- AR preview (mobile)
- B2B Setup-as-a-Service
- Affiliate Link Insertion API
- Brand partnership dashboard
- Mobile PWA
- Full CI/CD pipeline
- Accessibility audit (WCAG 2.1 AA)

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Shopee/Lazada block scrapers | Price data stale | Official APIs first; rotate UA; cache aggressively; serve stale with warning banner |
| Affiliate program rejection | No revenue | Apply early; use Involve Asia for Lazada; have backup (Tiki, direct partnerships) |
| Low initial traffic | Slow growth | SEO content from day 1; share on Vietnamese PC/setup Facebook groups (500k+ members); setup photos for social virality |
| Component data stale | Bad UX | Automated scraper every 6h; admin panel for manual updates; "last updated" timestamps |
| Style engine too simple | Low engagement | Start rule-based; add ML later from user preference data; A/B test scoring weights |
| 3D visualization performance | Slow on low-end | Lazy-load Three.js; fallback to 2D canvas; feature detection |
| AI room analysis cost | Over budget | Cache results; use cheaper model for initial analysis; only run on explicit user request |
| AWS costs exceed budget | Over budget | Monitor with AWS billing alerts; S3 lifecycle policies; CloudFront caching |
| Vietnamese i18n issues | Bad UX | Test with native speakers; proper font stack; avoid text-transform: uppercase |

---

## Document Reference

| Document | Location | Description |
|---|---|---|
| Requirements | `docs/requirements-document.md` | 80 user stories, 91 acceptance criteria, NFRs |
| System Architecture | `docs/SYSTEM_ARCHITECTURE.md` | Service decomposition, caching, auth, security |
| Database Design | `docs/database-design.md` | Full ERD, 14 tables, indexing, migrations |
| API Design | `docs/API_DESIGN.md` | 40+ endpoints, Zod schemas, error formats |
| Project Structure | `docs/PROJECT_STRUCTURE.md` | Full folder tree, module boundaries, naming |
| UI/UX Design | `docs/UI_UX_DESIGN.md` | Design system, wireframes, interactions |
| Engineering Patterns | `docs/ENGINEERING_PATTERNS.md` | Style engine, scraping, caching, testing |
| Master Plan | `PLAN.md` | Business plan, monetization, roadmap |
