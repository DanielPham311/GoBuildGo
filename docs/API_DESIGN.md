# Gobuildgo REST API Design Document

> **Current Version:** v1
> **Base URL:** `https://gobuildgo.vn/api/v1`
> **Protocol:** HTTPS only
> **Content-Type:** `application/json` (except multipart uploads)
> **Date:** 2026-06-18

---

## Table of Contents

1. [Overview & Conventions](#1-overview--conventions)
2. [API Versioning](#2-api-versioning)
3. [Authentication Endpoints (v1)](#3-authentication-endpoints-v1)
4. [Component Endpoints (v1)](#4-component-endpoints-v1)
5. [Setup Endpoints (v1)](#5-setup-endpoints-v1)
6. [Theme Endpoints (v1)](#6-theme-endpoints-v1)
7. [Price & Affiliate Endpoints (v1)](#7-price--affiliate-endpoints-v1)
8. [User Endpoints (v1)](#8-user-endpoints-v1)
9. [Upload Endpoints (v1)](#9-upload-endpoints-v1)
10. [Admin Endpoints (v1)](#10-admin-endpoints-v1)
11. [Common Patterns (All Versions)](#11-common-patterns-all-versions)
12. [Zod Validation Schemas (v1)](#12-zod-validation-schemas-v1)

---

## 1. Overview & Conventions

### Authentication

All authenticated endpoints require a session cookie set via NextAuth.js. No bearer token header is needed — the session cookie is sent automatically by the browser.

For programmatic API access, include the `next-auth.session-token` cookie or pass the CSRF token via the `X-CSRF-Token` header on state-changing requests.

**Auth providers:** Email/Password (`CredentialsProvider`), Google OAuth, Facebook OAuth. Email verification required for credentials accounts. Password reset via Resend email.

---

## 2. API Versioning

### Strategy: URL Path Versioning

All API endpoints are versioned via the URL path prefix: `/api/v1/...`

**Rules:**

- **Current version** is v1. All endpoints in this document are under `/api/v1/`.
- **Unversioned routes** (`/api/...`) redirect (307) to the current version (`/api/v1/...`).
- **New major versions** (v2, v3) are created when breaking changes are introduced.
- **Old versions** are maintained for 6 months after a new version is released, then deprecated with a `Sunset` header.
- **Version negotiation**: Clients can also use the `Accept-Version: v1` header as an alternative to URL path.

### Version Lifecycle

| Phase | Behavior | HTTP Headers |
|---|---|---|
| **Active** | Fully supported, receives new features | None |
| **Stable** | Bug fixes only, no new features | `Deprecation: true` |
| **Deprecated** | Still works, but clients should migrate | `Deprecation: true`, `Sunset: <date>`, `Link: <migration-guide>` |
| **Retired** | Returns `410 Gone` with migration info | `Sunset: <date>` |

### Example Version Evolution

```
v1 (current):  GET /api/v1/components
v2 (future):   GET /api/v2/components  — breaking change: pagination cursor-based
v1 (stable):   GET /api/v1/components  — still works, returns Deprecation header
```

### Response Headers (All Versioned Endpoints)

```
API-Version: v1
Deprecation: true          # only when version enters Stable phase
Sunset: Sat, 01 Jan 2027 00:00:00 GMT  # only when deprecated
Link: </docs/api/migration>; rel="migration"  # link to migration guide
```

### Next.js Route Structure

```
src/app/api/
├── v1/                          # versioned API
│   ├── auth/[...nextauth]/route.ts
│   ├── components/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   ├── setups/
│   ├── themes/
│   ├── prices/
│   ├── users/
│   ├── upload/
│   ├── admin/
│   └── health/route.ts
└── route.ts                     # unversioned → redirects to /v1
```

### Middleware Version Redirect

Unversioned `/api/*` requests are redirected to `/api/v1/*` via Next.js middleware:

```typescript
// middleware.ts
if (path.startsWith('/api/') && !path.startsWith('/api/v')) {
  return NextResponse.redirect(`/api/v1${path.slice(4)}`, 307)
}
```

### Standard Response Envelope

All responses (except errors) that return a single resource use the resource object directly. List responses use the paginated envelope defined in [Common Patterns](#11-common-patterns).

### Error Format

All errors follow this structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "name", "message": "Name is required" }
    ]
  }
}
```

### Rate Limit Tiers

| Tier | Limit | Applies To |
|------|-------|------------|
| `public` | 100 requests/min | Unauthenticated requests |
| `authenticated` | 1000 requests/min | Logged-in users |
| `admin` | 2000 requests/min | Users with `role: "admin"` |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1718700000
```

---

## 3. Authentication Endpoints (v1)

All auth endpoints are handled by NextAuth.js. Supports **OAuth** (Google + Facebook) and **email/password** via `CredentialsProvider`.

### POST /api/v1/auth/signin

Sign in with OAuth provider or email/password.

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | POST |

**Request Body (OAuth):**

```json
{
  "provider": "google",
  "redirect": "https://gobuildgo.vn/dashboard",
  "csrfToken": "abc123..."
}
```

**Request Body (Credentials):**

```json
{
  "email": "nguyenvana@example.com",
  "password": "securePassword123",
  "redirect": "https://gobuildgo.vn/dashboard",
  "csrfToken": "abc123..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | `string` | Conditional | OAuth: `google` or `facebook`. Omit for email/password. |
| `email` | `string` | Conditional | Required for credentials sign-in. Valid email format. |
| `password` | `string` | Conditional | Required for credentials sign-in. Min 8 chars. |
| `redirect` | `string` | No | URL to redirect after sign-in |
| `csrfToken` | `string` | Yes | CSRF token from `GET /api/v1/auth/csrf` |

**Success Response (OAuth):** `302 Redirect` to the provider's OAuth page, or `200 OK` with redirect URL for popup flows.

**Success Response (Credentials):** `302 Redirect` to the specified redirect URL (or `/dashboard`).

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `MISSING_PROVIDER` | Provider is required for OAuth sign-in |
| 400 | `INVALID_PROVIDER` | Provider "xyz" is not configured |
| 400 | `MISSING_CREDENTIALS` | Email and password are required |
| 400 | `INVALID_EMAIL` | Invalid email format |
| 401 | `INVALID_CREDENTIALS` | Incorrect email or password |
| 401 | `EMAIL_NOT_VERIFIED` | Email not verified. Please check your inbox. |
| 403 | `CSRF_FAILED` | Invalid CSRF token |
| 429 | `TOO_MANY_ATTEMPTS` | Too many sign-in attempts. Try again in 15 minutes. |

---

### POST /api/v1/auth/signout

Sign out the current user.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | POST |

**Request Body:**

```json
{
  "redirect": "https://gobuildgo.vn/"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `redirect` | `string` | No | URL to redirect after sign-out |
| `csrfToken` | `string` | Yes | CSRF token |

**Success Response:** `200 OK`

```json
{
  "url": "https://gobuildgo.vn/"
}
```

---

### POST /api/v1/auth/register

Register a new account with email and password. Sends verification email.

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | POST |

**Request Body:**

```json
{
  "name": "Nguyen Van A",
  "email": "nguyenvana@example.com",
  "password": "securePassword123",
  "confirmPassword": "securePassword123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Display name (2-50 chars) |
| `email` | `string` | Yes | Valid email address (max 255 chars) |
| `password` | `string` | Yes | Min 8 chars, must contain uppercase + lowercase + number |
| `confirmPassword` | `string` | Yes | Must match `password` |

**Success Response:** `201 Created`

```json
{
  "message": "Account created. Please check your email to verify your account.",
  "user": {
    "id": "usr_abc123",
    "name": "Nguyen Van A",
    "email": "nguyenvana@example.com"
  }
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid input data |
| 400 | `PASSWORD_TOO_SHORT` | Password must be at least 8 characters |
| 400 | `PASSWORD_REQUIREMENTS` | Password must contain uppercase, lowercase, and number |
| 400 | `PASSWORDS_DONT_MATCH` | Passwords do not match |
| 409 | `EMAIL_EXISTS` | An account with this email already exists |
| 429 | `RATE_LIMITED` | Too many requests |

---

### POST /api/v1/auth/verify-email

Verify email address with token from verification email.

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | POST |

**Request Body:**

```json
{
  "token": "verify_abc123..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | `string` | Yes | Verification token from email |

**Success Response:** `200 OK`

```json
{
  "message": "Email verified successfully. You can now sign in."
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `MISSING_TOKEN` | Verification token is required |
| 400 | `INVALID_TOKEN` | Invalid or expired verification token |

---

### POST /api/v1/auth/forgot-password

Request a password reset email.

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | POST |

**Request Body:**

```json
{
  "email": "nguyenvana@example.com"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | `string` | Yes | Registered email address |

**Success Response:** `200 OK`

```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

> Always returns `200` to prevent email enumeration.

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `MISSING_EMAIL` | Email is required |
| 429 | `RATE_LIMITED` | Too many requests |

---

### POST /api/v1/auth/reset-password

Reset password with token from reset email.

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | POST |

**Request Body:**

```json
{
  "token": "reset_abc123...",
  "password": "newSecurePassword456",
  "confirmPassword": "newSecurePassword456"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | `string` | Yes | Reset token from email |
| `password` | `string` | Yes | New password (min 8 chars, uppercase + lowercase + number) |
| `confirmPassword` | `string` | Yes | Must match `password` |

**Success Response:** `200 OK`

```json
{
  "message": "Password reset successfully. You can now sign in with your new password."
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `MISSING_TOKEN` | Reset token is required |
| 400 | `INVALID_TOKEN` | Invalid or expired reset token |
| 400 | `PASSWORD_TOO_SHORT` | Password must be at least 8 characters |
| 400 | `PASSWORDS_DONT_MATCH` | Passwords do not match |

---

### GET /api/v1/auth/session

Get the current user session.

| Property | Value |
|----------|-------|
| **Auth Required** | No (returns `null` if not authenticated) |
| **Rate Limit** | public (100/min) |
| **Method** | GET |

**Success Response:** `200 OK`

```json
{
  "user": {
    "id": "usr_abc123",
    "name": "Nguyen Van A",
    "email": "nguyenvana@example.com",
    "image": "https://lh3.googleusercontent.com/...",
    "role": "user"
  },
  "expires": "2026-07-18T10:00:00.000Z"
}
```

When not authenticated:

```json
{
  "user": null,
  "expires": null
}
```

---

### GET /api/v1/auth/providers

List all configured authentication providers.

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | GET |

**Success Response:** `200 OK`

```json
{
  "credentials": {
    "id": "credentials",
    "name": "Email & Password",
    "type": "credentials",
    "signinUrl": "https://gobuildgo.vn/api/v1/auth/signin"
  },
  "google": {
    "id": "google",
    "name": "Google",
    "type": "oauth",
    "signinUrl": "https://gobuildgo.vn/api/v1/auth/signin/google",
    "callbackUrl": "https://gobuildgo.vn/api/v1/auth/callback/google"
  },
  "facebook": {
    "id": "facebook",
    "name": "Facebook",
    "type": "oauth",
    "signinUrl": "https://gobuildgo.vn/api/v1/auth/signin/facebook",
    "callbackUrl": "https://gobuildgo.vn/api/v1/auth/callback/facebook"
  }
}
```

---

### GET /api/v1/auth/csrf

Get a CSRF token for form submissions.

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | GET |

**Success Response:** `200 OK`

```json
{
  "csrfToken": "a1b2c3d4e5f6..."
}
```

---

## 4. Component Endpoints (v1)

### GET /api/v1/components

List components with filtering, sorting, and pagination.

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | GET |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | `string` | — | Filter by category: `desk`, `chair`, `monitor`, `keyboard`, `mouse`, `lighting`, `decor`, `audio`, `accessory` |
| `min_price` | `number` | — | Minimum price in VND |
| `max_price` | `number` | — | Maximum price in VND |
| `brand` | `string` | — | Filter by brand name (case-insensitive) |
| `color` | `string` | — | Filter by color |
| `style_tag` | `string` | — | Filter by style: `minimalist`, `gaming`, `rgb`, `vintage`, `modern`, `cozy`, `professional` |
| `q` | `string` | — | Full-text search query |
| `sort` | `string` | `popular` | Sort order: `popular`, `price_asc`, `price_desc`, `newest`, `name_asc` |
| `page` | `number` | `1` | Page number (1-indexed) |
| `limit` | `number` | `20` | Items per page (max 100) |

**Success Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "comp_001",
      "name": "Secretlab TITAN Evo 2022",
      "brand": "Secretlab",
      "category": "chair",
      "description": "Premium gaming chair with lumbar support",
      "imageUrl": "https://gobuildgo.vn/images/secretlab-titan.jpg",
      "color": "Black",
      "styleTags": ["gaming", "professional"],
      "prices": [
        {
          "shop": "shopee",
          "price": 12500000,
          "currency": "VND",
          "url": "https://shopee.vn/...",
          "lastUpdated": "2026-06-18T08:00:00.000Z"
        },
        {
          "shop": "lazada",
          "price": 12900000,
          "currency": "VND",
          "url": "https://lazada.vn/...",
          "lastUpdated": "2026-06-17T14:00:00.000Z"
        }
      ],
      "lowestPrice": 12500000,
      "highestPrice": 12900000,
      "rating": 4.8,
      "reviewCount": 342,
      "createdAt": "2026-01-15T00:00:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `INVALID_PARAMETER` | Invalid value for parameter "sort" |
| 429 | `RATE_LIMITED` | Too many requests |

---

### GET /api/v1/components/[id]

Get a single component with all prices and related items.

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | GET |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Component ID |

**Success Response:** `200 OK`

```json
{
  "id": "comp_001",
  "name": "Secretlab TITAN Evo 2022",
  "brand": "Secretlab",
  "category": "chair",
  "description": "Premium gaming chair with lumbar support",
  "imageUrl": "https://gobuildgo.vn/images/secretlab-titan.jpg",
  "images": [
    "https://gobuildgo.vn/images/secretlab-titan-1.jpg",
    "https://gobuildgo.vn/images/secretlab-titan-2.jpg"
  ],
  "color": "Black",
  "styleTags": ["gaming", "professional"],
  "specifications": {
    "weight": "30kg",
    "maxLoad": "130kg",
    "material": "Leatherette",
    "warranty": "5 years"
  },
  "prices": [
    {
      "shop": "shopee",
      "price": 12500000,
      "currency": "VND",
      "url": "https://shopee.vn/...",
      "lastUpdated": "2026-06-18T08:00:00.000Z"
    }
  ],
  "lowestPrice": 12500000,
  "highestPrice": 12900000,
  "rating": 4.8,
  "reviewCount": 342,
  "relatedItems": [
    {
      "id": "comp_045",
      "name": "Secretlab MAGNUS Pro",
      "category": "desk",
      "imageUrl": "https://gobuildgo.vn/images/magnus-pro.jpg",
      "lowestPrice": 18900000
    }
  ],
  "createdAt": "2026-01-15T00:00:00.000Z",
  "updatedAt": "2026-06-18T08:00:00.000Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 404 | `NOT_FOUND` | Component with id "comp_999" not found |

---

### GET /api/v1/components/[id]/prices

Get price history for a component (last 30 days).

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | GET |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Component ID |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `shop` | `string` | — | Filter by shop: `shopee`, `lazada`, `tiki`, `phongvu`, `gearvn`, `nhaxinh` |
| `days` | `number` | `30` | Number of days of history (max 90) |

**Success Response:** `200 OK`

```json
{
  "componentId": "comp_001",
  "componentName": "Secretlab TITAN Evo 2022",
  "history": [
    {
      "shop": "shopee",
      "date": "2026-06-18",
      "price": 12500000,
      "currency": "VND"
    },
    {
      "shop": "shopee",
      "date": "2026-06-11",
      "price": 12900000,
      "currency": "VND"
    },
    {
      "shop": "lazada",
      "date": "2026-06-18",
      "price": 12900000,
      "currency": "VND"
    }
  ],
  "lowestEver": 11900000,
  "highestEver": 13500000,
  "currentLowest": 12500000
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 404 | `NOT_FOUND` | Component not found |
| 400 | `INVALID_DAYS` | "days" must be between 1 and 90 |

---

### GET /api/v1/components/[id]/similar

Get similar components (same category, similar price range).

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | GET |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Component ID |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | `number` | `6` | Number of similar items (max 20) |

**Success Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "comp_002",
      "name": "DXRacer Master",
      "brand": "DXRacer",
      "category": "chair",
      "imageUrl": "https://gobuildgo.vn/images/dxracer-master.jpg",
      "lowestPrice": 11800000,
      "rating": 4.6,
      "styleTags": ["gaming"]
    },
    {
      "id": "comp_003",
      "name": "Razer Iskur V2",
      "brand": "Razer",
      "category": "chair",
      "imageUrl": "https://gobuildgo.vn/images/razer-iskur.jpg",
      "lowestPrice": 13200000,
      "rating": 4.7,
      "styleTags": ["gaming", "rgb"]
    }
  ],
  "total": 2
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 404 | `NOT_FOUND` | Component not found |

---

### GET /api/v1/components/search

Full-text search across component name, brand, and description.

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | GET |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | `string` | — | Search query (required, min 2 chars) |
| `category` | `string` | — | Optional category filter |
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `20` | Items per page (max 50) |

**Success Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "comp_001",
      "name": "Secretlab TITAN Evo 2022",
      "brand": "Secretlab",
      "category": "chair",
      "description": "Premium gaming chair with lumbar support",
      "imageUrl": "https://gobuildgo.vn/images/secretlab-titan.jpg",
      "lowestPrice": 12500000,
      "rating": 4.8,
      "highlight": {
        "name": "Secretlab <mark>TITAN</mark> Evo 2022",
        "description": "Premium gaming chair with lumbar support"
      }
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "query": "titan"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `QUERY_TOO_SHORT` | Search query must be at least 2 characters |
| 400 | `MISSING_QUERY` | Query parameter "q" is required |

---

## 5. Setup Endpoints (v1)

### GET /api/v1/setups

List public setups with filtering and pagination.

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | GET |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `room_type` | `string` | — | Filter: `bedroom`, `office`, `studio`, `gaming_room` |
| `theme` | `string` | — | Filter by theme slug |
| `budget_min` | `number` | — | Minimum total budget in VND |
| `budget_max` | `number` | — | Maximum total budget in VND |
| `sort` | `string` | `popular` | Sort: `popular`, `newest`, `total_price_asc`, `total_price_desc`, `most_liked` |
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `20` | Items per page (max 50) |

**Success Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "setup_001",
      "name": "Minimalist White Setup",
      "roomType": "bedroom",
      "theme": "minimalist",
      "coverImageUrl": "https://gobuildgo.vn/thumbs/setup-001.jpg",
      "totalPrice": 35000000,
      "itemCount": 8,
      "likeCount": 234,
      "author": {
        "id": "usr_xyz",
        "name": "Minh Tran",
        "image": "https://..."
      },
      "createdAt": "2026-06-10T00:00:00.000Z"
    }
  ],
  "total": 89,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

---

### POST /api/v1/setups

Create a new setup.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | POST |

**Request Body:**

```json
{
  "name": "My Dream Setup",
  "slug": "my-dream-setup",
  "roomType": "gaming_room",
  "roomDimensions": {
    "width": 350,
    "depth": 280,
    "height": 270,
    "unit": "cm"
  },
  "theme": "rgb",
  "isPublic": true,
  "items": [
    {
      "componentId": "comp_001",
      "quantity": 1,
      "position": {
        "x": 100,
        "y": 50,
        "z": 0
      }
    },
    {
      "componentId": "comp_045",
      "quantity": 1,
      "position": {
        "x": 0,
        "y": 0,
        "z": 0
      }
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Setup name (3-100 chars) |
| `slug` | `string` | No | URL-friendly identifier; auto-generated from name if omitted |
| `roomType` | `string` | Yes | Room type enum |
| `roomDimensions` | `object` | No | Width/depth/height + unit |
| `theme` | `string` | No | Theme slug |
| `isPublic` | `boolean` | No | Default `false` |
| `items` | `array` | No | Setup items (max 50) |
| `items[].componentId` | `string` | Yes (if items) | Valid component ID |
| `items[].quantity` | `number` | No | Default `1`, max `20` |
| `items[].position` | `object` | No | x, y, z coordinates in cm |

**Success Response:** `201 Created`

```json
{
  "id": "setup_002",
  "name": "My Dream Setup",
  "slug": "my-dream-setup",
  "roomType": "gaming_room",
  "roomDimensions": {
    "width": 350,
    "depth": 280,
    "height": 270,
    "unit": "cm"
  },
  "theme": "rgb",
  "isPublic": true,
  "totalPrice": 31400000,
  "itemCount": 2,
  "likeCount": 0,
  "author": {
    "id": "usr_abc123",
    "name": "Nguyen Van A"
  },
  "createdAt": "2026-06-18T10:00:00.000Z",
  "updatedAt": "2026-06-18T10:00:00.000Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Name must be between 3 and 100 characters |
| 400 | `INVALID_COMPONENT` | Component "comp_999" not found |
| 400 | `TOO_MANY_ITEMS` | Maximum 50 items per setup |
| 400 | `DUPLICATE_SLUG` | A setup with this slug already exists |
| 401 | `UNAUTHENTICATED` | Authentication required |

---

### GET /api/v1/setups/[id]

Get a single setup with all items and component details.

| Property | Value |
|----------|-------|
| **Auth Required** | No (public setups) / Yes (private setups, owner only) |
| **Rate Limit** | public (100/min) |
| **Method** | GET |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Setup ID |

**Success Response:** `200 OK`

```json
{
  "id": "setup_001",
  "name": "Minimalist White Setup",
  "roomType": "bedroom",
  "roomDimensions": {
    "width": 300,
    "depth": 250,
    "height": 270,
    "unit": "cm"
  },
  "theme": "minimalist",
  "isPublic": true,
  "totalPrice": 35000000,
  "likeCount": 234,
  "isLiked": false,
  "author": {
    "id": "usr_xyz",
    "name": "Minh Tran",
    "image": "https://..."
  },
  "items": [
    {
      "id": "si_001",
      "componentId": "comp_045",
      "component": {
        "id": "comp_045",
        "name": "Secretlab MAGNUS Pro",
        "brand": "Secretlab",
        "category": "desk",
        "imageUrl": "https://gobuildgo.vn/images/magnus-pro.jpg",
        "lowestPrice": 18900000
      },
      "quantity": 1,
      "position": { "x": 0, "y": 0, "z": 0 }
    }
  ],
  "createdAt": "2026-06-10T00:00:00.000Z",
  "updatedAt": "2026-06-15T00:00:00.000Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 404 | `NOT_FOUND` | Setup not found |
| 403 | `FORBIDDEN` | This setup is private |

---

### PATCH /api/v1/setups/[id]

Update a setup (owner only).

| Property | Value |
|----------|-------|
| **Auth Required** | Yes (owner only) |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | PATCH |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Setup ID |

**Request Body:** Same as POST, all fields optional. Only provided fields are updated.

```json
{
  "name": "Updated Setup Name",
  "isPublic": false,
  "items": [
    {
      "componentId": "comp_001",
      "quantity": 1,
      "position": { "x": 50, "y": 50, "z": 0 }
    }
  ]
}
```

**Success Response:** `200 OK` — Full updated setup object (same format as GET).

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 403 | `FORBIDDEN` | You do not own this setup |
| 404 | `NOT_FOUND` | Setup not found |
| 400 | `VALIDATION_ERROR` | Invalid field values |

---

### DELETE /api/v1/setups/[id]

Soft delete a setup (owner only).

| Property | Value |
|----------|-------|
| **Auth Required** | Yes (owner only) |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | DELETE |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Setup ID |

**Success Response:** `200 OK`

```json
{
  "message": "Setup deleted successfully",
  "id": "setup_001"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 403 | `FORBIDDEN` | You do not own this setup |
| 404 | `NOT_FOUND` | Setup not found |

---

### POST /api/v1/setups/[id]/clone

Clone a setup to the current user's account.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | POST |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Setup ID to clone |

**Request Body (optional):**

```json
{
  "name": "My Clone of Minimalist Setup"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | No | Override name for the clone |

**Success Response:** `201 Created` — New setup object (same format as GET).

```json
{
  "id": "setup_003",
  "name": "My Clone of Minimalist Setup",
  "roomType": "bedroom",
  "theme": "minimalist",
  "isPublic": false,
  "totalPrice": 35000000,
  "itemCount": 8,
  "likeCount": 0,
  "author": {
    "id": "usr_abc123",
    "name": "Nguyen Van A"
  },
  "items": [ "..." ],
  "createdAt": "2026-06-18T10:30:00.000Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 404 | `NOT_FOUND` | Source setup not found |
| 401 | `UNAUTHENTICATED` | Authentication required |

---

### GET /api/v1/setups/[id]/export

Generate a shareable image URL for a setup.

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | GET |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Setup ID |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `format` | `string` | `png` | Image format: `png`, `jpg` |
| `width` | `number` | `1200` | Image width in px (max 2400) |

**Success Response:** `200 OK`

```json
{
  "url": "https://gobuildgo.vn/exports/setup_001_1200.png",
  "expiresAt": "2026-06-19T10:00:00.000Z",
  "width": 1200,
  "height": 800,
  "format": "png"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 404 | `NOT_FOUND` | Setup not found |
| 202 | `PROCESSING` | Image is being generated, retry in a few seconds |

---

### POST /api/v1/setups/[id]/like

Toggle like on a setup.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | POST |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Setup ID |

**Success Response:** `200 OK`

```json
{
  "liked": true,
  "likeCount": 235
}
```

When unliking:

```json
{
  "liked": false,
  "likeCount": 234
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 404 | `NOT_FOUND` | Setup not found |
| 401 | `UNAUTHENTICATED` | Authentication required |

---

### GET /api/v1/setups/[id]/likes

Get like count for a setup.

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | GET |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Setup ID |

**Success Response:** `200 OK`

```json
{
  "likeCount": 234,
  "liked": false
}
```

When authenticated and liked:

```json
{
  "likeCount": 234,
  "liked": true
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 404 | `NOT_FOUND` | Setup not found |

---

## 6. Theme Endpoints (v1)

### GET /api/v1/themes

List all available themes.

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | GET |

**Success Response:** `200 OK`

```json
{
  "data": [
    {
      "slug": "minimalist",
      "name": "Minimalist",
      "description": "Clean, clutter-free aesthetic with neutral tones",
      "coverImageUrl": "https://gobuildgo.vn/themes/minimalist.jpg",
      "setupCount": 45,
      "popularColors": ["white", "black", "wood"],
      "popularBrands": ["IKEA", "Secretlab", "Apple"]
    },
    {
      "slug": "rgb",
      "name": "RGB Gaming",
      "description": "Vibrant RGB lighting with bold colors",
      "coverImageUrl": "https://gobuildgo.vn/themes/rgb.jpg",
      "setupCount": 78,
      "popularColors": ["black", "purple", "blue"],
      "popularBrands": ["Razer", "Corsair", "Lian Li"]
    },
    {
      "slug": "cozy",
      "name": "Cozy Warm",
      "description": "Warm lighting and comfortable vibes",
      "coverImageUrl": "https://gobuildgo.vn/themes/cozy.jpg",
      "setupCount": 32,
      "popularColors": ["warm white", "wood", "cream"],
      "popularBrands": ["IKEA", "Xiaomi", "Philips"]
    }
  ],
  "total": 6
}
```

---

### GET /api/v1/themes/[slug]

Get theme details with recommended components.

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | GET |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Theme slug |

**Success Response:** `200 OK`

```json
{
  "slug": "minimalist",
  "name": "Minimalist",
  "description": "Clean, clutter-free aesthetic with neutral tones",
  "coverImageUrl": "https://gobuildgo.vn/themes/minimalist.jpg",
  "setupCount": 45,
  "popularColors": ["white", "black", "wood"],
  "recommendedComponents": [
    {
      "category": "desk",
      "components": [
        {
          "id": "comp_045",
          "name": "Secretlab MAGNUS Pro",
          "imageUrl": "https://gobuildgo.vn/images/magnus-pro.jpg",
          "lowestPrice": 18900000
        }
      ]
    },
    {
      "category": "chair",
      "components": [
        {
          "id": "comp_010",
          "name": "IKEA MARKUS",
          "imageUrl": "https://gobuildgo.vn/images/ikea-markus.jpg",
          "lowestPrice": 4990000
        }
      ]
    }
  ]
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 404 | `NOT_FOUND` | Theme "xyz" not found |

---

### POST /api/v1/themes/[slug]/apply

Apply a theme to the current user's setup. Returns suggested items.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | POST |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Theme slug |

**Request Body:**

```json
{
  "setupId": "setup_002",
  "budgetMax": 50000000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `setupId` | `string` | No | Existing setup to apply theme to |
| `budgetMax` | `number` | No | Maximum budget in VND |

**Success Response:** `200 OK`

```json
{
  "theme": "minimalist",
  "suggestedItems": [
    {
      "category": "desk",
      "recommended": {
        "id": "comp_045",
        "name": "Secretlab MAGNUS Pro",
        "imageUrl": "https://gobuildgo.vn/images/magnus-pro.jpg",
        "lowestPrice": 18900000,
        "reason": "Top-rated minimalist desk with cable management"
      },
      "alternatives": [
        {
          "id": "comp_046",
          "name": "IKEA BEKANT",
          "lowestPrice": 5990000
        }
      ]
    },
    {
      "category": "chair",
      "recommended": {
        "id": "comp_010",
        "name": "IKEA MARKUS",
        "imageUrl": "https://gobuildgo.vn/images/ikea-markus.jpg",
        "lowestPrice": 4990000,
        "reason": "Ergonomic and clean design"
      },
      "alternatives": []
    }
  ],
  "estimatedTotal": 35000000
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 404 | `NOT_FOUND` | Theme not found |
| 400 | `SETUP_NOT_FOUND` | Specified setup does not exist or is not yours |
| 401 | `UNAUTHENTICATED` | Authentication required |

---

## 7. Price & Affiliate Endpoints (v1)

### GET /api/v1/prices/compare

Compare prices across all shops for a component.

| Property | Value |
|----------|-------|
| **Auth Required** | No |
| **Rate Limit** | public (100/min) |
| **Method** | GET |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `component_id` | `string` | Yes | Component ID |

**Success Response:** `200 OK`

```json
{
  "componentId": "comp_001",
  "componentName": "Secretlab TITAN Evo 2022",
  "prices": [
    {
      "shop": "shopee",
      "shopLogo": "https://gobuildgo.vn/logos/shopee.png",
      "price": 12500000,
      "originalPrice": 13500000,
      "discount": 7,
      "currency": "VND",
      "url": "https://shopee.vn/...",
      "affiliateUrl": "https://shopee.vn/...",
      "inStock": true,
      "lastUpdated": "2026-06-18T08:00:00.000Z"
    },
    {
      "shop": "lazada",
      "shopLogo": "https://gobuildgo.vn/logos/lazada.png",
      "price": 12900000,
      "originalPrice": 12900000,
      "discount": 0,
      "currency": "VND",
      "url": "https://lazada.vn/...",
      "affiliateUrl": "https://lazada.vn/...",
      "inStock": true,
      "lastUpdated": "2026-06-17T14:00:00.000Z"
    },
    {
      "shop": "tiki",
      "shopLogo": "https://gobuildgo.vn/logos/tiki.png",
      "price": 13200000,
      "originalPrice": 14000000,
      "discount": 6,
      "currency": "VND",
      "url": "https://tiki.vn/...",
      "affiliateUrl": "https://tiki.vn/...",
      "inStock": false,
      "lastUpdated": "2026-06-16T10:00:00.000Z"
    }
  ],
  "lowestPrice": 12500000,
  "highestPrice": 13200000,
  "lastUpdated": "2026-06-18T08:00:00.000Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `MISSING_COMPONENT_ID` | Query parameter "component_id" is required |
| 404 | `NOT_FOUND` | Component not found |

---

### POST /api/v1/prices/refresh

Trigger a price refresh for a component (admin only).

| Property | Value |
|----------|-------|
| **Auth Required** | Yes (admin) |
| **Rate Limit** | admin (2000/min) |
| **Method** | POST |

**Request Body:**

```json
{
  "componentId": "comp_001",
  "shops": ["shopee", "lazada"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `componentId` | `string` | Yes | Component ID |
| `shops` | `string[]` | No | Specific shops to refresh (default: all) |

**Success Response:** `202 Accepted`

```json
{
  "message": "Price refresh queued",
  "jobId": "job_abc123",
  "componentId": "comp_001",
  "estimatedCompletion": "2026-06-18T10:05:00.000Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 403 | `FORBIDDEN` | Admin access required |
| 404 | `NOT_FOUND` | Component not found |

---

### POST /api/v1/affiliate/click

Track an affiliate link click. Fire-and-forget, async processing.

| Property | Value |
|----------|-------|
| **Auth Required** | No (but tracked if authenticated) |
| **Rate Limit** | public (100/min) |
| **Method** | POST |

**Request Body:**

```json
{
  "componentId": "comp_001",
  "shop": "shopee",
  "setupId": "setup_001",
  "referrer": "https://gobuildgo.vn/setups/setup_001"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `componentId` | `string` | Yes | Component ID |
| `shop` | `string` | Yes | Shop identifier |
| `setupId` | `string` | No | Setup context if clicked from a setup |
| `referrer` | `string` | No | Page URL where click originated |

**Success Response:** `204 No Content` (empty body)

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Missing required fields |
| 400 | `INVALID_SHOP` | Shop "xyz" is not recognized |

---

## 8. User Endpoints (v1)

### GET /api/v1/users/me

Get the current user's profile.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | GET |

**Success Response:** `200 OK`

```json
{
  "id": "usr_abc123",
  "name": "Nguyen Van A",
  "email": "nguyenvana@example.com",
  "image": "https://lh3.googleusercontent.com/...",
  "role": "user",
  "setupCount": 5,
  "favoriteCount": 12,
  "likeCount": 48,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "lastLoginAt": "2026-06-18T09:00:00.000Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHENTICATED` | Authentication required |

---

### PATCH /api/v1/users/me

Update the current user's profile.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | PATCH |

**Request Body:**

```json
{
  "name": "Nguyen Van An",
  "image": "https://lh3.googleusercontent.com/new-avatar.jpg"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | No | Display name (2-50 chars) |
| `image` | `string` | No | Profile image URL or base64 data URI |

**Success Response:** `200 OK` — Updated user profile object.

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Name must be between 2 and 50 characters |
| 401 | `UNAUTHENTICATED` | Authentication required |

---

### GET /api/v1/users/me/setups

Get the current user's setups.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | GET |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `20` | Items per page |
| `includePrivate` | `boolean` | `true` | Include private setups |

**Success Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "setup_002",
      "name": "My Dream Setup",
      "roomType": "gaming_room",
      "theme": "rgb",
      "isPublic": true,
      "totalPrice": 31400000,
      "itemCount": 2,
      "likeCount": 5,
      "createdAt": "2026-06-18T10:00:00.000Z",
      "updatedAt": "2026-06-18T10:00:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### GET /api/v1/users/me/favorites

Get the current user's favorited components.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | GET |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `20` | Items per page |

**Success Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "comp_001",
      "name": "Secretlab TITAN Evo 2022",
      "brand": "Secretlab",
      "category": "chair",
      "imageUrl": "https://gobuildgo.vn/images/secretlab-titan.jpg",
      "lowestPrice": 12500000,
      "favoritedAt": "2026-06-15T08:00:00.000Z"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### POST /api/v1/users/me/favorites/[componentId]

Toggle favorite status for a component.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | POST |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `componentId` | `string` | Component ID |

**Success Response:** `200 OK`

```json
{
  "favorited": true,
  "componentId": "comp_001"
}
```

When unfavoriting:

```json
{
  "favorited": false,
  "componentId": "comp_001"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 404 | `NOT_FOUND` | Component not found |
| 401 | `UNAUTHENTICATED` | Authentication required |

---

### GET /api/v1/users/me/affiliate-history

Get the current user's affiliate click history.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | GET |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `20` | Items per page |
| `from` | `string` | — | Start date (ISO 8601) |
| `to` | `string` | — | End date (ISO 8601) |

**Success Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "click_001",
      "componentId": "comp_001",
      "componentName": "Secretlab TITAN Evo 2022",
      "shop": "shopee",
      "clickedAt": "2026-06-18T08:30:00.000Z",
      "converted": false
    }
  ],
  "total": 34,
  "page": 1,
  "limit": 20,
  "totalPages": 2
}
```

---

### GET /api/v1/users/me/email-settings

Get email subscription settings.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | GET |

**Success Response:** `200 OK`

```json
{
  "priceAlerts": true,
  "newSetups": false,
  "weeklyDigest": true,
  "promotions": false,
  "priceAlertComponents": ["comp_001", "comp_045"]
}
```

---

### PATCH /api/v1/users/me/email-settings

Update email subscription settings.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | PATCH |

**Request Body:**

```json
{
  "priceAlerts": true,
  "newSetups": true,
  "weeklyDigest": true,
  "promotions": false,
  "priceAlertComponents": ["comp_001"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `priceAlerts` | `boolean` | No | Enable price drop alerts |
| `newSetups` | `boolean` | No | New setup notifications |
| `weeklyDigest` | `boolean` | No | Weekly summary email |
| `promotions` | `boolean` | No | Promotional emails |
| `priceAlertComponents` | `string[]` | No | Component IDs to watch (max 20) |

**Success Response:** `200 OK` — Updated settings object.

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `TOO_MANY_ALERTS` | Maximum 20 price alert components |
| 401 | `UNAUTHENTICATED` | Authentication required |

---

## 9. Upload Endpoints (v1)

### POST /api/v1/upload/room

Upload a room photo for AI analysis.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | POST |
| **Content-Type** | `multipart/form-data` |

**Request Body (multipart/form-data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | `File` | Yes | Image file (JPEG, PNG, or WebP; max 5MB) |

**Success Response:** `202 Accepted`

```json
{
  "id": "upload_abc123",
  "status": "pending",
  "message": "Room photo uploaded. AI analysis in progress.",
  "checkStatusUrl": "/api/v1/upload/room/upload_abc123/status",
  "estimatedCompletion": "2026-06-18T10:02:00.000Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `NO_FILE` | No file provided |
| 400 | `INVALID_TYPE` | Only JPEG, PNG, and WebP are supported |
| 400 | `FILE_TOO_LARGE` | File size exceeds 5MB limit |
| 401 | `UNAUTHENTICATED` | Authentication required |
| 429 | `UPLOAD_LIMIT` | Maximum 10 uploads per hour |

---

### GET /api/v1/upload/room/[id]/status

Check AI analysis status for an uploaded room photo.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes (upload owner) |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | GET |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Upload ID |

**Success Response:** `200 OK`

When still processing:

```json
{
  "id": "upload_abc123",
  "status": "processing",
  "progress": 65,
  "startedAt": "2026-06-18T10:00:30.000Z"
}
```

When completed:

```json
{
  "id": "upload_abc123",
  "status": "completed",
  "progress": 100,
  "startedAt": "2026-06-18T10:00:30.000Z",
  "completedAt": "2026-06-18T10:01:45.000Z",
  "resultUrl": "/api/v1/upload/room/upload_abc123/result"
}
```

When failed:

```json
{
  "id": "upload_abc123",
  "status": "failed",
  "error": "Unable to detect room boundaries",
  "failedAt": "2026-06-18T10:01:00.000Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 404 | `NOT_FOUND` | Upload not found |
| 403 | `FORBIDDEN` | This upload belongs to another user |

---

### GET /api/v1/upload/room/[id]/result

Get AI analysis result for a completed upload.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes (upload owner) |
| **Rate Limit** | authenticated (1000/min) |
| **Method** | GET |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Upload ID |

**Success Response:** `200 OK`

```json
{
  "id": "upload_abc123",
  "status": "completed",
  "roomDimensions": {
    "width": 320,
    "depth": 280,
    "height": 260,
    "unit": "cm",
    "confidence": 0.87
  },
  "detectedStyle": {
    "primary": "minimalist",
    "secondary": "modern",
    "confidence": 0.78
  },
  "detectedItems": [
    {
      "category": "desk",
      "boundingBox": { "x": 50, "y": 100, "width": 200, "height": 80 },
      "confidence": 0.92
    },
    {
      "category": "chair",
      "boundingBox": { "x": 80, "y": 180, "width": 60, "height": 70 },
      "confidence": 0.88
    }
  ],
  "suggestedItems": [
    {
      "category": "lighting",
      "reason": "No desk lamp detected; recommended for the detected minimalist style",
      "recommendedComponents": [
        {
          "id": "comp_120",
          "name": "Xiaomi Mi Desk Lamp Pro",
          "imageUrl": "https://gobuildgo.vn/images/xiaomi-lamp.jpg",
          "lowestPrice": 1290000
        }
      ]
    },
    {
      "category": "accessory",
      "reason": "Large desk surface detected without a desk mat",
      "recommendedComponents": [
        {
          "id": "comp_135",
          "name": "Glorious XXL Desk Mat",
          "imageUrl": "https://gobuildgo.vn/images/glorious-mat.jpg",
          "lowestPrice": 890000
        }
      ]
    }
  ],
  "analyzedAt": "2026-06-18T10:01:45.000Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 404 | `NOT_FOUND` | Upload not found |
| 403 | `FORBIDDEN` | This upload belongs to another user |
| 409 | `NOT_READY` | Analysis not yet complete, check status endpoint |

---

## 10. Admin Endpoints (v1)

All admin endpoints require `role: "admin"` and use the `admin` rate limit tier (2000/min).

### POST /api/v1/admin/components

Create a new component.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes (admin) |
| **Rate Limit** | admin (2000/min) |
| **Method** | POST |

**Request Body:**

```json
{
  "name": "Razer BlackWidow V4",
  "brand": "Razer",
  "category": "keyboard",
  "description": "Mechanical gaming keyboard with Razer Green switches",
  "imageUrl": "https://gobuildgo.vn/images/blackwidow-v4.jpg",
  "color": "Black",
  "styleTags": ["gaming", "rgb"],
  "specifications": {
    "switchType": "Razer Green",
    "layout": "Full-size",
    "connection": "USB-C",
    "backlight": "RGB"
  },
  "prices": [
    {
      "shop": "shopee",
      "price": 3990000,
      "url": "https://shopee.vn/..."
    }
  ]
}
```

**Success Response:** `201 Created` — Full component object.

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid component data |
| 403 | `FORBIDDEN` | Admin access required |
| 409 | `DUPLICATE` | Component with this name and brand already exists |

---

### PATCH /api/v1/admin/components/[id]

Update an existing component.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes (admin) |
| **Rate Limit** | admin (2000/min) |
| **Method** | PATCH |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Component ID |

**Request Body:** Same as POST, all fields optional.

**Success Response:** `200 OK` — Updated component object.

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 403 | `FORBIDDEN` | Admin access required |
| 404 | `NOT_FOUND` | Component not found |

---

### DELETE /api/v1/admin/components/[id]

Soft delete a component.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes (admin) |
| **Rate Limit** | admin (2000/min) |
| **Method** | DELETE |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Component ID |

**Success Response:** `200 OK`

```json
{
  "message": "Component deleted",
  "id": "comp_001",
  "deletedAt": "2026-06-18T10:00:00.000Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 403 | `FORBIDDEN` | Admin access required |
| 404 | `NOT_FOUND` | Component not found |

---

### POST /api/v1/admin/components/bulk

Bulk import components via JSON array.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes (admin) |
| **Rate Limit** | admin (2000/min) |
| **Method** | POST |

**Request Body:**

```json
{
  "components": [
    {
      "name": "Razer BlackWidow V4",
      "brand": "Razer",
      "category": "keyboard"
    },
    {
      "name": "Logitech G Pro X",
      "brand": "Logitech",
      "category": "audio"
    }
  ],
  "skipDuplicates": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `components` | `array` | Yes | Array of component objects (max 100) |
| `skipDuplicates` | `boolean` | No | Skip duplicates instead of erroring (default `true`) |

**Success Response:** `200 OK`

```json
{
  "imported": 2,
  "skipped": 0,
  "errors": [],
  "components": [
    { "id": "comp_new1", "name": "Razer BlackWidow V4" },
    { "id": "comp_new2", "name": "Logitech G Pro X" }
  ]
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `TOO_MANY` | Maximum 100 components per bulk import |
| 403 | `FORBIDDEN` | Admin access required |

---

### POST /api/v1/admin/scraper/run

Trigger the price scraper.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes (admin) |
| **Rate Limit** | admin (2000/min) |
| **Method** | POST |

**Request Body:**

```json
{
  "shops": ["shopee", "lazada"],
  "categories": ["chair", "desk"],
  "fullScan": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `shops` | `string[]` | No | Shops to scrape (default: all) |
| `categories` | `string[]` | No | Categories to scrape (default: all) |
| `fullScan` | `boolean` | No | Force re-scrape all prices (default: `false`) |

**Success Response:** `202 Accepted`

```json
{
  "message": "Scraper job queued",
  "jobId": "scrape_xyz",
  "estimatedCompletion": "2026-06-18T12:00:00.000Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 403 | `FORBIDDEN` | Admin access required |
| 409 | `ALREADY_RUNNING` | A scraper job is already in progress |

---

### GET /api/v1/admin/scraper/status

Get the last scraper run status.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes (admin) |
| **Rate Limit** | admin (2000/min) |
| **Method** | GET |

**Success Response:** `200 OK`

```json
{
  "lastRun": {
    "id": "scrape_xyz",
    "status": "completed",
    "startedAt": "2026-06-18T06:00:00.000Z",
    "completedAt": "2026-06-18T08:30:00.000Z",
    "shopsScraped": ["shopee", "lazada", "tiki"],
    "componentsUpdated": 1247,
    "errors": 3,
    "errorDetails": [
      { "shop": "tiki", "componentId": "comp_089", "error": "timeout" }
    ]
  },
  "nextScheduledRun": "2026-06-19T06:00:00.000Z"
}
```

---

### GET /api/v1/admin/stats

Get dashboard statistics.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes (admin) |
| **Rate Limit** | admin (2000/min) |
| **Method** | GET |

**Success Response:** `200 OK`

```json
{
  "totalUsers": 1245,
  "totalSetups": 892,
  "totalComponents": 347,
  "publicSetups": 654,
  "affiliateClicksToday": 128,
  "affiliateClicksThisMonth": 3420,
  "revenueEstimate": 850000,
  "revenueCurrency": "VND",
  "topCategories": [
    { "category": "chair", "setupCount": 412 },
    { "category": "desk", "setupCount": 389 },
    { "category": "monitor", "setupCount": 301 }
  ],
  "recentSignups": [
    {
      "id": "usr_new1",
      "name": "Le Thi B",
      "createdAt": "2026-06-18T09:00:00.000Z"
    }
  ]
}
```

---

### GET /api/v1/admin/users

List all users (paginated).

| Property | Value |
|----------|-------|
| **Auth Required** | Yes (admin) |
| **Rate Limit** | admin (2000/min) |
| **Method** | GET |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `20` | Items per page (max 100) |
| `role` | `string` | — | Filter by role: `user`, `admin` |
| `search` | `string` | — | Search by name or email |
| `sort` | `string` | `newest` | Sort: `newest`, `oldest`, `name_asc` |

**Success Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "usr_abc123",
      "name": "Nguyen Van A",
      "email": "nguyenvana@example.com",
      "role": "user",
      "setupCount": 5,
      "lastLoginAt": "2026-06-18T09:00:00.000Z",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "total": 1245,
  "page": 1,
  "limit": 20,
  "totalPages": 63
}
```

---

### GET /api/v1/admin/affiliate-report

Get affiliate click and conversion report.

| Property | Value |
|----------|-------|
| **Auth Required** | Yes (admin) |
| **Rate Limit** | admin (2000/min) |
| **Method** | GET |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `from` | `string` | 30 days ago | Start date (ISO 8601) |
| `to` | `string` | Today | End date (ISO 8601) |
| `shop` | `string` | — | Filter by shop |
| `groupBy` | `string` | `day` | Grouping: `day`, `week`, `month` |

**Success Response:** `200 OK`

```json
{
  "period": {
    "from": "2026-05-18",
    "to": "2026-06-18"
  },
  "summary": {
    "totalClicks": 3420,
    "uniqueUsers": 890,
    "estimatedConversions": 127,
    "estimatedRevenue": 850000,
    "currency": "VND"
  },
  "byShop": [
    {
      "shop": "shopee",
      "clicks": 2100,
      "estimatedConversions": 84,
      "estimatedRevenue": 520000
    },
    {
      "shop": "lazada",
      "clicks": 980,
      "estimatedConversions": 33,
      "estimatedRevenue": 280000
    },
    {
      "shop": "tiki",
      "clicks": 340,
      "estimatedConversions": 10,
      "estimatedRevenue": 50000
    }
  ],
  "daily": [
    {
      "date": "2026-06-18",
      "clicks": 128,
      "estimatedRevenue": 42000
    },
    {
      "date": "2026-06-17",
      "clicks": 145,
      "estimatedRevenue": 51000
    }
  ]
}
```

---

## 11. Common Patterns (All Versions)

### Pagination

All list endpoints return a paginated envelope:

```json
{
  "data": [],
  "total": 156,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data` | `array` | Result items for the current page |
| `total` | `number` | Total number of matching items |
| `page` | `number` | Current page (1-indexed) |
| `limit` | `number` | Items per page |
| `totalPages` | `number` | Total number of pages |

**Defaults:** `page=1`, `limit=20`, `max limit=100`

### Sorting

Sort is controlled via the `sort` query parameter. Common values:

| Value | Field | Direction |
|-------|-------|-----------|
| `popular` | Popularity score | Descending |
| `newest` | `createdAt` | Descending |
| `price_asc` | `lowestPrice` | Ascending |
| `price_desc` | `lowestPrice` | Descending |
| `name_asc` | `name` | Ascending |
| `most_liked` | `likeCount` | Descending |
| `total_price_asc` | `totalPrice` | Ascending |
| `total_price_desc` | `totalPrice` | Descending |

### Error Format

All errors use a consistent structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": []
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | Machine-readable error code (UPPER_SNAKE_CASE) |
| `message` | `string` | Human-readable description |
| `details` | `array` | Optional array of field-level errors |

**Common Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHENTICATED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |

### HTTP Status Codes

| Code | Usage |
|------|-------|
| `200` | Successful GET, PATCH, DELETE |
| `201` | Successful POST (resource created) |
| `202` | Accepted (async processing started) |
| `204` | No content (e.g., fire-and-forget) |
| `400` | Bad request / validation error |
| `401` | Unauthenticated |
| `403` | Forbidden (insufficient permissions) |
| `404` | Resource not found |
| `409` | Conflict |
| `429` | Rate limited |
| `500` | Internal server error |

### CORS

The API allows requests from:

- `https://gobuildgo.vn`
- `https://www.gobuildgo.vn`
- `https://staging.gobuildgo.vn`

### Currency

All prices are in **VND (Vietnamese Dong)** unless otherwise specified. No decimal places — VND is a zero-decimal currency.

---

## 12. Zod Validation Schemas (v1)

Below are the Zod schemas for all request validations. These are used in Next.js API route handlers with a validation middleware.

```typescript
import { z } from "zod";

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

const CATEGORIES = [
  "desk", "chair", "monitor", "keyboard", "mouse",
  "lighting", "decor", "audio", "accessory",
] as const;

const ROOM_TYPES = [
  "bedroom", "office", "studio", "gaming_room",
] as const;

const STYLE_TAGS = [
  "minimalist", "gaming", "rgb", "vintage", "modern", "cozy", "professional",
] as const;

const SHOPS = [
  "shopee", "lazada", "tiki", "phongvu", "gearvn", "nhaxinh",
] as const;

const SORT_OPTIONS_COMPONENTS = [
  "popular", "price_asc", "price_desc", "newest", "name_asc",
] as const;

const SORT_OPTIONS_SETUPS = [
  "popular", "newest", "total_price_asc", "total_price_desc", "most_liked",
] as const;

// =============================================================================
// PAGINATION SCHEMA (reused across list endpoints)
// =============================================================================

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// =============================================================================
// COMPONENT SCHEMAS
// =============================================================================

// =============================================================================
// AUTH SCHEMAS
// =============================================================================

const authProviderEnum = z.enum(["google", "facebook"]);

const signInOAuthSchema = z.object({
  provider: authProviderEnum,
  redirect: z.string().url().optional(),
  csrfToken: z.string().min(1),
});

const signInCredentialsSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  redirect: z.string().url().optional(),
  csrfToken: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Must contain uppercase, lowercase, and number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().max(255),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Must contain uppercase, lowercase, and number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// =============================================================================
// COMPONENT SCHEMAS (continued)
// =============================================================================

const componentFilterSchema = paginationSchema.extend({
  category: z.enum(CATEGORIES).optional(),
  min_price: z.coerce.number().int().min(0).optional(),
  max_price: z.coerce.number().int().min(0).optional(),
  brand: z.string().min(1).max(100).optional(),
  color: z.string().min(1).max(50).optional(),
  style_tag: z.enum(STYLE_TAGS).optional(),
  q: z.string().min(2).max(200).optional(),
  sort: z.enum(SORT_OPTIONS_COMPONENTS).default("popular"),
});

const componentPriceHistorySchema = z.object({
  shop: z.enum(SHOPS).optional(),
  days: z.coerce.number().int().min(1).max(90).default(30),
});

const componentSimilarSchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(6),
});

const componentSearchSchema = paginationSchema.extend({
  q: z.string().min(2).max(200),
  category: z.enum(CATEGORIES).optional(),
});

// =============================================================================
// SETUP SCHEMAS
// =============================================================================

const positionSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  z: z.number().optional(),
});

const setupItemSchema = z.object({
  componentId: z.string().min(1),
  quantity: z.number().int().min(1).max(20).default(1),
  position: positionSchema.optional(),
});

const setupDimensionsSchema = z.object({
  width: z.number().positive(),
  depth: z.number().positive(),
  height: z.number().positive(),
  unit: z.enum(["cm", "m", "in"]).default("cm"),
});

const setupCreateSchema = z.object({
  name: z.string().min(3).max(100),
  slug: z.string().min(3).max(300).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  roomType: z.enum(ROOM_TYPES),
  roomDimensions: setupDimensionsSchema.optional(),
  theme: z.string().min(1).max(50).optional(),
  isPublic: z.boolean().default(false),
  items: z.array(setupItemSchema).max(50).default([]),
});

const setupUpdateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  slug: z.string().min(3).max(300).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  roomType: z.enum(ROOM_TYPES).optional(),
  roomDimensions: setupDimensionsSchema.optional(),
  theme: z.string().min(1).max(50).optional(),
  isPublic: z.boolean().optional(),
  items: z.array(setupItemSchema).max(50).optional(),
});

const setupFilterSchema = paginationSchema.extend({
  room_type: z.enum(ROOM_TYPES).optional(),
  theme: z.string().min(1).max(50).optional(),
  budget_min: z.coerce.number().int().min(0).optional(),
  budget_max: z.coerce.number().int().min(0).optional(),
  sort: z.enum(SORT_OPTIONS_SETUPS).default("popular"),
});

const setupCloneSchema = z.object({
  name: z.string().min(3).max(100).optional(),
});

const setupExportSchema = z.object({
  format: z.enum(["png", "jpg"]).default("png"),
  width: z.coerce.number().int().min(100).max(2400).default(1200),
});

// =============================================================================
// THEME SCHEMAS
// =============================================================================

const themeApplySchema = z.object({
  setupId: z.string().min(1).optional(),
  budgetMax: z.number().positive().optional(),
});

// =============================================================================
// PRICE SCHEMAS
// =============================================================================

const priceCompareSchema = z.object({
  component_id: z.string().min(1),
});

const priceRefreshSchema = z.object({
  componentId: z.string().min(1),
  shops: z.array(z.enum(SHOPS)).optional(),
});

const affiliateClickSchema = z.object({
  componentId: z.string().min(1),
  shop: z.enum(SHOPS),
  setupId: z.string().min(1).optional(),
  referrer: z.string().url().max(500).optional(),
});

// =============================================================================
// USER SCHEMAS
// =============================================================================

const userProfileUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  image: z.string().max(5000).optional(), // URL or base64 data URI
});

const userFavoritesFilterSchema = paginationSchema;

const userAffiliateHistorySchema = paginationSchema.extend({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const emailSettingsSchema = z.object({
  priceAlerts: z.boolean().optional(),
  newSetups: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  promotions: z.boolean().optional(),
  priceAlertComponents: z.array(z.string()).max(20).optional(),
});

// =============================================================================
// ADMIN SCHEMAS
// =============================================================================

const adminComponentCreateSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().min(1).max(100),
  category: z.enum(CATEGORIES),
  description: z.string().max(5000).optional(),
  imageUrl: z.string().url().optional(),
  color: z.string().max(50).optional(),
  styleTags: z.array(z.enum(STYLE_TAGS)).default([]),
  specifications: z.record(z.string()).optional(),
  prices: z.array(z.object({
    shop: z.enum(SHOPS),
    price: z.number().int().positive(),
    url: z.string().url(),
  })).optional(),
});

const adminComponentUpdateSchema = adminComponentCreateSchema.partial();

const adminComponentBulkSchema = z.object({
  components: z.array(adminComponentCreateSchema).max(100),
  skipDuplicates: z.boolean().default(true),
});

const adminScraperRunSchema = z.object({
  shops: z.array(z.enum(SHOPS)).optional(),
  categories: z.array(z.enum(CATEGORIES)).optional(),
  fullScan: z.boolean().default(false),
});

const adminUserFilterSchema = paginationSchema.extend({
  role: z.enum(["user", "admin"]).optional(),
  search: z.string().min(1).max(100).optional(),
  sort: z.enum(["newest", "oldest", "name_asc"]).default("newest"),
});

const adminAffiliateReportSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  shop: z.enum(SHOPS).optional(),
  groupBy: z.enum(["day", "week", "month"]).default("day"),
});

// =============================================================================
// AUTH SCHEMAS
// =============================================================================

const signinSchema = z.object({
  provider: z.enum(["google", "facebook", "github"]),
  redirect: z.string().url().optional(),
  csrfToken: z.string().min(1),
});

const signoutSchema = z.object({
  redirect: z.string().url().optional(),
  csrfToken: z.string().min(1),
});
```

---

## Endpoint Summary Table

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| POST | `/api/v1/auth/signin` | No | public | Sign in with provider |
| POST | `/api/v1/auth/signout` | Yes | authenticated | Sign out |
| GET | `/api/v1/auth/session` | No | public | Get current session |
| GET | `/api/v1/auth/providers` | No | public | List auth providers |
| GET | `/api/v1/auth/csrf` | No | public | Get CSRF token |
| GET | `/api/v1/components` | No | public | List components |
| GET | `/api/v1/components/[id]` | No | public | Get component detail |
| GET | `/api/v1/components/[id]/prices` | No | public | Price history |
| GET | `/api/v1/components/[id]/similar` | No | public | Similar components |
| GET | `/api/v1/components/search` | No | public | Full-text search |
| GET | `/api/v1/setups` | No | public | List public setups |
| POST | `/api/v1/setups` | Yes | authenticated | Create setup |
| GET | `/api/v1/setups/[id]` | No* | public | Get setup detail |
| PATCH | `/api/v1/setups/[id]` | Yes (owner) | authenticated | Update setup |
| DELETE | `/api/v1/setups/[id]` | Yes (owner) | authenticated | Delete setup |
| POST | `/api/v1/setups/[id]/clone` | Yes | authenticated | Clone setup |
| GET | `/api/v1/setups/[id]/export` | No | public | Export setup image |
| POST | `/api/v1/setups/[id]/like` | Yes | authenticated | Toggle like |
| GET | `/api/v1/setups/[id]/likes` | No | public | Get like count |
| GET | `/api/v1/themes` | No | public | List themes |
| GET | `/api/v1/themes/[slug]` | No | public | Theme detail |
| POST | `/api/v1/themes/[slug]/apply` | Yes | authenticated | Apply theme |
| GET | `/api/v1/prices/compare` | No | public | Compare prices |
| POST | `/api/v1/prices/refresh` | Admin | admin | Trigger price refresh |
| POST | `/api/v1/affiliate/click` | No | public | Track affiliate click |
| GET | `/api/v1/users/me` | Yes | authenticated | Get profile |
| PATCH | `/api/v1/users/me` | Yes | authenticated | Update profile |
| GET | `/api/v1/users/me/setups` | Yes | authenticated | My setups |
| GET | `/api/v1/users/me/favorites` | Yes | authenticated | My favorites |
| POST | `/api/v1/users/me/favorites/[id]` | Yes | authenticated | Toggle favorite |
| GET | `/api/v1/users/me/affiliate-history` | Yes | authenticated | Click history |
| GET | `/api/v1/users/me/email-settings` | Yes | authenticated | Get email settings |
| PATCH | `/api/v1/users/me/email-settings` | Yes | authenticated | Update email settings |
| POST | `/api/v1/upload/room` | Yes | authenticated | Upload room photo |
| GET | `/api/v1/upload/room/[id]/status` | Yes (owner) | authenticated | Check analysis status |
| GET | `/api/v1/upload/room/[id]/result` | Yes (owner) | authenticated | Get analysis result |
| POST | `/api/v1/admin/components` | Admin | admin | Create component |
| PATCH | `/api/v1/admin/components/[id]` | Admin | admin | Update component |
| DELETE | `/api/v1/admin/components/[id]` | Admin | admin | Delete component |
| POST | `/api/v1/admin/components/bulk` | Admin | admin | Bulk import |
| POST | `/api/v1/admin/scraper/run` | Admin | admin | Run scraper |
| GET | `/api/v1/admin/scraper/status` | Admin | admin | Scraper status |
| GET | `/api/v1/admin/stats` | Admin | admin | Dashboard stats |
| GET | `/api/v1/admin/users` | Admin | admin | List users |
| GET | `/api/v1/admin/affiliate-report` | Admin | admin | Affiliate report |

\* Private setups require authentication and ownership.
