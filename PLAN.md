# gobuildgo — Full Plan (Setup Planner Pivot)

## Context

Vietnam-focused interactive desk setup visualization tool. Users plan their dream desk setup — room type, desk, chair, peripherals, lighting, decor — see a visual representation, and buy everything via affiliate links.

### Why Setup Planner > Original PC Builder Concept
- **5M+ desk owners** (WFH, gamers, students, creators) vs ~500k PC builders
- **Higher conversion**: Cheap items (desk, accessories) = easier decisions (5-10% vs 1-2%)
- **More affiliate touchpoints**: 12-18 items per setup vs 7 PC parts
- **Lower dev complexity**: No complex compatibility engine
- **Viral by design**: Setup images spread on TikTok, Instagram, Pinterest
- Cheaper items + visual context = impulse buying ("I want THAT setup")

---

## Tech Stack

### Frontend
| Tech | Purpose |
|---|---|
| **Next.js 14+ (App Router)** | SSR for SEO, API routes, all-in-one deployment |
| **TypeScript** | Type safety across stack |
| **TailwindCSS + shadcn/ui** | Fast UI, accessible components |
| **Zustand** | Setup state management |
| **Framer Motion** | Animations, transitions |
| **React Three Fiber + Drei** | 3D room visualization (Phase 2) |
| **html2canvas** | Export setup as shareable image |
| **next-intl** | Vietnamese + English i18n |

### Backend
| Tech | Purpose |
|---|---|
| **Next.js API Routes + Server Actions** | No separate server needed |
| **NextAuth.js** | Google + Facebook login (popular in Vietnam) |
| **Prisma ORM** | Type-safe DB access + migrations |

### Database + Cache
| Tech | Purpose |
|---|---|
| **PostgreSQL via Neon** | Serverless, free tier 0.5GB, auto-suspend |
| **Redis via Upstash** | Serverless cache, free tier 10k req/day |
| **Cloudflare R2** | Product images, 10GB free, zero egress |
| **AWS S3 + CloudFront** | User uploads (AI room analysis), ~$3-5/mo |

### Infrastructure
| Service | Provider | Cost | Why |
|---|---|---|---|
| Hosting | Vercel (Hobby→Pro) | $0→20/mo | Zero-config Next.js, edge, free SSL |
| Database | Neon PostgreSQL | $0→19/mo | Serverless, auto-suspend = cheap |
| Cache | Upstash Redis | $0→10/mo | Serverless, free tier at launch |
| Product images | Cloudflare R2 | $0 | 10GB free, zero egress |
| User uploads | AWS S3 + CloudFront | ~$3-5/mo | AI room analysis pipeline, S3 triggers Lambda |
| Domain | Namecheap/Cloudflare | ~$10/yr | .com or .vn |
| DNS | Cloudflare | $0 | Free CDN + DNS + DDoS |
| Monitoring | Vercel Analytics + Sentry | $0 | Free tiers at early stage |
| **Total launch** | | **~$13-55/mo** | |

**Year 1 total cost: ~$400-600**

### Storage Strategy (Hybrid R2 + S3)
```
Product images (static catalog)  → Cloudflare R2 (free, zero egress)
User uploads (room photos for AI) → AWS S3 + CloudFront (~$3-5/mo)
  └── S3 event trigger → Lambda → Claude Vision API → room analysis
```

**Why hybrid?** R2 has zero egress (perfect for serving product images to all users). S3 enables AWS ecosystem features (Lambda triggers, event-driven processing) needed for AI room analysis. Keeps costs predictable while getting AWS on resume.

### AWS S3 + CloudFront Cost Breakdown
| Item | Usage | Cost |
|---|---|---|
| S3 storage | 5GB user uploads | $0.12/mo |
| S3 PUT requests | 5k uploads/mo | $0.025/mo |
| CloudFront transfer | 20GB/mo | $1.70/mo |
| CloudFront requests | 50k/mo | $0.375/mo |
| Lambda (AI analysis) | 5k invocations, 512MB, 5s each | ~$0.20/mo (free tier covers most) |
| **Total AWS** | | **~$2.50-5/mo** |

