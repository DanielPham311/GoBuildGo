# gobuildgo — Requirements Document

**Version:** 1.0
**Date:** 2026-06-19
**Status:** Draft

---

## 1. Product Vision

Vietnam-focused interactive desk setup planner. Users pick a room type, choose a theme, add components (desk, chair, monitor, peripherals, lighting, decor, audio, accessories), see a 2D visualization with style scoring, and buy everything via Shopee/Lazada/Tiki affiliate links.

---

## 2. Target Audience

| Segment | Description | Pain Point |
|---|---|---|
| WFH professionals | 25-40, want aesthetic + ergonomic setups | No localized planning tool |
| Gamers | 16-30, want RGB/gaming setups | Can't visualize before buying |
| Students | 18-25, budget-conscious | Need price comparison in VND |
| Content creators | Want shareable, beautiful setups | No easy way to plan + share |

---

## 3. Functional Requirements

### 3.1 Core (MVP — Phase 1)

| ID | Requirement | Priority |
|---|---|---|
| F1 | User authentication (Google + Facebook OAuth + email/password with verification) | P0 |
| F2 | Component catalog browse (9 categories) with search/filter | P0 |
| F3 | Interactive setup planner (add/remove items, room dimensions) | P0 |
| F4 | 2D room visualizer (SVG canvas, drag items) | P0 |
| F5 | Style score (color harmony, theme consistency, space fit, budget balance) | P0 |
| F6 | Price display per component (lowest price + shop name) | P0 |
| F7 | Affiliate link generation (Shopee/Lazada/Tiki) | P0 |
| F8 | Save/load setups (authenticated) | P0 |
| F9 | Public setup gallery with sharing | P1 |
| F10 | Theme gallery (6 curated themes) | P1 |
| F11 | Vietnamese language support (i18n) | P1 |
| F12 | VND currency formatting | P0 |

### 3.2 Growth (Phase 2)

| ID | Requirement | Priority |
|---|---|---|
| F13 | Price history charts | P1 |
| F14 | Price drop alerts (email) | P1 |
| F15 | Community features (like, comment, clone setups) | P1 |
| F16 | User profiles + dashboard | P1 |
| F17 | AI room photo analysis (upload → suggestions) | P2 |
| F18 | SEO blog section | P1 |
| F19 | Google AdSense integration | P2 |

### 3.3 Scale (Phase 3)

| ID | Requirement | Priority |
|---|---|---|
| F20 | AI build recommendations ("20M VND gaming setup") | P2 |
| F21 | 3D case visualization (React Three Fiber) | P3 |
| F22 | Mobile PWA | P2 |
| F23 | Admin panel (component CRUD, scraper control) | P1 |
| F24 | Affiliate conversion tracking + reporting | P1 |

---

## 4. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NF1 | Page load time (LCP) | < 2.5s on 3G |
| NF2 | Time to interactive (TTI) | < 3.5s on 4G |
| NF3 | API response time (p95) | < 200ms for cached, < 500ms for DB |
| NF4 | Uptime | 99.9% (Vercel SLA) |
| NF5 | Lighthouse performance score | > 90 |
| NF6 | Lighthouse accessibility score | > 95 |
| NF7 | SEO: Core Web Vitals | All "Good" |
| NF8 | Concurrent users (MVP) | 500 simultaneous |
| NF9 | Database size (launch) | < 500MB (Neon free tier) |
| NF10 | Image optimization | WebP/AVIF, < 200KB per image |
| NF11 | Vietnamese diacritic rendering | Correct across all browsers |
| NF12 | Mobile responsive | 360px — 2560px |
| NF13 | Dark mode support | Full theme parity |

---

## 5. API Requirements

| ID | Requirement |
|---|---|
| A1 | RESTful API under `/api/v1/` prefix |
| A2 | URL path versioning with lifecycle management (Active → Stable → Deprecated → Retired) |
| A3 | Unversioned `/api/*` routes redirect (307) to `/api/v1/*` |
| A4 | Zod validation at every API boundary |
| A5 | Rate limiting: public 100/min, authenticated 1000/min, admin 2000/min |
| A6 | Standard error envelope: `{ error: { code, message, details } }` |
| A7 | Pagination envelope for list endpoints: `{ data, total, page, limit, totalPages }` |
| A8 | CORS restricted to gobuildgo.vn domains |
| A9 | All prices in VND (zero-decimal) |

---

## 6. Data Requirements

| Entity | Initial Count | Growth Rate |
|---|---|---|
| Components | 200 (seed) | ~50/month (admin) |
| Prices | ~600 (3 shops × 200) | Updated every 6h |
| Users | 0 | ~100/month (launch) |
| Setups | 0 | ~500/month (launch) |
| Themes | 6 (seed) | ~2/month |

---

## 7. Component Categories (Canonical)

| Category | Description | Example Items |
|---|---|---|
| `desk` | Desk table | Standing desk, L-shaped desk |
| `chair` | Chair | Ergonomic chair, gaming chair |
| `monitor` | Monitor/display | 27" 4K, ultrawide |
| `keyboard` | Keyboard | Mechanical, membrane |
| `mouse` | Mouse | Gaming mouse, ergonomic |
| `lighting` | Lighting | LED strip, desk lamp, bias lighting |
| `decor` | Decor | Plants, cable management, desk mat |
| `audio` | Audio | Headset, speaker, microphone |
| `accessory` | Accessory | Monitor arm, webcam, USB hub |

---

## 8. Room Types (Canonical)

| Type | Description |
|---|---|
| `bedroom` | Bedroom with desk |
| `gaming_room` | Dedicated gaming room |
| `office` | Home office / study |
| `studio` | Content creation studio |

---

## 9. Shop Integrations (Canonical)

| Shop | Integration | Commission |
|---|---|---|
| `shopee` | Shopee Affiliate API | 3-5% |
| `lazada` | Involve Asia API | 3-12% |
| `tiki` | Tiki Affiliate API | 3-8% |
| `phongvu` | Direct partnership | 2-5% |
| `gearvn` | Direct partnership | 2-5% |
| `nhaxinh` | Direct partnership | 3-5% |

---

## 10. Style Engine Scoring

| Dimension | Weight | Inputs |
|---|---|---|
| Color Harmony | 35% | Item colors vs theme palette (HSL distance) |
| Theme Consistency | 35% | Item style tags vs theme tags (Jaccard similarity) |
| Space Fit | 20% | Item dimensions vs room dimensions |
| Budget Balance | 10% | Total price vs budget range |

**Score range:** 0-100. Display: green (>80), yellow (50-80), red (<50).

---

## 11. Email Subscription Types (Canonical)

| Type | Description |
|---|---|
| `price_alert` | Notify when favorited component drops in price |
| `weekly_digest` | Trending setups and new themes |
| `promotions` | Partner deals and sponsored content |
| `new_setups` | New public setups matching favorite themes |

---

## 12. Budget Constraints

| Item | Monthly Cost |
|---|---|
| Vercel (Hobby/Pro) | $0-20 |
| Neon PostgreSQL | $0 (free tier) |
| Upstash Redis | $0 (free tier) |
| Cloudflare R2 | $0 (10GB free) |
| AWS S3 + CloudFront | ~$3-5 |
| Domain | ~$1 |
| **Total** | **~$5-30/mo** |

---

## 13. Compliance & Legal

- GDPR-style data handling (IP hashing, anonymization on delete)
- Affiliate disclosure on all pages with affiliate links
- Privacy policy + terms of service
- Cookie consent banner (if using analytics)
- Shopee/Lazada/Tiki affiliate program TOS compliance
