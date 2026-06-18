# GoBuildGo
GoBuildGo - Where you can build your dream setup - in your dreams!!!

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