### Why Not Spring Boot
- Needs always-on server (VPS ~$5-20/mo), separate deployment pipeline
- Next.js API routes handle all backend needs at this scale
- Single codebase = faster iteration, one deployment target

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Next.js App                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ Frontend  │  │ API      │  │ Server Actions│ │
│  │ (React)   │  │ Routes   │  │ (mutations)   │ │
│  └──────────┘  └──────────┘  └───────────────┘ │
│       │              │              │            │
│  ┌────┴──────────────┴──────────────┴────────┐  │
│  │           Prisma Client                    │  │
│  └────────────────┬──────────────────────────┘  │
└───────────────────┼─────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
   ┌────┴───┐  ┌───┴───┐  ┌───┴────┐
   │Postgres│  │ Redis │  │R2/S3   │
   │(Neon)  │  │(Upst.)│  │(Images)│
   └────────┘  └───────┘  └────────┘

   ┌──────────────────────────────────┐
   │  Background Workers (GitHub       │
   │  Actions cron / Vercel Cron)      │
   │  - Price scraper (Shopee/Lazada)  │
   │  - Affiliate link generator       │
   │  - Image optimizer                │
   └──────────────────────────────────┘
```

### Project Structure
```
gobuildgo/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/
│   │   ├── planner/            # main setup planner
│   │   │   ├── page.tsx        # room selection
│   │   │   └── [setupId]/      # saved setup view/edit
│   │   ├── components/         # component listing + detail
│   │   ├── themes/             # curated theme gallery
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── components/route.ts
│   │   │   ├── setups/route.ts
│   │   │   ├── prices/route.ts
│   │   │   └── themes/route.ts
│   │   ├── blog/
│   │   ├── layout.tsx
│   │   └── page.tsx            # landing
│   ├── components/
│   │   ├── ui/                 # shadcn
│   │   ├── planner/
│   │   │   ├── PlannerShell.tsx
│   │   │   ├── RoomSelector.tsx
│   │   │   ├── ComponentSlot.tsx
│   │   │   ├── StylePanel.tsx
│   │   │   ├── BudgetSlider.tsx
│   │   │   ├── RoomVisualizer.tsx
│   │   │   ├── ColorPalette.tsx
│   │   │   └── PriceSummary.tsx
│   │   └── shared/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── style-engine.ts     # color matching, theme consistency
│   │   ├── affiliate.ts
│   │   └── room-calculator.ts  # space fitting
│   ├── server/
│   │   ├── actions/
│   │   └── services/
│   ├── stores/
│   │   └── planner-store.ts    # Zustand
│   ├── types/
│   └── i18n/                   # Vietnamese + English
├── prisma/
│   ├── schema.prisma
│   └── seed/                   # 300+ items, themes
├── scripts/
│   └── scrapers/
├── public/
│   └── room-templates/
├── .github/workflows/
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Core Features

### Phase 1: MVP (Weeks 1-6)

**1. Interactive Setup Planner**
- Room type selector: bedroom, gaming room, WHF office, studio
- Room dimension input (W×D in cm)
- Component slots across 9 categories:
  - Desk, Chair, Monitor, Keyboard, Mouse, Lighting, Decor, Audio, Accessory
- Filter by price, brand, color, style tags
- Running total in VND
- Budget slider with smart distribution suggestions

**2. Style Engine**
- Color harmony scoring (do items share a cohesive palette?)
- Theme consistency checking (flags RGB gear in Japandi setup, etc.)
- Space fitting (desk fits room? chair clearance?)
- Returns: `{score: 0-100, suggestions[], warnings[]}`

**3. Theme Gallery**
- Curated themes: Japandi, Industrial, Minimalist, Gaming RGB, Retro, Scandinavian
- Each theme: color palette, recommended items, example setup
- One-click apply theme → auto-fills matching items

**4. Room Visualizer**
- 2D top-down view with desk + items placed
- Items scale to room dimensions
- Color-coded by category
- Export as PNG (html2canvas) for social sharing

**5. Price + Affiliate Integration**
- Display lowest price + shop name + affiliate link per item
- Shopee, Lazada, Tiki links
- "Buy All" button → opens all affiliate links

**6. User Accounts + Sharing**
- NextAuth (Google + Facebook)
- Save setups, share via URL
- Public setup gallery

### Phase 2: Growth (Weeks 7-12)
- 3D room visualization (React Three Fiber)
- Color palette generator (pick theme → matching items)
- Budget-based recommendations ("10M VND → best setup")
- Price history charts
- 10 SEO blog posts
- AdSense
- Social sharing optimization (OG images, Pinterest)

### Phase 3: Scale (Months 4-6)
- Price alerts
- Community setups (browse/clone)
- AR preview (phone camera → visualize desk in room)
- AI room analysis (upload photo → suggest setup)
- Brand partnership dashboard
- Mobile PWA

---

## Component Categories

| Category | Examples | Avg Price (VND) | Affiliate Ease |
|---|---|---|---|
| Desks | Standing, L-shaped, gaming | 1-5M | Easy |
| Chairs | Ergonomic, gaming | 2-8M | Easy |
| Monitors | 24-32", 144Hz, 4K | 3-15M | Medium |
| Keyboards | Mechanical, wireless | 500k-3M | Easy |
| Mice | Gaming, ergonomic | 300k-2M | Easy |
| Lighting | LED strips, desk lamps | 200k-1M | Very Easy |
| Decor | Plants, cable mgmt, organizers | 100k-500k | Very Easy |
| Audio | Headsets, speakers, mics | 500k-5M | Easy |
| Accessories | Mousepad, monitor arm, webcam | 200k-2M | Very Easy |

**300+ items to seed**: 40 desks, 40 chairs, 30 monitors, 40 keyboards, 30 mice, 50 lighting, 50 decor, 30 audio, 40 accessories.

---

## Database Schema

```prisma
enum ComponentCategory {
  Desk, Chair, Monitor, Keyboard, Mouse,
  Lighting, Decor, Audio, Accessory
}

enum RoomType {
  Bedroom, GamingRoom, Office, Studio
}

model Component {
  id          String   @id @default(cuid())
  category    ComponentCategory
  brand       String
  name        String
  specs       Json     // {width, depth, color, material, ...}
  colors      String[]
  styleTags   String[] // ["minimalist", "gaming", "japandi"]
  imageUrl    String?
  prices      Price[]
  setupItems  SetupItem[]
}

model Price {
  id          String   @id @default(cuid())
  componentId String
  component   Component @relation(fields: [componentId], references: [id])
  shop        String   // shopee, lazada, tiki, etc.
  price       Decimal  @db.Decimal(12,0)
  url         String   // affiliate link
  shopName    String
  lastUpdated DateTime @updatedAt
  @@index([componentId, price])
}

model Setup {
  id              String   @id @default(cuid())
  userId          String?
  name            String
  roomType        RoomType?
  roomDimensions  Json?    // {width, depth}
  theme           String?
  isPublic        Boolean  @default(false)
  totalPrice      Decimal? @db.Decimal(12,0)
  items           SetupItem[]
  user            User?    @relation(fields: [userId], references: [id])
  createdAt       DateTime @default(now())
}

model SetupItem {
  id          String   @id @default(cuid())
  setupId     String
  setup       Setup    @relation(fields: [setupId], references: [id])
  componentId String
  component   Component @relation(fields: [componentId], references: [id])
  quantity    Int      @default(1)
  position    Json?    // {x, y} for visual placement
}

model Theme {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String
  coverImage  String?
  colorPalette String[]
  styleTags   String[]
  isFeatured  Boolean  @default(false)
}

model User {
  id        String   @id @default(cuid())
  email     String?  @unique
  name      String?
  image     String?
  setups    Setup[]
}
```

---

## Style Engine Logic

```typescript
// src/lib/style-engine.ts
interface StyleResult {
  score: number;        // 0-100
  colorHarmony: number; // 0-100
  themeConsistency: number;
  spaceFit: number;
  suggestions: string[];
  warnings: StyleWarning[];
}

function evaluateSetup(items: Component[], theme: Theme): StyleResult {
  // Color harmony: check if item colors share a cohesive palette
  const colorHarmony = calculateColorHarmony(items, theme.colorPalette);

  // Theme consistency: flag items that clash with theme
  const themeConsistency = checkThemeConsistency(items, theme.styleTags);

  // Space fit: validate items fit room dimensions
  const spaceFit = checkSpaceFit(items, roomDimensions);

  // Weighted score
  const score = (colorHarmony * 0.4 + themeConsistency * 0.4 + spaceFit * 0.2);

  return { score, colorHarmony, themeConsistency, spaceFit, suggestions, warnings };
}
```

---

## Price Scraping

### Sources & Priority
1. **Shopee** — accessories, lighting, decor, peripherals (API + scraper)
2. **Lazada** — desks, chairs, monitors, electronics (via Involve Asia API)
3. **Tiki** — furniture, home goods
4. **Direct partnerships** — Nhà Xinh, GearVN, Phong Vũ (Phase 2)

### Scraper Architecture
```
GitHub Actions (cron: every 6h, free 2000 min/mo)
  ├── Fetch Shopee API / scrape product pages
  ├── Fetch Lazada API (via Involve Asia)
  ├── Fetch Tiki API
  ├── Normalize → {componentId, shop, price, url}
  └── Upsert into Neon PostgreSQL via Prisma
```

---

## Monetization

### Revenue Streams
| Stream | Commission/Income | Effort |
|---|---|---|
| Shopee Affiliate | 3-5% | Low (auto-links) |
| Lazada Affiliate (Involve Asia) | 3-12% | Low (auto-links) |
| Tiki Affiliate | 3-8% | Low (auto-links) |
| Direct partnerships | 5-15% | Medium |
| Google AdSense | $1-5 CPM | Low |
| Sponsored placements | Variable | Medium |

### Revenue Projection (Month 6)
- 50k pageviews/mo, 8% CTR, 6% conversion = 240 sales
- Avg 500k VND/item, 5% commission = 25k VND/sale
- **~$400-540/month** (affiliate + ads + sponsored)

### Revenue Projection (Month 12)
- 200k pageviews/mo
- **~$1,500-2,500/month**

### Cost: Year 1 ~$350-500

---

## Development Timeline

| Week | Milestone |
|---|---|
| 1 | Project setup, DB schema, seed 300 components + themes, auth |
| 2 | Planner UI — room selection, component slots, budget slider, total |
| 3 | Style engine (color matching, theme consistency) + space calculator |
| 4 | Price display + Shopee/Lazada/Tiki affiliate links |
| 5 | 2D room visualizer + setup sharing (image export) |
| 6 | Polish, Vietnamese i18n, deploy to Vercel |
| 7-8 | SEO content (10 posts), AdSense, social OG images |
| 9-10 | Price history charts, 3D visualizer (React Three Fiber) |
| 11-12 | Community features, setup gallery, brand partnerships |

---

## Verification

1. `npm run dev` → planner loads, select room, add items, see style score
2. Test theme mismatch (RGB in Japandi) → warning
3. Test room overflow (big desk in small room) → space warning
4. Click "Buy on Shopee" → opens with affiliate tag
5. Export setup image → clean PNG
6. Push to GitHub → Vercel auto-deploys
7. `npx tsx scripts/scrapers/shopee.ts` → prices update
8. i18n switch → Vietnamese

---

## Additional Revenue Streams

### 1. Setup-as-a-Service (B2B — Phase 3)
Sell pre-made setup packages to companies outfitting offices:
- "WFH Starter Kit" (desk + chair + monitor arm + webcam = 8M VND)
- "Content Creator Studio" (full streaming setup = 25M VND)
- Companies buy in bulk → higher commission per deal
- Landing page: "Setup your team" with bulk pricing

### 2. Affiliate Link Insertion API (Phase 3)
Other Vietnamese tech blogs want affiliate links but don't have the infrastructure:
- Expose a simple API: `GET /api/affiliate/search?q=standing+desk` → returns affiliate links
- Charge setup fee + revenue share
- Positions gobuildgo as infrastructure, not just a consumer app

### 3. Email Drip Campaigns
- User saves setup but doesn't buy → automated email after 24h: "Your dream setup is waiting"
- Weekly: "Price drops on items in your setup"
- Monthly: "New setups trending this month"
- Email tool: Resend (free tier: 3k emails/mo) — cheap, developer-friendly
- Expected: 10-15% of email recipients click through, 3-5% convert

### 4. Sponsored Theme Packs
- Desk/chair brands pay to be featured in a "Brand Spotlight" theme
- Example: "IKEA Workspace Collection" — curated IKEA items with affiliate links
- Flat fee per month featured + affiliate commission
- Low effort: just tag items with brand metadata

### 5. Setup Comparison Tool (Phase 2)
- Side-by-side comparison: "Budget Setup vs Premium Setup"
- "What 5M VND gets you vs 15M VND"
- Drives users toward higher-budget setups → higher affiliate revenue
- Great SEO content: "Best desk setup under 5M VND in Vietnam"

### 6. Referral Program
- Users share setup → friend signs up → both get a coupon/discount code
- Track via referral codes in URLs
- Drives organic growth, low cost

---

## Resume-Worthy Engineering Additions

These features demonstrate senior-level engineering skills while being practical:

### 1. Real-time Collaborative Editing (Phase 3)
- Multiple users edit same setup simultaneously (couples planning a room together)
- **Tech**: WebSocket via Socket.io or PartyKit, Operational Transform / CRDT for conflict resolution
- **Resume signal**: Real-time systems, distributed state, conflict resolution algorithms

### 2. Image Recognition for Room Analysis (Phase 3)
- User uploads photo of their room → AI detects room size, existing furniture, wall color, lighting
- Suggests setup that fits the actual space
- **Tech**: Claude Vision API or GPT-4V for room analysis, custom prompt engineering
- **Resume signal**: AI integration, computer vision pipeline, prompt engineering

### 3. Design System + Component Library
- Build a proper design system with Storybook documentation
- Tokens for colors, spacing, typography
- **Resume signal**: Design systems thinking, component architecture, documentation discipline

### 4. Performance Optimization
- Lighthouse score 95+ across all pages
- Image optimization pipeline (Sharp → WebP/AVIF, lazy loading, blur placeholders)
- Route prefetching, optimistic UI updates
- **Resume signal**: Web performance, Core Web Vitals, user experience engineering

### 5. Comprehensive Testing Strategy
- Unit tests (Vitest): style engine, room calculator, affiliate link generation
- Integration tests (Playwright): full planner flow, save/load setup, affiliate click tracking
- Visual regression tests (Chromatic or Percy): UI components don't break
- **Resume signal**: Testing discipline, CI/CD, quality engineering

### 6. Analytics Pipeline
- Event tracking: which components get added most, where users drop off, budget distribution
- Custom dashboard showing: setups created, affiliate CTR, conversion funnel
- **Tech**: PostHog (open-source, free tier) or custom events → ClickHouse
- **Resume signal**: Data-driven product development, analytics infrastructure

### 7. CI/CD + DevOps
- GitHub Actions: lint → test → build → deploy preview → deploy production
- Database migrations automated via Prisma Migrate in CI
- Environment management: dev, staging, production
- **Resume signal**: DevOps, CI/CD pipelines, infrastructure as code

### 8. Accessibility (a11y)
- WCAG 2.1 AA compliance: keyboard navigation, screen reader support, color contrast
- Automated a11y testing in CI (axe-core)
- **Resume signal**: Inclusive design, standards compliance

### 9. Internationalization Architecture
- next-intl with proper message extraction
- RTL support ready (even if not needed now — shows architecture thinking)
- Locale-based routing (`/en/planner`, `/vi/planner`)
- **Resume signal**: i18n architecture, global-ready applications

### 10. API Design + Documentation
- RESTful API with OpenAPI/Swagger docs
- Rate limiting, input validation (Zod), error handling middleware
- API versioning strategy from day one
- **Resume signal**: API design, developer experience, documentation

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Shopee/Lazada block scrapers | Official APIs first; rotate UA; cache aggressively |
| Affiliate rejection | Apply early; use Involve Asia for Lazada |
| Low traffic | SEO content day 1; share on Vietnamese FB groups; setup photos for social |
| Component data stale | Automated scraper + admin panel |
| Style engine too simple | Start rule-based; add ML later from user preference data |
| 3D visualization performance | Lazy-load Three.js; fallback to 2D canvas on low-end devices |
| AI room analysis cost | Cache results; use cheaper model for initial analysis; only run on user request |
