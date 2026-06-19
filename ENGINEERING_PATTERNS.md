# gobuildgo — Engineering Patterns Document

> **Version**: 1.0
> **Last Updated**: 2026-06-18
> **Status**: Reference Architecture
> **Language**: TypeScript / Pseudocode

---

## Table of Contents

1. [Auth Patterns](#1-auth-patterns)
2. [Style Engine Architecture](#2-style-engine-architecture)
3. [Price Scraping Pipeline](#3-price-scraping-pipeline)
4. [Caching Architecture](#4-caching-architecture)
5. [Affiliate Link System](#5-affiliate-link-system)
6. [Error Handling Strategy](#6-error-handling-strategy)
7. [Testing Strategy](#7-testing-strategy)
8. [Performance Patterns](#8-performance-patterns)
9. [Security Patterns](#9-security-patterns)

---

## 1. Auth Patterns

### 1.1 NextAuth.js Configuration

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password_hash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );

        if (!valid) return null;

        // Check email verification
        if (!user.email_verified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
```

### 1.2 Registration Flow

```typescript
// src/server/actions/auth.ts
"use server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export async function register(data: {
  name: string;
  email: string;
  password: string;
}) {
  // Check existing
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) throw new Error("EMAIL_EXISTS");

  // Hash password (bcrypt, cost 12)
  const password_hash = await bcrypt.hash(data.password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password_hash,
      auth_provider: "credentials",
    },
  });

  // Generate verification token
  const token = crypto.randomUUID();
  await prisma.verificationToken.create({
    data: {
      identifier: data.email,
      token,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    },
  });

  // Send verification email via Resend
  await sendVerificationEmail(data.email, token);

  return { id: user.id, name: user.name, email: user.email };
}
```

### 1.3 Email Verification

```typescript
export async function verifyEmail(token: string) {
  const verification = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verification || verification.expires < new Date()) {
    throw new Error("INVALID_TOKEN");
  }

  await prisma.user.update({
    where: { email: verification.identifier },
    data: { email_verified: new Date() },
  });

  await prisma.verificationToken.delete({ where: { token } });
}
```

### 1.4 Password Reset Flow

```typescript
export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Don't reveal if email exists

  const token = crypto.randomUUID();
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + 60 * 60 * 1000), // 1h
    },
  });

  await sendPasswordResetEmail(email, token);
}

export async function resetPassword(token: string, newPassword: string) {
  const verification = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verification || verification.expires < new Date()) {
    throw new Error("INVALID_TOKEN");
  }

  const password_hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { email: verification.identifier },
    data: { password_hash },
  });

  await prisma.verificationToken.delete({ where: { token } });
}
```

### 1.5 Email Templates (Resend)

```typescript
// src/lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const FROM = process.env.RESEND_FROM_EMAIL;

export async function sendVerificationEmail(email: string, token: string) {
  await resend.emails.send({
    FROM,
    to: email,
    subject: "Verify your gobuildgo account",
    html: `
      <h1>Welcome to gobuildgo!</h1>
      <p>Click the link below to verify your email:</p>
      <a href="${APP_URL}/verify-email?token=${token}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  await resend.emails.send({
    FROM,
    to: email,
    subject: "Reset your gobuildgo password",
    html: `
      <h1>Password Reset</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${APP_URL}/reset-password?token=${token}">Reset Password</a>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  });
}
```

### 1.6 Sign-In Rate Limiting

```typescript
// src/lib/rate-limit.ts — applied to credentials sign-in
const signInAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkSignInRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = signInAttempts.get(identifier);

  if (!record || now > record.resetAt) {
    signInAttempts.set(identifier, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }

  if (record.count >= 5) return false;

  record.count++;
  return true;
}
```

---

## 2. Style Engine Architecture

The style engine evaluates a desk setup across four dimensions — color harmony, theme consistency, space fit, and budget balance — producing a weighted composite score with actionable suggestions and warnings.

### 1.1 Core Types

```typescript
// ─── Color Types ───────────────────────────────────────────────────────────────
interface HSL {
  h: number; // 0-360 hue
  s: number; // 0-100 saturation
  l: number; // 0-100 lightness
}

interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

// ─── Style Result Types ────────────────────────────────────────────────────────
interface StyleResult {
  score: number;             // 0-100 final weighted score
  colorHarmony: number;      // 0-100
  themeConsistency: number;  // 0-100
  spaceFit: number;          // 0-100
  budgetBalance: number;     // 0-100
  suggestions: string[];
  warnings: StyleWarning[];
}

interface StyleWarning {
  type: 'color' | 'theme' | 'space' | 'budget';
  severity: 'error' | 'warning' | 'info';
  message: string;
  messageVi: string;
  componentId?: string;
}

// ─── Input Types ────────────────────────────────────────────────────────────────
interface StyleInput {
  items: SetupItem[];
  theme: ThemeConfig;
  roomDimensions: RoomDimensions;
  deskDimensions: DeskDimensions;
  budget: number;            // VND
  totalCost: number;         // VND
}

interface SetupItem {
  componentId: string;
  name: string;
  colors: HSL[];            // primary colors of the item
  tags: string[];
  footprint: { width: number; depth: number }; // cm
  cost: number;             // VND
}

interface RoomDimensions {
  width: number;   // cm
  depth: number;   // cm
  height: number;  // cm (used for vertical clearance checks)
}

interface DeskDimensions {
  width: number;   // cm
  depth: number;   // cm
  height: number;  // cm
}

interface ThemeConfig {
  slug: string;
  name: string;
  nameVi: string;
  allowedColors: HSL[];     // reference palette
  bannedTags: string[];
  requiredTags: string[];
  description?: string;
}

// ─── Plugin Architecture ───────────────────────────────────────────────────────
interface ScoringPlugin {
  name: string;
  weight: number;
  score(input: StyleInput): Promise<number>;
}

interface StyleEngine {
  registerPlugin(plugin: ScoringPlugin): void;
  evaluate(input: StyleInput): Promise<StyleResult>;
}
```

### 1.2 Color Harmony Algorithm

Uses HSL color space to compute a harmony score (0-100) based on the relationship between all item colors in the setup.

```typescript
// ─── Color Conversion Utilities ────────────────────────────────────────────────
function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// ─── Hue Distance Calculation ──────────────────────────────────────────────────
function hueDistance(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2);
  return Math.min(diff, 360 - diff); // shortest arc on color wheel
}

// ─── Harmony Classification ────────────────────────────────────────────────────
type HarmonyType = 'monochromatic' | 'analogic' | 'complementary' | 'triadic' | 'clashing';

function classifyRelationship(colors: HSL[]): HarmonyType {
  if (colors.length < 2) return 'monochromatic';

  const hues = colors.map(c => c.h);
  const saturations = colors.map(c => c.s);
  const lightnesses = colors.map(c => c.l);

  // Check monochromatic: all hues within 15 degrees
  const maxHueSpread = Math.max(...hues.map(h => {
    return Math.max(...hues.map(h2 => hueDistance(h, h2)));
  }));
  if (maxHueSpread <= 15) return 'monochromatic';

  // Check analogic: all hues within 30 degrees of each other
  if (maxHueSpread <= 30) return 'analogic';

  // Check complementary: at least one pair ~180 degrees apart
  for (let i = 0; i < hues.length; i++) {
    for (let j = i + 1; j < hues.length; j++) {
      if (Math.abs(hueDistance(hues[i], hues[j]) - 180) <= 15) {
        return 'complementary';
      }
    }
  }

  // Check triadic: at least 2 pairs ~120 degrees apart
  let triadicPairs = 0;
  for (let i = 0; i < hues.length; i++) {
    for (let j = i + 1; j < hues.length; j++) {
      if (Math.abs(hueDistance(hues[i], hues[j]) - 120) <= 15) {
        triadicPairs++;
      }
    }
  }
  if (triadicPairs >= 2) return 'triadic';

  return 'clashing';
}

// ─── Harmony Score Calculation ─────────────────────────────────────────────────
function calculateColorHarmony(colors: HSL[]): number {
  if (colors.length === 0) return 50; // neutral
  if (colors.length === 1) return 100; // single color is always harmonious

  const relationship = classifyRelationship(colors);
  const saturations = colors.map(c => c.s);
  const lightnesses = colors.map(c => c.l);

  // Base score by relationship type
  const baseScores: Record<HarmonyType, number> = {
    monochromatic: 95,
    analogic: 85,
    complementary: 75,
    triadic: 70,
    clashing: 30,
  };

  let score = baseScores[relationship];

  // Penalize high variance in saturation (jarring contrast)
  const satVariance = variance(saturations);
  if (satVariance > 50) score -= 10;
  if (satVariance > 100) score -= 10;

  // Penalize high variance in lightness (unless intentional contrast)
  const lightVariance = variance(lightnesses);
  if (lightVariance > 60) score -= 5;

  // Bonus for 2-4 colors (sweet spot for setups)
  if (colors.length >= 2 && colors.length <= 4) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

function variance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
}
```

### 1.3 Theme Consistency Rules Engine

```typescript
// ─── Theme Definitions (JSON Config) ──────────────────────────────────────────
// File: src/config/themes.json
const THEMES: ThemeConfig[] = [
  {
    slug: 'japandi',
    name: 'Japandi',
    nameVi: 'Nhật Bản - Bắc Âu',
    allowedColors: [
      { h: 0, s: 0, l: 100 },    // white
      { h: 40, s: 20, l: 85 },   // beige
      h: 30, s: 40, l: 50 },   // wood
      { h: 0, s: 0, l: 0 },      // black
      { h: 140, s: 20, l: 60 },  // sage
    ],
    bannedTags: ['rgb', 'gaming', 'neon'],
    requiredTags: [],
  },
  {
    slug: 'industrial',
    name: 'Industrial',
    nameVi: 'Công nghiệp',
    allowedColors: [
      { h: 0, s: 0, l: 0 },      // black
      { h: 0, s: 0, l: 50 },     // gray
      { h: 15, s: 60, l: 40 },   // rust
      { h: 25, s: 50, l: 35 },   // brown
    ],
    bannedTags: ['pastel', 'cute', 'kawaii'],
    requiredTags: [],
  },
  {
    slug: 'minimalist',
    name: 'Minimalist',
    nameVi: 'Tối giản',
    allowedColors: [
      { h: 0, s: 0, l: 100 },    // white
      { h: 0, s: 0, l: 0 },      // black
      { h: 0, s: 0, l: 50 },     // gray
      { h: 30, s: 40, l: 50 },   // wood
    ],
    bannedTags: ['rgb', 'colorful', 'clutter'],
    requiredTags: [],
  },
  {
    slug: 'gaming-rgb',
    name: 'Gaming RGB',
    nameVi: 'Gaming RGB',
    allowedColors: [
      { h: 0, s: 0, l: 0 },      // black
      // any color allowed (rgb is the point)
    ],
    bannedTags: [],
    requiredTags: ['rgb', 'gaming'],
  },
  {
    slug: 'retro',
    name: 'Retro',
    nameVi: 'Cổ điển',
    allowedColors: [
      { h: 45, s: 30, l: 90 },   // cream
      { h: 25, s: 80, l: 55 },   // orange
      { h: 25, s: 50, l: 35 },   // brown
      { h: 140, s: 40, l: 40 },  // green
    ],
    bannedTags: [],
    requiredTags: ['vintage', 'retro'],
  },
  {
    slug: 'scandinavian',
    name: 'Scandinavian',
    nameVi: 'Bắc Âu',
    allowedColors: [
      { h: 0, s: 0, l: 100 },    // white
      { h: 35, s: 30, l: 75 },   // light wood
      { h: 200, s: 20, l: 80 },  // pastel blue
      { h: 340, s: 20, l: 85 },  // pastel pink
    ],
    bannedTags: ['dark', 'heavy'],
    requiredTags: [],
  },
];

// ─── Color Similarity Check ────────────────────────────────────────────────────
function colorDistance(c1: HSL, c2: HSL): number {
  const hDist = hueDistance(c1.h, c2.h) / 180; // normalize to 0-1
  const sDist = Math.abs(c1.s - c2.s) / 100;
  const lDist = Math.abs(c1.l - c2.l) / 100;
  return (hDist * 0.5) + (sDist * 0.25) + (lDist * 0.25);
}

function isColorAllowed(itemColor: HSL, allowedColors: HSL[]): boolean {
  // Special case: gaming-rgb allows any color
  if (allowedColors.length === 1 && allowedColors[0].l === 0) {
    return true; // wildcard
  }
  const threshold = 0.3; // tolerance
  return allowedColors.some(allowed => colorDistance(itemColor, allowed) < threshold);
}

// ─── Theme Scoring ─────────────────────────────────────────────────────────────
function calculateThemeConsistency(items: SetupItem[], theme: ThemeConfig): number {
  if (items.length === 0) return 50;

  let mismatches = 0;
  const warnings: StyleWarning[] = [];

  for (const item of items) {
    // Check banned tags
    const hasBannedTag = item.tags.some(tag => theme.bannedTags.includes(tag));
    if (hasBannedTag) {
      mismatches++;
      warnings.push({
        type: 'theme',
        severity: 'warning',
        message: `${item.name} has banned tags for ${theme.name} theme`,
        messageVi: `${item.name} có thẻ bị cấm cho chủ đề ${theme.nameVi}`,
        componentId: item.componentId,
      });
    }

    // Check colors against allowed palette
    const allColorsAllowed = item.colors.every(c => isColorAllowed(c, theme.allowedColors));
    if (!allColorsAllowed) {
      mismatches++;
      warnings.push({
        type: 'color',
        severity: 'warning',
        message: `${item.name} colors don't match ${theme.name} palette`,
        messageVi: `Màu sắc của ${item.name} không phù hợp với bảng màu ${theme.nameVi}`,
        componentId: item.componentId,
      });
    }
  }

  // Check required tags (at least some items must have them)
  if (theme.requiredTags.length > 0) {
    const hasRequiredTag = items.some(item =>
      item.tags.some(tag => theme.requiredTags.includes(tag))
    );
    if (!hasRequiredTag) {
      mismatches += 2; // heavier penalty for missing required tags
      warnings.push({
        type: 'theme',
        severity: 'error',
        message: `Setup missing required tags: ${theme.requiredTags.join(', ')}`,
        messageVi: `Thiếu thẻ bắt buộc: ${theme.requiredTags.join(', ')}`,
      });
    }
  }

  // Score: 100 - 20 per mismatch, floor at 0
  const score = Math.max(0, 100 - (mismatches * 20));
  return score;
}
```

### 1.4 Space Fitting Algorithm

```typescript
// ─── Space Fitting ─────────────────────────────────────────────────────────────
interface Placement {
  componentId: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  rotated: boolean;
}

function calculateSpaceFit(
  items: SetupItem[],
  room: RoomDimensions,
  desk: DeskDimensions,
): { score: number; placements: Placement[]; warnings: StyleWarning[] } {
  const warnings: StyleWarning[] = [];
  const CHAIR_CLEARANCE = 60; // cm on all sides

  // Step 1: Check desk fits in room with clearance
  const requiredWidth = desk.width + CHAIR_CLEARANCE * 2;
  const requiredDepth = desk.depth + CHAIR_CLEARANCE * 2;

  if (requiredWidth > room.width || requiredDepth > room.depth) {
    return {
      score: 0,
      placements: [],
      warnings: [{
        type: 'space',
        severity: 'error',
        message: `Desk (${desk.width}x${desk.depth}cm) doesn't fit in room (${room.width}x${room.depth}cm) with ${CHAIR_CLEARANCE}cm clearance`,
        messageVi: `Bàn (${desk.width}x${desk.depth}cm) không vừa trong phòng (${room.width}x${room.depth}cm) với khoảng trống ${CHAIR_CLEARANCE}cm`,
      }],
    };
  }

  // Step 2: Check total item footprint vs desk surface
  const deskArea = desk.width * desk.depth;
  const totalItemArea = items.reduce((sum, item) => {
    return sum + (item.footprint.width * item.footprint.depth);
  }, 0);

  if (totalItemArea > deskArea) {
    return {
      score: 0,
      placements: [],
      warnings: [{
        type: 'space',
        severity: 'error',
        message: `Items footprint (${totalItemArea}cm²) exceeds desk surface (${deskArea}cm²)`,
        messageVi: `Tổng diện tích đồ (${totalItemArea}cm²) vượt quá mặt bàn (${deskArea}cm²)`,
      }],
    };
  }

  // Step 3: Bin packing — First-Fit Decreasing
  const placements = binPack(items, desk.width, desk.depth);

  // Step 4: Calculate score
  const utilizationRatio = totalItemArea / deskArea;
  let score: number;

  if (utilizationRatio <= 0.5) {
    score = 100; // plenty of room
  } else if (utilizationRatio <= 0.7) {
    score = 85; // good balance
  } else if (utilizationRatio <= 0.85) {
    score = 65; // getting crowded
  } else if (utilizationRatio <= 1.0) {
    score = 40; // tight fit
  } else {
    score = 0; // impossible (shouldn't reach here due to earlier check)
  }

  // Bonus for successful placement of all items
  if (placements.length === items.length) {
    score = Math.min(100, score + 5);
  }

  return { score, placements, warnings };
}

// ─── First-Fit Decreasing Bin Packing ─────────────────────────────────────────
function binPack(items: SetupItem[], binW: number, binD: number): Placement[] {
  // Sort by area descending (largest first)
  const sorted = [...items].sort((a, b) => {
    const areaA = a.footprint.width * a.footprint.depth;
    const areaB = b.footprint.width * b.footprint.depth;
    return areaB - areaA;
  });

  const placements: Placement[] = [];
  const occupied: { x: number; y: number; w: number; d: number }[] = [];

  for (const item of sorted) {
    const w = item.footprint.width;
    const d = item.footprint.depth;

    const placement = findFirstFit(occupied, w, d, binW, binD);
    if (placement) {
      placements.push({
        componentId: item.componentId,
        x: placement.x,
        y: placement.y,
        width: placement.w,
        depth: placement.d,
        rotated: placement.rotated,
      });
      occupied.push({ x: placement.x, y: placement.y, w: placement.w, d: placement.d });
    }
    // If no fit found, item is skipped (caller handles warning)
  }

  return placements;
}

function findFirstFit(
  occupied: { x: number; y: number; w: number; d: number }[],
  w: number,
  d: number,
  binW: number,
  binD: number,
): { x: number; y: number; w: number; d: number; rotated: boolean } | null {
  // Try both orientations
  const orientations = [
    { w, d, rotated: false },
    { w: d, d: w, rotated: true },
  ];

  for (const orient of orientations) {
    // Scan left-to-right, top-to-bottom in 1cm increments
    for (let y = 0; y <= binD - orient.d; y++) {
      for (let x = 0; x <= binW - orient.w; x++) {
        const fits = !occupied.some(rect => {
          return !(
            x + orient.w <= rect.x ||
            x >= rect.x + rect.w ||
            y + orient.d <= rect.y ||
            y >= rect.y + rect.d
          );
        });

        if (fits) {
          return { x, y, w: orient.w, d: orient.d, rotated: orient.rotated };
        }
      }
    }
  }

  return null;
}
```

### 1.5 Budget Balance

```typescript
function calculateBudgetBalance(totalCost: number, budget: number): number {
  if (budget <= 0) return 100; // no budget constraint

  const ratio = totalCost / budget;

  if (ratio <= 1.0) {
    return 100; // within budget
  } else if (ratio <= 1.2) {
    // Linear decrease from 100 to 0 between 100% and 120% of budget
    return Math.round(100 - ((ratio - 1.0) / 0.2) * 100);
  } else {
    return 0; // over 120% of budget
  }
}
```

### 1.6 Weighted Scoring Formula

```typescript
// ─── Final Score Calculation ───────────────────────────────────────────────────
function calculateFinalScore(
  colorHarmony: number,
  themeConsistency: number,
  spaceFit: number,
  budgetBalance: number,
): number {
  const finalScore =
    colorHarmony * 0.35 +
    themeConsistency * 0.35 +
    spaceFit * 0.20 +
    budgetBalance * 0.10;

  return Math.round(Math.max(0, Math.min(100, finalScore)));
}

// ─── Style Engine Main Entry Point ─────────────────────────────────────────────
class StyleEngine {
  private plugins: ScoringPlugin[] = [];

  registerPlugin(plugin: ScoringPlugin): void {
    this.plugins.push(plugin);
  }

  async evaluate(input: StyleInput): Promise<StyleResult> {
    const colorHarmony = calculateColorHarmony(
      input.items.flatMap(item => item.colors)
    );

    const themeScore = calculateThemeConsistency(input.items, input.theme);
    const { score: spaceFit, warnings: spaceWarnings } = calculateSpaceFit(
      input.items, input.roomDimensions, input.deskDimensions
    );
    const budgetBalance = calculateBudgetBalance(input.totalCost, input.budget);

    const score = calculateFinalScore(colorHarmony, themeScore, spaceFit, budgetBalance);

    // Run plugins for extensibility
    for (const plugin of this.plugins) {
      const pluginScore = await plugin.score(input);
      // Plugins can adjust the score via their declared weight
      // Implementation depends on plugin contract
    }

    // Generate suggestions based on weak areas
    const suggestions = generateSuggestions(colorHarmony, themeScore, spaceFit, budgetBalance);
    const warnings = [...spaceWarnings];

    if (budgetBalance < 50) {
      warnings.push({
        type: 'budget',
        severity: 'warning',
        message: `Setup exceeds budget by ${((input.totalCost / input.budget - 1) * 100).toFixed(0)}%`,
        messageVi: `Bộ setup vượt ngân sách ${((input.totalCost / input.budget - 1) * 100).toFixed(0)}%`,
      });
    }

    return {
      score,
      colorHarmony,
      themeConsistency: themeScore,
      spaceFit,
      budgetBalance,
      suggestions,
      warnings,
    };
  }
}

function generateSuggestions(
  colorHarmony: number,
  themeConsistency: number,
  spaceFit: number,
  budgetBalance: number,
): string[] {
  const suggestions: string[] = [];

  if (colorHarmony < 60) {
    suggestions.push('Consider using colors from the same color family for a more cohesive look');
  }
  if (themeConsistency < 60) {
    suggestions.push('Some items conflict with the selected theme — try swapping for items that match better');
  }
  if (spaceFit < 60) {
    suggestions.push('The desk is getting crowded — consider a larger desk or removing some items');
  }
  if (budgetBalance < 50) {
    suggestions.push('Setup exceeds budget — look for more affordable alternatives');
  }

  return suggestions;
}
```

### 1.7 Extensibility — JSON Config & Plugin System

```typescript
// ─── Theme Loader (JSON-driven) ────────────────────────────────────────────────
// Themes are defined in src/config/themes.json and loaded at startup.
// Adding a new theme requires only a JSON entry — no code changes.

class ThemeLoader {
  private themes: Map<string, ThemeConfig> = new Map();

  async loadThemes(configPath: string): Promise<void> {
    const raw = await readFile(configPath, 'utf-8');
    const themes: ThemeConfig[] = JSON.parse(raw);
    for (const theme of themes) {
      this.themes.set(theme.slug, theme);
    }
  }

  getTheme(slug: string): ThemeConfig | undefined {
    return this.themes.get(slug);
  }

  getAllThemes(): ThemeConfig[] {
    return Array.from(this.themes.values());
  }
}

// ─── Plugin Registration Example ────────────────────────────────────────────────
const engine = new StyleEngine();

// Register a custom "minimalism" plugin that penalizes too many items
engine.registerPlugin({
  name: 'minimalism-bonus',
  weight: 0.1,
  score(input: StyleInput): Promise<number> {
    if (input.theme.slug === 'minimalist' && input.items.length > 5) {
      return Math.max(0, 100 - (input.items.length - 5) * 10);
    }
    return 100;
  },
});
```

---

## 2. Price Scraping Pipeline

### 2.1 Strategy Pattern

```typescript
// ─── Scraper Interface ─────────────────────────────────────────────────────────
interface Scraper {
  name: string;
  baseUrl: string;
  rateLimit: number; // requests per second

  search(query: string): Promise<RawProduct[]>;
  getProduct(url: string): Promise<RawProduct>;
  normalize(raw: RawProduct): NormalizedProduct;
}

interface RawProduct {
  // Generic raw data structure — scraper-specific
  [key: string]: unknown;
}

interface NormalizedProduct {
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  currency: string;        // 'VND'
  url: string;
  shopName: string;
  imageUrl: string;
  isAvailable: boolean;
  scrapedAt: Date;
  scraperName: string;
}

// ─── Shopee Implementation ─────────────────────────────────────────────────────
class ShopeeScraper implements Scraper {
  name = 'Shopee';
  baseUrl = 'https://shopee.vn';
  rateLimit = 1; // 1 request per second

  async search(query: string): Promise<RawProduct[]> {
    const url = `${this.baseUrl}/api/v4/search/search_items?keyword=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GobuildgoBot/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new ExternalApiError('Shopee', new Error(`HTTP ${response.status}`));
    }

    const data = await response.json();
    return data.items || [];
  }

  async getProduct(url: string): Promise<RawProduct> {
    // Extract item ID from URL
    const match = url.match(/\/(\d+)\?/);
    if (!match) throw new Error('Invalid Shopee URL');

    const itemUrl = `${this.baseUrl}/api/v2/item/get?itemid=${match[1]}`;
    const response = await fetch(itemUrl);
    return response.json();
  }

  normalize(raw: RawProduct): NormalizedProduct {
    return {
      name: raw.item_basic?.name || '',
      brand: raw.item_basic?.brand_name || 'Unknown',
      price: (raw.item_basic?.price || 0) / 100000, // Shopee uses price * 100000
      originalPrice: raw.item_basic?.original_price
        ? raw.item_basic.original_price / 100000
        : undefined,
      currency: 'VND',
      url: `${this.baseUrl}/product/${raw.item_basic?.shopid}/${raw.item_basic?.itemid}`,
      shopName: raw.item_basic?.shop_name || 'Shopee Seller',
      imageUrl: `https://cf.shopee.vn/file/${raw.item_basic?.image}`,
      isAvailable: raw.item_basic?.status === 0, // 0 = available
      scrapedAt: new Date(),
      scraperName: this.name,
    };
  }
}

// ─── Lazada Implementation ─────────────────────────────────────────────────────
class LazadaScraper implements Scraper {
  name = 'Lazada';
  baseUrl = 'https://www.lazada.vn';
  rateLimit = 2; // 2 requests per second

  async search(query: string): Promise<RawProduct[]> {
    const url = `${this.baseUrl}/catalog/?q=${encodeURIComponent(query)}`;
    // Lazada often requires scraping HTML or using their affiliate API
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GobuildgoBot/1.0)' },
    });

    if (!response.ok) {
      throw new ExternalApiError('Lazada', new Error(`HTTP ${response.status}`));
    }

    const html = await response.text();
    return parseLazadaHTML(html);
  }

  async getProduct(url: string): Promise<RawProduct> {
    const response = await fetch(url);
    const html = await response.text();
    return parseLazadaProductPage(html);
  }

  normalize(raw: RawProduct): NormalizedProduct {
    return {
      name: raw.name || '',
      brand: raw.brand || 'Unknown',
      price: parseFloat(raw.price?.replace(/[,.]/g, '') || '0'),
      originalPrice: raw.originalPrice
        ? parseFloat(raw.originalPrice.replace(/[,.]/g, ''))
        : undefined,
      currency: 'VND',
      url: raw.url || '',
      shopName: raw.sellerName || 'Lazada Seller',
      imageUrl: raw.imageUrl || '',
      isAvailable: raw.stock > 0,
      scrapedAt: new Date(),
      scraperName: this.name,
    };
  }
}

// ─── Tiki Implementation ───────────────────────────────────────────────────────
class TikiScraper implements Scraper {
  name = 'Tiki';
  baseUrl = 'https://tiki.vn';
  rateLimit = 1; // 1 request per second

  async search(query: string): Promise<RawProduct[]> {
    const url = `${this.baseUrl}/api/v2/products?limit=20&include=advertisement&keyword=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GobuildgoBot/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new ExternalApiError('Tiki', new Error(`HTTP ${response.status}`));
    }

    const data = await response.json();
    return data.data || [];
  }

  async getProduct(url: string): Promise<RawProduct> {
    const match = url.match(/\/p(\d+)/);
    if (!match) throw new Error('Invalid Tiki URL');

    const apiUrl = `${this.baseUrl}/api/v2/products/${match[1]}`;
    const response = await fetch(apiUrl);
    return response.json();
  }

  normalize(raw: RawProduct): NormalizedProduct {
    return {
      name: raw.name || '',
      brand: raw.brand?.name || 'Unknown',
      price: raw.price || 0,
      originalPrice: raw.original_price,
      currency: 'VND',
      url: `${this.baseUrl}/${raw.url_path || raw.url_key}.html`,
      shopName: raw.seller?.name || 'Tiki Seller',
      imageUrl: raw.thumbnail_url || '',
      isAvailable: raw.inventory?.status === 'in_stock',
      scrapedAt: new Date(),
      scraperName: this.name,
    };
  }
}

// ─── Scraper Registry ──────────────────────────────────────────────────────────
class ScraperRegistry {
  private scrapers: Map<string, Scraper> = new Map();

  register(scraper: Scraper): void {
    this.scrapers.set(scraper.name, scraper);
  }

  get(name: string): Scraper | undefined {
    return this.scrapers.get(name);
  }

  getAll(): Scraper[] {
    return Array.from(this.scrapers.values());
  }
}

// Usage
const registry = new ScraperRegistry();
registry.register(new ShopeeScraper());
registry.register(new LazadaScraper());
registry.register(new TikiScraper());
```

### 2.2 Rate Limiting — Token Bucket Algorithm

```typescript
// ─── Token Bucket Rate Limiter ─────────────────────────────────────────────────
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per second

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async consume(tokens: number = 1): Promise<void> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return;
    }

    // Wait until enough tokens are available
    const waitTime = ((tokens - this.tokens) / this.refillRate) * 1000;
    await sleep(waitTime);
    this.refill();
    this.tokens -= tokens;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// ─── Rate Limiter Manager (per-scraper + shared) ───────────────────────────────
class RateLimiterManager {
  private limiters: Map<string, TokenBucket> = new Map();
  private sharedLimiter: TokenBucket;

  constructor() {
    // Shared bucket: max 5 req/s across all scrapers to avoid overwhelming shops
    this.sharedLimiter = new TokenBucket(5, 5);
  }

  registerScraper(name: string, rateLimit: number): void {
    this.limiters.set(name, new TokenBucket(rateLimit, rateLimit));
  }

  async acquire(scraperName: string): Promise<void> {
    const scraperLimiter = this.limiters.get(scraperName);
    if (!scraperLimiter) throw new Error(`Unknown scraper: ${scraperName}`);

    // Acquire from both per-scraper and shared bucket
    await Promise.all([
      scraperLimiter.consume(1),
      this.sharedLimiter.consume(1),
    ]);
  }
}

// ─── Usage in Pipeline ─────────────────────────────────────────────────────────
const rateLimiters = new RateLimiterManager();
rateLimiters.registerScraper('Shopee', 1);
rateLimiters.registerScraper('Lazada', 2);
rateLimiters.registerScraper('Tiki', 1);

async function fetchWithRateLimit(
  scraper: Scraper,
  query: string,
): Promise<NormalizedProduct[]> {
  await rateLimiters.acquire(scraper.name);
  const rawProducts = await scraper.search(query);
  return rawProducts.map(p => scraper.normalize(p));
}
```

### 2.3 Retry Logic

```typescript
// ─── Exponential Backoff with Jitter ───────────────────────────────────────────
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;       // ms
  maxDelay: number;        // ms
  jitterRange: number;     // ms (0 to this value)
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 4,
  baseDelay: 1000,
  maxDelay: 30000,
  jitterRange: 500,
};

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY,
  context?: { scraper?: string; product?: string },
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === config.maxRetries) {
        // Log final failure
        console.error(`[Retry] Max retries reached for ${context?.scraper || 'unknown'}`, {
          error: lastError.message,
          context,
        });
        throw lastError;
      }

      // Calculate delay: baseDelay * 2^attempt + random jitter
      const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * config.jitterRange;
      const delay = Math.min(exponentialDelay + jitter, config.maxDelay);

      console.warn(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
        error: lastError.message,
        context,
      });

      await sleep(delay);
    }
  }

  throw lastError; // unreachable but satisfies TypeScript
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Usage ─────────────────────────────────────────────────────────────────────
async function scrapeWithRetry(scraper: Scraper, query: string): Promise<NormalizedProduct[]> {
  return withRetry(
    () => scraper.search(query),
    DEFAULT_RETRY,
    { scraper: scraper.name, product: query },
  );
}
```

### 2.4 Failure Handling

```typescript
// ─── Scraper Pipeline with Failure Handling ───────────────────────────────────
class ScrapingPipeline {
  private registry: ScraperRegistry;
  private rateLimiters: RateLimiterManager;
  private failureCounts: Map<string, number> = new Map();

  constructor(registry: ScraperRegistry, rateLimiters: RateLimiterManager) {
    this.registry = registry;
    this.rateLimiters = rateLimiters;
  }

  async searchAll(query: string): Promise<NormalizedProduct[]> {
    const scrapers = this.registry.getAll();
    const results = await Promise.allSettled(
      scrapers.map(scraper => this.searchSingle(scraper, query))
    );

    const products: NormalizedProduct[] = [];

    for (let i = 0; i < scrapers.length; i++) {
      const result = results[i];
      const scraperName = scrapers[i].name;

      if (result.status === 'fulfilled') {
        products.push(...result.value);
        this.failureCounts.set(scraperName, 0); // reset on success
      } else {
        const count = (this.failureCounts.get(scraperName) || 0) + 1;
        this.failureCounts.set(scraperName, count);

        console.error(`[Pipeline] ${scraperName} failed:`, result.reason);

        if (count >= 3) {
          // Alert: scraper failed 3 consecutive times
          await this.alertScraperFailure(scraperName, result.reason);
        }
      }
    }

    return products;
  }

  private async searchSingle(scraper: Scraper, query: string): Promise<NormalizedProduct[]> {
    await this.rateLimiters.acquire(scraper.name);
    const rawProducts = await withRetry(() => scraper.search(query));
    return rawProducts.map(p => scraper.normalize(p));
  }

  private async alertScraperFailure(scraperName: string, reason: unknown): Promise<void> {
    // Send alert via Sentry / Discord webhook / email
    console.error(`[ALERT] ${scraperName} failed 3 consecutive times:`, reason);
  }
}
```

---

## 3. Caching Architecture

### 3.1 Multi-Level Cache

```typescript
// ─── Cache Interface ───────────────────────────────────────────────────────────
interface CacheLayer {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// ─── L1: In-Memory Cache ───────────────────────────────────────────────────────
class MemoryCache implements CacheLayer {
  private store: Map<string, { value: unknown; expiresAt: number }> = new Map();
  private maxEntries: number;

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) this.store.delete(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }
}

// ─── L2: Redis Cache (Upstash) ─────────────────────────────────────────────────
class RedisCache implements CacheLayer {
  private client: Redis; // ioredis or @upstash/redis

  constructor(redisUrl: string, token: string) {
    this.client = new Redis({ url: redisUrl, token });
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    // Use SCAN to avoid blocking Redis
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor, 'MATCH', pattern, 'COUNT', 100
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } while (cursor !== '0');
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }
}

// ─── L3: CDN Cache (Cloudflare) ────────────────────────────────────────────────
// CDN caching is controlled via HTTP headers, not explicit API calls.
// Cache-Control headers are set on responses from API routes.

function setCdnCacheHeaders(response: Response, ttlSeconds: number): Response {
  response.headers.set('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=86400`);
  return response;
}

// ─── Multi-Level Cache Manager ─────────────────────────────────────────────────
class CacheManager {
  private l1: MemoryCache;
  private l2: RedisCache;

  constructor(l1: MemoryCache, l2: RedisCache) {
    this.l1 = l1;
    this.l2 = l2;
  }

  async get<T>(key: string): Promise<T | null> {
    // Try L1 first
    const l1Value = await this.l1.get<T>(key);
    if (l1Value !== null) return l1Value;

    // Try L2
    const l2Value = await this.l2.get<T>(key);
    if (l2Value !== null) {
      // Backfill L1
      await this.l1.set(key, l2Value, 300); // 5 min in L1
      return l2Value;
    }

    return null;
  }

  async set(key: string, value: unknown, l1Ttl: number, l2Ttl: number): Promise<void> {
    await Promise.all([
      this.l1.set(key, value, l1Ttl),
      this.l2.set(key, value, l2Ttl),
    ]);
  }

  async invalidate(key: string): Promise<void> {
    await Promise.all([
      this.l1.delete(key),
      this.l2.delete(key),
    ]);
  }

  // Stale-while-revalidate pattern
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    l1Ttl: number,
    l2Ttl: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await fetcher();
    await this.set(key, fresh, l1Ttl, l2Ttl);
    return fresh;
  }
}
```

### 3.2 Cache Key Patterns

```typescript
// ─── Cache Key Builder ─────────────────────────────────────────────────────────
const CacheKeys = {
  component: (id: string) => `component:${id}`,
  componentsListing: (category: string, page: number, limit: number) =>
    `components:cat:${category}:p:${page}:l:${limit}`,
  prices: (componentId: string) => `prices:component:${componentId}`,
  setup: (id: string) => `setup:${id}`,
  themesAll: () => 'themes:all',
  theme: (slug: string) => `theme:${slug}`,
  session: (token: string) => `session:${token}`,
  rateLimit: (ip: string, endpoint: string) => `rate:${ip}:${endpoint}`,
} as const;

// TTL Constants (seconds)
const TTL = {
  L1: {
    THEMES: 3600,       // 1 hour
    RULES: 3600,        // 1 hour
    CONSTANTS: 3600,    // 1 hour
  },
  L2: {
    PRICES: 21600,      // 6 hours
    LISTINGS: 3600,     // 1 hour
    SESSIONS: 3600,     // 1 hour
  },
  L3: {
    STATIC: 86400,      // 24 hours
    IMAGES: 604800,     // 7 days
  },
} as const;
```

### 3.3 Invalidation Strategy

```typescript
// ─── Cache Invalidation Service ────────────────────────────────────────────────
class CacheInvalidationService {
  private cache: CacheManager;

  constructor(cache: CacheManager) {
    this.cache = cache;
  }

  // Event-based invalidation
  async onPriceUpdate(componentId: string): Promise<void> {
    await this.cache.invalidate(CacheKeys.prices(componentId));
    // Also invalidate listings that might contain this component
    await this.cache.l2.deletePattern('components:cat:*');
  }

  async onComponentUpdate(componentId: string): Promise<void> {
    await this.cache.invalidate(CacheKeys.component(componentId));
    await this.cache.invalidate(CacheKeys.prices(componentId));
    await this.cache.l2.deletePattern('components:cat:*');
    await this.cache.l2.deletePattern('themes:*');
  }

  async onSetupUpdate(setupId: string): Promise<void> {
    await this.cache.invalidate(CacheKeys.setup(setupId));
  }

  // Cache warming: pre-populate after scraper run
  async warmPopularComponents(componentIds: string[]): Promise<void> {
    for (const id of componentIds) {
      // Fetch fresh data and populate cache
      const prices = await fetchLatestPrices(id);
      await this.cache.set(
        CacheKeys.prices(id),
        prices,
        TTL.L1.PRICES,
        TTL.L2.PRICES,
      );
    }
  }
}
```

---

## 4. Affiliate Link System

### 4.1 Link Template System

```typescript
// ─── Affiliate Configuration ──────────────────────────────────────────────────
interface AffiliateTemplate {
  shop: string;
  baseUrl: string;
  affiliateId: string;
  template: string;  // "https://shopee.vn/product/{shopId}/{productId}?affiliate={id}"
  sign: boolean;     // whether to HMAC-sign
}

interface AffiliateConfig {
  templates: AffiliateTemplate[];
  signingSecret: string;
  rotationEnabled: boolean; // A/B testing
}

// ─── Link Generator ────────────────────────────────────────────────────────────
class AffiliateLinkGenerator {
  private config: AffiliateConfig;

  constructor(config: AffiliateConfig) {
    this.config = config;
  }

  generate(
    shop: string,
    productId: string,
    shopId: string,
    options?: { setupId?: string; userId?: string },
  ): string {
    const template = this.config.templates.find(t => t.shop === shop);
    if (!template) throw new Error(`No template for shop: ${shop}`);

    let url = template.template
      .replace('{productId}', productId)
      .replace('{shopId}', shopId)
      .replace('{id}', template.affiliateId);

    // Append tracking params
    const params = new URLSearchParams();
    if (options?.setupId) params.set('ref', `setup_${options.setupId}`);
    if (options?.userId) params.set('uid', options.userId);
    url += (url.includes('?') ? '&' : '?') + params.toString();

    if (template.sign) {
      const signature = this.signUrl(url);
      url += `&sig=${signature}`;
    }

    return url;
  }

  private signUrl(url: string): string {
    const hmac = crypto.createHmac('sha256', this.config.signingSecret);
    hmac.update(url);
    return hmac.digest('hex').substring(0, 16); // truncate for shorter URLs
  }

  verifySignature(url: string, signature: string): boolean {
    const expected = this.signUrl(url);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  }
}
```

### 4.2 Click Tracking

```typescript
// ─── Click Tracking Service ────────────────────────────────────────────────────
interface AffiliateClick {
  id: string;
  componentId: string;
  shop: string;
  setupId?: string;
  userId?: string;
  timestamp: Date;
  referrer?: string;
  ip?: string;
  userAgent?: string;
  conversionTracked: boolean;
}

class AffiliateClickTracker {
  private db: PrismaClient;
  private queue: Queue; // BullMQ or similar async queue

  constructor(db: PrismaClient, queue: Queue) {
    this.db = db;
    this.queue = queue;
  }

  // Fire-and-forget: don't block the redirect response
  async trackClick(click: Omit<AffiliateClick, 'id' | 'timestamp' | 'conversionTracked'>): Promise<void> {
    // Use setImmediate to ensure response is not delayed
    setImmediate(async () => {
      try {
        await this.queue.add('track-click', {
          ...click,
          id: crypto.randomUUID(),
          timestamp: new Date(),
          conversionTracked: false,
        });
      } catch (error) {
        // Log but don't fail — click tracking is non-critical
        console.error('[Affiliate] Failed to queue click:', error);
      }
    });
  }

  // Worker processes the queue
  async processClick(job: Job<AffiliateClick>): Promise<void> {
    const click = job.data;

    await this.db.affiliateClick.create({
      data: {
        id: click.id,
        componentId: click.componentId,
        shop: click.shop,
        setupId: click.setupId,
        userId: click.userId,
        timestamp: click.timestamp,
        referrer: click.referrer,
        ip: click.ip,
        userAgent: click.userAgent,
        conversionTracked: false,
      },
    });
  }
}

// ─── API Route: Track Click ────────────────────────────────────────────────────
// POST /api/v1/affiliate/track
export async function trackAffiliateClick(request: Request): Promise<Response> {
  const body = await request.json();
  const { componentId, shop, setupId, userId, sig } = body;

  // Verify signature
  const generator = getAffiliateLinkGenerator();
  if (!generator.verifySignature(body.url, sig)) {
    return Response.json({ error: 'Invalid signature' }, { status: 403 });
  }

  // Track asynchronously
  const tracker = getClickTracker();
  await tracker.trackClick({
    componentId,
    shop,
    setupId,
    userId,
    referrer: request.headers.get('referer') || undefined,
    ip: request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
  });

  return Response.json({ success: true });
}
```

### 4.3 A/B Testing — Shop Rotation

```typescript
// ─── Shop Rotation Service ─────────────────────────────────────────────────────
class ShopRotationService {
  private db: PrismaClient;

  constructor(db: PrismaClient) {
    this.db = db;
  }

  // Get the best shop for a component based on conversion rate
  async getBestShop(componentId: string): Promise<string | null> {
    const stats = await this.db.affiliateClick.groupBy({
      by: ['shop'],
      where: { componentId },
      _count: { id: true },
    });

    if (stats.length === 0) return null;

    // Get conversion rates (clicks that led to purchase)
    const conversions = await this.db.affiliateConversion.groupBy({
      by: ['shop'],
      where: { componentId },
      _count: { id: true },
    });

    // Calculate conversion rate per shop
    const rates = stats.map(s => {
      const conversion = conversions.find(c => c.shop === s.shop);
      const clicks = s._count.id;
      const convs = conversion?._count.id || 0;
      return {
        shop: s.shop,
        rate: clicks > 0 ? convs / clicks : 0,
      };
    });

    // Sort by conversion rate descending
    rates.sort((a, b) => b.rate - a.rate);

    // 80% of time use best shop, 20% explore others (epsilon-greedy)
    if (Math.random() < 0.8 || rates.length === 1) {
      return rates[0].shop;
    }

    // Random exploration
    const idx = Math.floor(Math.random() * rates.length);
    return rates[idx].shop;
  }
}
```

---

## 5. Error Handling Strategy

### 5.1 Custom Error Classes

```typescript
// ─── Base Error Class ──────────────────────────────────────────────────────────
class AppError extends Error {
  code: string;
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes operational errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Validation Error ──────────────────────────────────────────────────────────
class ValidationError extends AppError {
  details: ZodIssue[];

  constructor(issues: ZodIssue[]) {
    super('Validation failed', 'VALIDATION_ERROR', 400);
    this.details = issues;
  }
}

// ─── Not Found Error ───────────────────────────────────────────────────────────
class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
  }
}

// ─── External API Error ────────────────────────────────────────────────────────
class ExternalApiError extends AppError {
  service: string;
  originalError: Error;

  constructor(service: string, error: Error) {
    super(`External API error from ${service}: ${error.message}`, 'EXTERNAL_API_ERROR', 502);
    this.service = service;
    this.originalError = error;
  }
}

// ─── Rate Limit Error ──────────────────────────────────────────────────────────
class RateLimitError extends AppError {
  retryAfter: number;

  constructor(retryAfter: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_ERROR', 429);
    this.retryAfter = retryAfter;
  }
}

// ─── Authentication Error ──────────────────────────────────────────────────────
class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

// ─── Authorization Error ───────────────────────────────────────────────────────
class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}
```

### 5.2 API Error Response Format

```typescript
// ─── Error Response Builder ────────────────────────────────────────────────────
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

function createErrorResponse(error: AppError): ErrorResponse {
  const response: ErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
    },
  };

  if (error instanceof ValidationError) {
    response.error.details = error.details;
  }

  return response;
}

// ─── Global Error Handler Middleware ───────────────────────────────────────────
async function globalErrorHandler(
  error: Error,
  req: Request,
  res: Response,
): Promise<void> {
  // Log to Sentry
  Sentry.captureException(error, {
    tags: { route: req.url },
    user: { id: (req as any).userId },
  });

  if (error instanceof AppError) {
    const status = error.statusCode;
    const body = createErrorResponse(error);

    if (error instanceof RateLimitError) {
      res.setHeader('Retry-After', error.retryAfter.toString());
    }

    res.status(status).json(body);
    return;
  }

  // Unknown error — don't leak details
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
```

### 5.3 Global Error Boundary (Next.js)

```tsx
// ─── error.tsx — Route Segment Error Boundary ──────────────────────────────────
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="error-container">
      <h2>Something went wrong!</h2>
      <p>Đã xảy ra lỗi. Vui lòng thử lại.</p>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}

// ─── global-error.tsx — Critical Error Boundary ────────────────────────────────
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

### 5.4 Graceful Degradation

```typescript
// ─── Graceful Degradation Helpers ──────────────────────────────────────────────

// Price fetch fails → show last known price with timestamp
async function getComponentPrice(componentId: string): Promise<{
  price: number | null;
  lastUpdated?: Date;
  isStale: boolean;
}> {
  try {
    const fresh = await fetchFreshPrice(componentId);
    return { price: fresh.price, lastUpdated: fresh.timestamp, isStale: false };
  } catch {
    const cached = await cache.get<{ price: number; timestamp: Date }>(
      CacheKeys.prices(componentId)
    );
    if (cached) {
      return {
        price: cached.price,
        lastUpdated: cached.timestamp,
        isStale: true,
      };
    }
    return { price: null, isStale: true };
  }
}

// Scraper fails → serve cached data with banner
async function getComponentListings(category: string): Promise<{
  data: NormalizedProduct[];
  isStale: boolean;
  banner?: { message: string; messageVi: string };
}> {
  try {
    const fresh = await scrapingPipeline.searchAll(category);
    return { data: fresh, isStale: false };
  } catch {
    const cached = await cache.get<NormalizedProduct[]>(
      CacheKeys.componentsListing(category, 1, 20)
    );
    return {
      data: cached || [],
      isStale: true,
      banner: {
        message: 'Showing cached data — prices may be outdated',
        messageVi: 'Đang hiển thị dữ liệu lưu trữ — giá có thể đã cũ',
      },
    };
  }
}

// AI analysis fails → show manual form
async function analyzeRoom(imageUrl: string): Promise<RoomAnalysisResult> {
  try {
    return await aiService.analyze(imageUrl);
  } catch (error) {
    return {
      status: 'manual_required',
      message: 'AI analysis unavailable. Please describe your room manually.',
      messageVi: 'Phân tích AI không khả dụng. Vui lòng mô tả phòng của bạn.',
      manualForm: true,
    };
  }
}
```

---

## 6. Testing Strategy

### 6.1 Unit Tests (Vitest)

```typescript
// ─── Color Harmony Tests ───────────────────────────────────────────────────────
// File: src/lib/style/__tests__/color-harmony.test.ts
import { describe, it, expect } from 'vitest';
import { calculateColorHarmony, classifyRelationship, rgbToHsl } from '../color-harmony';

describe('Color Harmony', () => {
  it('should return 100 for single color', () => {
    const result = calculateColorHarmony([{ h: 180, s: 50, l: 50 }]);
    expect(result).toBe(100);
  });

  it('should classify monochromatic colors', () => {
    const colors = [
      { h: 200, s: 50, l: 40 },
      { h: 205, s: 60, l: 50 },
      { h: 195, s: 40, l: 45 },
    ];
    expect(classifyRelationship(colors)).toBe('monochromatic');
  });

  it('should classify analogic colors (within 30 degrees)', () => {
    const colors = [
      { h: 200, s: 50, l: 40 },
      { h: 220, s: 60, l: 50 },
    ];
    expect(classifyRelationship(colors)).toBe('analogic');
  });

  it('should classify complementary colors (180 degrees apart)', () => {
    const colors = [
      { h: 0, s: 80, l: 50 },    // red
      { h: 180, s: 80, l: 50 },  // cyan
    ];
    expect(classifyRelationship(colors)).toBe('complementary');
  });

  it('should classify triadic colors (120 degrees apart)', () => {
    const colors = [
      { h: 0, s: 80, l: 50 },    // red
      { h: 120, s: 80, l: 50 },  // green
      { h: 240, s: 80, l: 50 },  // blue
    ];
    expect(classifyRelationship(colors)).toBe('triadic');
  });

  it('should penalize clashing colors', () => {
    const colors = [
      { h: 0, s: 100, l: 50 },
      { h: 30, s: 100, l: 50 },
      { h: 200, s: 100, l: 50 },
      { h: 280, s: 100, l: 50 },
    ];
    const score = calculateColorHarmony(colors);
    expect(score).toBeLessThan(50);
  });

  it('should convert RGB to HSL correctly', () => {
    const hsl = rgbToHsl({ r: 255, g: 0, b: 0 });
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });
});

// ─── Theme Consistency Tests ───────────────────────────────────────────────────
// File: src/lib/style/__tests__/theme-consistency.test.ts
describe('Theme Consistency', () => {
  it('should score 100 for items matching Japandi theme', () => {
    const items: SetupItem[] = [
      {
        componentId: '1',
        name: 'Oak Desk',
        colors: [{ h: 30, s: 40, l: 50 }],
        tags: ['wood', 'minimal'],
        footprint: { width: 120, depth: 60 },
        cost: 2000000,
      },
    ];
    const theme = THEMES.find(t => t.slug === 'japandi')!;
    const score = calculateThemeConsistency(items, theme);
    expect(score).toBe(100);
  });

  it('should deduct 20 per banned tag mismatch', () => {
    const items: SetupItem[] = [
      {
        componentId: '1',
        name: 'RGB Keyboard',
        colors: [{ h: 0, s: 0, l: 0 }],
        tags: ['rgb', 'gaming'],
        footprint: { width: 45, depth: 15 },
        cost: 1500000,
      },
    ];
    const theme = THEMES.find(t => t.slug === 'japandi')!;
    const score = calculateThemeConsistency(items, theme);
    expect(score).toBe(80); // -20 for 'rgb' banned tag
  });

  it('should require required tags for Gaming RGB theme', () => {
    const items: SetupItem[] = [
      {
        componentId: '1',
        name: 'Black Monitor',
        colors: [{ h: 0, s: 0, l: 0 }],
        tags: ['monitor', 'display'],
        footprint: { width: 60, depth: 20 },
        cost: 5000000,
      },
    ];
    const theme = THEMES.find(t => t.slug === 'gaming-rgb')!;
    const score = calculateThemeConsistency(items, theme);
    expect(score).toBeLessThan(60); // -40 for missing required tags
  });
});

// ─── Space Fitting Tests ───────────────────────────────────────────────────────
// File: src/lib/style/__tests__/space-fitting.test.ts
describe('Space Fitting', () => {
  it('should return 0 when desk does not fit in room', () => {
    const result = calculateSpaceFit(
      [],
      { width: 100, depth: 100, height: 200 },
      { width: 120, depth: 60, height: 75 },
    );
    expect(result.score).toBe(0);
    expect(result.warnings[0].severity).toBe('error');
  });

  it('should return 100 for empty desk in large room', () => {
    const result = calculateSpaceFit(
      [],
      { width: 400, depth: 400, height: 280 },
      { width: 140, depth: 60, height: 75 },
    );
    expect(result.score).toBe(100);
  });

  it('should fit multiple items on desk', () => {
    const items: SetupItem[] = [
      { componentId: '1', name: 'Monitor', colors: [], tags: [], footprint: { width: 60, depth: 20 }, cost: 0 },
      { componentId: '2', name: 'Keyboard', colors: [], tags: [], footprint: { width: 45, depth: 15 }, cost: 0 },
      { componentId: '3', name: 'Mouse', colors: [], tags: [], footprint: { width: 10, depth: 6 }, cost: 0 },
    ];
    const result = calculateSpaceFit(
      items,
      { width: 400, depth: 400, height: 280 },
      { width: 140, depth: 60, height: 75 },
    );
    expect(result.placements.length).toBe(3);
    expect(result.score).toBeGreaterThan(50);
  });
});

// ─── Budget Balance Tests ──────────────────────────────────────────────────────
describe('Budget Balance', () => {
  it('should return 100 when within budget', () => {
    expect(calculateBudgetBalance(8000000, 10000000)).toBe(100);
  });

  it('should return 50 at 110% of budget', () => {
    expect(calculateBudgetBalance(11000000, 10000000)).toBe(50);
  });

  it('should return 0 at 120% of budget', () => {
    expect(calculateBudgetBalance(12000000, 10000000)).toBe(0);
  });

  it('should return 0 beyond 120% of budget', () => {
    expect(calculateBudgetBalance(15000000, 10000000)).toBe(0);
  });
});

// ─── Final Score Tests ─────────────────────────────────────────────────────────
describe('Final Score', () => {
  it('should calculate weighted score correctly', () => {
    const score = calculateFinalScore(80, 90, 70, 100);
    // 80*0.35 + 90*0.35 + 70*0.20 + 100*0.10 = 28 + 31.5 + 14 + 10 = 83.5
    expect(score).toBe(84); // rounded
  });
});
```

### 6.2 Integration Tests

```typescript
// ─── API Route Integration Tests ───────────────────────────────────────────────
// File: src/app/api/v1/__tests__/components.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer } from '@/test/utils/server';
import { seedTestDatabase, cleanupTestDatabase } from '@/test/utils/database';

describe('Components API', () => {
  let server: TestServer;

  beforeAll(async () => {
    await seedTestDatabase();
    server = await createTestServer();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await server.close();
  });

  it('GET /api/v1/components returns paginated list', async () => {
    const res = await server.get('/api/v1/components?category=desk&page=1&limit=20');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.pagination).toHaveProperty('total');
  });

  it('GET /api/v1/components/[id] returns single component', async () => {
    const res = await server.get('/api/v1/components/test-desk-001');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'test-desk-001');
    expect(res.body).toHaveProperty('prices');
  });

  it('GET /api/v1/components/[id] returns 404 for unknown ID', async () => {
    const res = await server.get('/api/v1/components/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('POST /api/v1/components requires authentication', async () => {
    const res = await server.post('/api/v1/components', {
      name: 'Test Desk',
      category: 'desk',
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/components creates component with valid data', async () => {
    const res = await server.post('/api/v1/components', {
      name: 'Test Desk',
      category: 'desk',
      brand: 'TestBrand',
    }, { auth: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });
});

// ─── Cache Integration Tests ───────────────────────────────────────────────────
describe('Cache Layer', () => {
  it('should cache component data in L2', async () => {
    // First request — cache miss
    const res1 = await server.get('/api/v1/components/test-desk-001');
    expect(res1.headers['x-cache']).toBe('MISS');

    // Second request — cache hit
    const res2 = await server.get('/api/v1/components/test-desk-001');
    expect(res2.headers['x-cache']).toBe('HIT');
  });

  it('should invalidate cache on component update', async () => {
    await server.put('/api/v1/components/test-desk-001', {
      name: 'Updated Desk',
    }, { auth: 'admin' });

    const res = await server.get('/api/v1/components/test-desk-001');
    expect(res.headers['x-cache']).toBe('MISS');
  });
});
```

### 6.3 E2E Tests (Playwright)

```typescript
// ─── Critical User Journeys ───────────────────────────────────────────────────
// File: tests/e2e/setup-planner.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Setup Planner Journey', () => {
  test('Landing → browse themes → apply theme → view setup', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Desk Setup');

    // Browse themes
    await page.click('text=Browse Themes');
    await expect(page).toHaveURL('/themes');

    // Apply a theme
    await page.click('[data-testid="theme-japandi"]');
    await expect(page.locator('[data-testid="theme-badge"]')).toContainText('Japandi');

    // View setup
    await page.click('text=View Setup');
    await expect(page.locator('[data-testid="setup-canvas"]')).toBeVisible();
  });

  test('Sign in → create setup → add items → save → share', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/planner');

    // Create new setup
    await page.click('text=New Setup');
    await page.fill('[name="setupName"]', 'My Dream Desk');
    await page.click('text=Create');

    // Add items
    await page.click('text=Browse Components');
    await page.click('[data-testid="category-desk"]');
    await page.click('[data-testid="add-to-setup-1"]');

    // Save
    await page.click('text=Save');
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();

    // Share
    await page.click('text=Share');
    const shareUrl = await page.inputValue('[data-testid="share-url"]');
    expect(shareUrl).toContain('/s/');
  });

  test('Browse components → filter → add to setup → check style score', async ({ page }) => {
    await page.goto('/components');
    await page.click('[data-testid="category-desk"]');
    await page.click('[data-testid="filter-price-asc"]');

    await expect(page.locator('[data-testid="component-card"]')).toHaveCount.greaterThan(0);

    await page.click('[data-testid="add-to-setup-1"]');
    await expect(page.locator('[data-testid="style-score"]')).toBeVisible();

    const score = await page.textContent('[data-testid="style-score-value"]');
    expect(parseInt(score || '0')).toBeGreaterThanOrEqual(0);
    expect(parseInt(score || '0')).toBeLessThanOrEqual(100);
  });

  test('Upload room photo → AI analysis → view suggestions', async ({ page }) => {
    await page.goto('/planner');
    await page.click('text=Upload Room Photo');

    // Upload file
    await page.setInputFiles('input[type="file"]', 'test-fixtures/sample-room.jpg');

    // Wait for analysis
    await expect(page.locator('[data-testid="analysis-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="analysis-result"]')).toBeVisible({
      timeout: 30000,
    });

    // View suggestions
    await expect(page.locator('[data-testid="suggestion-card"]')).toHaveCount.greaterThan(0);
  });
});

// ─── Admin E2E ─────────────────────────────────────────────────────────────────
test.describe('Admin Flow', () => {
  test('Add component → verify appears in catalog', async ({ page }) => {
    await page.goto('/admin');
    await page.fill('[name="email"]', 'admin@gobuildgo.com');
    await page.fill('[name="password"]', 'adminpass');
    await page.click('text=Sign In');

    await page.click('text=Add Component');
    await page.fill('[name="name"]', 'Test Standing Desk');
    await page.selectOption('[name="category"]', 'desk');
    await page.fill('[name="brand"]', 'TestBrand');
    await page.click('text=Save');

    // Verify in catalog
    await page.goto('/components?search=Test+Standing+Desk');
    await expect(page.locator('text=Test Standing Desk')).toBeVisible();
  });
});
```

### 6.4 CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test:unit -- --coverage
      - run: pnpm build

  integration:
    runs-on: ubuntu-latest
    needs: quality
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

  visual-regression:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:visual
        env:
          CHROMATIC_PROJECT_TOKEN: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}

  e2e:
    runs-on: ubuntu-latest
    needs: [integration, visual-regression]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:e2e
        env:
          VERCEL_DEPLOYMENT_URL: ${{ secrets.VERCEL_DEPLOYMENT_URL }}
```

---

## 7. Performance Patterns

### 7.1 Image Optimization

```typescript
// ─── Sharp Image Pipeline ──────────────────────────────────────────────────────
// File: src/lib/images/pipeline.ts
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface ImageVariant {
  width: number;
  format: 'webp' | 'avif' | 'jpeg';
  quality: number;
}

const VARIANTS: ImageVariant[] = [
  { width: 320, format: 'webp', quality: 80 },
  { width: 640, format: 'webp', quality: 80 },
  { width: 960, format: 'webp', quality: 80 },
  { width: 1280, format: 'webp', quality: 80 },
  { width: 320, format: 'avif', quality: 70 },
  { width: 640, format: 'avif', quality: 70 },
  { width: 960, format: 'avif', quality: 70 },
  { width: 1280, format: 'avif', quality: 70 },
  { width: 640, format: 'jpeg', quality: 85 }, // fallback
];

async function processImage(
  buffer: Buffer,
  key: string,
  s3: S3Client,
): Promise<void> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  // Generate blur placeholder (10px wide base64)
  const placeholder = await sharp(buffer)
    .resize(10)
    .blur()
    .toBuffer();
  const base64Placeholder = `data:image/jpeg;base64,${placeholder.toString('base64')}`;

  // Upload placeholder to R2 (tiny, cache forever)
  await s3.send(new PutObjectCommand({
    Bucket: 'gobuildgo-images',
    Key: `${key}/placeholder.jpg`,
    Body: placeholder,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000',
  }));

  // Generate all variants
  for (const variant of VARIANTS) {
    if (variant.width > (metadata.width || Infinity)) continue;

    let pipeline = sharp(buffer).resize(variant.width);

    switch (variant.format) {
      case 'webp':
        pipeline = pipeline.webp({ quality: variant.quality });
        break;
      case 'avif':
        pipeline = pipeline.avif({ quality: variant.quality });
        break;
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: variant.quality });
        break;
    }

    const outputBuffer = await pipeline.toBuffer();

    await s3.send(new PutObjectCommand({
      Bucket: 'gobuildgo-images',
      Key: `${key}/${variant.width}.${variant.format}`,
      Body: outputBuffer,
      ContentType: `image/${variant.format}`,
      CacheControl: 'public, max-age=604800', // 7 days
    }));
  }
}

// ─── Responsive Image Component ────────────────────────────────────────────────
interface ResponsiveImageProps {
  src: string;       // base path on R2
  alt: string;
  sizes?: string;
  className?: string;
}

function ResponsiveImage({ src, alt, sizes = '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw', className }: ResponsiveImageProps) {
  const widths = [320, 640, 960, 1280];

  const srcSet = widths
    .map(w => `${src}/${w}.webp ${w}w`)
    .join(', ');

  const avifSrcSet = widths
    .map(w => `${src}/${w}.avif ${w}w`)
    .join(', ');

  return (
    <picture>
      <source srcSet={avifSrcSet} type="image/avif" sizes={sizes} />
      <source srcSet={srcSet} type="image/webp" sizes={sizes} />
      <img
        src={`${src}/640.jpeg`}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
        sizes={sizes}
      />
    </picture>
  );
}
```

### 7.2 Route Prefetching

```typescript
// ─── Prefetch Links ────────────────────────────────────────────────────────────
// File: src/components/ui/prefetch-link.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';

interface PrefetchLinkProps extends React.ComponentProps<typeof Link> {
  prefetchOnHover?: boolean;
}

export function PrefetchLink({ prefetchOnHover = true, onMouseEnter, ...props }: PrefetchLinkProps) {
  const router = useRouter();
  const prefetched = useRef(false);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (prefetchOnHover && !prefetched.current) {
      router.prefetch(props.href.toString());
      prefetched.current = true;
    }
    onMouseEnter?.(e);
  }, [prefetchOnHover, props.href, router, onMouseEnter]);

  return <Link {...props} onMouseEnter={handleMouseEnter} />;
}

// ─── Usage in Navigation ──────────────────────────────────────────────────────
// In header/nav component:
<PrefetchLink href="/planner">Start Planning</PrefetchLink>
<PrefetchLink href="/components">Browse Components</PrefetchLink>
```

### 7.3 Optimistic UI

```typescript
// ─── Optimistic Update Hook ────────────────────────────────────────────────────
// File: src/hooks/use-optimistic-setup.ts
import { useSetupStore } from '@/stores/setup';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useAddItemToSetup() {
  const queryClient = useQueryClient();
  const { addItemLocal, removeItemLocal } = useSetupStore();

  return useMutation({
    mutationFn: async (componentId: string) => {
      const res = await fetch('/api/v1/setup/items', {
        method: 'POST',
        body: JSON.stringify({ componentId }),
      });
      if (!res.ok) throw new Error('Failed to add item');
      return res.json();
    },

    onMutate: async (componentId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['setup'] });

      // Snapshot previous state
      const previousSetup = queryClient.getQueryData(['setup']);

      // Optimistically update
      addItemLocal(componentId);

      return { previousSetup };
    },

    onError: (_err, _componentId, context) => {
      // Rollback on error
      if (context?.previousSetup) {
        queryClient.setQueryData(['setup'], context.previousSetup);
      }
      // Show toast error
      toast.error('Failed to add item. Please try again.');
    },

    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['setup'] });
    },
  });
}

// ─── Zustand Store with Optimistic Updates ─────────────────────────────────────
// File: src/stores/setup.ts
interface SetupState {
  items: SetupItem[];
  addItemLocal: (componentId: string) => void;
  removeItemLocal: (componentId: string) => void;
  rollback: (items: SetupItem[]) => void;
}

export const useSetupStore = create<SetupState>((set, get) => ({
  items: [],

  addItemLocal: (componentId) => {
    const component = getComponentCatalog(componentId);
    if (component) {
      set(state => ({ items: [...state.items, component] }));
    }
  },

  removeItemLocal: (componentId) => {
    set(state => ({
      items: state.items.filter(item => item.componentId !== componentId),
    }));
  },

  rollback: (items) => {
    set({ items });
  },
}));
```

### 7.4 Debounced Search

```typescript
// ─── Debounce Hook ─────────────────────────────────────────────────────────────
// File: src/hooks/use-debounce.ts
import { useState, useEffect, useRef } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ─── Debounced Search Hook ──────────────────────────────────────────────────────
// File: src/hooks/use-debounced-search.ts
import { useState, useEffect } from 'react';

export function useDebouncedSearch(query: string, delay: number = 300) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay]);

  return { debouncedQuery, isSearching };
}

// ─── Usage in Component Search ─────────────────────────────────────────────────
function ComponentCatalog() {
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [budgetRange, setBudgetRange] = useState([0, 50000000]);

  const { debouncedQuery: search } = useDebouncedSearch(searchInput, 300);
  const { debouncedQuery: category } = useDebouncedSearch(categoryFilter, 150);
  const { debouncedQuery: budget } = useDebouncedSearch(budgetRange.join(','), 100);

  // Fetch only when debounced values change
  const { data } = useQuery({
    queryKey: ['components', search, category, budget],
    queryFn: () => fetchComponents({ search, category, budget }),
  });
}
```

### 7.5 Virtual Scrolling

```typescript
// ─── Virtual List Component ────────────────────────────────────────────────────
// File: src/components/ui/virtual-list.tsx
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;  // estimated row height in px
  overscan?: number;      // extra items to render outside viewport
}

export function VirtualList<T>({
  items,
  renderItem,
  estimateSize = 80,
  overscan = 5,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Usage in Component Catalog ────────────────────────────────────────────────
function ComponentCatalog() {
  const { data: components } = useComponents();

  // Only use virtual scrolling for large lists
  if (components.length > 100) {
    return (
      <VirtualList
        items={components}
        renderItem={(component) => <ComponentCard key={component.id} component={component} />}
        estimateSize={120}
        overscan={5}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {components.map(c => <ComponentCard key={c.id} component={c} />)}
    </div>
  );
}
```

### 7.6 Code Splitting

```typescript
// ─── Dynamic Imports for Heavy Components ───────────────────────────────────────
import dynamic from 'next/dynamic';
import { lazy, Suspense } from 'react';

// Three.js is heavy — only load when 3D view is requested
const RoomVisualizer3D = dynamic(() => import('@/components/room/visualizer-3d'), {
  ssr: false, // Three.js requires browser APIs
  loading: () => <div className="skeleton-loader">Loading 3D View...</div>,
});

// Color palette editor uses react-colorful (medium weight)
const ColorPalette = lazy(() => import('@/components/style/color-palette'));

// ─── Usage in Planner Page ─────────────────────────────────────────────────────
function PlannerPage() {
  const [show3D, setShow3D] = useState(false);

  return (
    <div>
      <button onClick={() => setShow3D(true)}>View in 3D</button>

      {show3D && (
        <Suspense fallback={<div>Loading 3D...</div>}>
          <RoomVisualizer3D setup={currentSetup} />
        </Suspense>
      )}

      <Suspense fallback={<div>Loading palette...</div>}>
        <ColorPalette onColorsChange={handleColorsChange} />
      </Suspense>
    </div>
  );
}
```

---

## 8. Security Patterns

### 8.1 Input Validation

```typescript
// ─── Zod Schemas for API Boundaries ────────────────────────────────────────────
import { z } from 'zod';

// Component creation schema
const CreateComponentSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().min(1).max(100),
  category: z.enum(['desk', 'chair', 'monitor', 'keyboard', 'mouse', 'lighting', 'decor', 'audio', 'accessory']),
  description: z.string().max(2000).optional(),
  colors: z.array(z.object({
    h: z.number().min(0).max(360),
    s: z.number().min(0).max(100),
    l: z.number().min(0).max(100),
  })).max(5),
  tags: z.array(z.string().max(50)).max(10),
  footprint: z.object({
    width: z.number().positive().max(500),
    depth: z.number().positive().max(500),
  }),
});

// Setup creation schema
const CreateSetupSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).trim().optional(),
  theme: z.string().regex(/^[a-z0-9-]+$/),
  roomDimensions: z.object({
    width: z.number().positive().max(1000),
    depth: z.number().positive().max(1000),
    height: z.number().positive().max(500),
  }),
  deskDimensions: z.object({
    width: z.number().positive().max(300),
    depth: z.number().positive().max(150),
    height: z.number().positive().max(200),
  }),
  budget: z.number().positive().max(1000000000).optional(),
  isPublic: z.boolean().default(false),
});

// File upload validation
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 4000; // px

async function validateImageUpload(file: File): Promise<{ valid: boolean; error?: string }> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Image must be less than 5MB' };
  }

  // Check dimensions using Sharp
  const buffer = await file.arrayBuffer();
  const metadata = sharp(buffer).metadata();
  if ((metadata.width || 0) > MAX_DIMENSION || (metadata.height || 0) > MAX_DIMENSION) {
    return { valid: false, error: 'Image dimensions must not exceed 4000px' };
  }

  return { valid: true };
}

// ─── Sanitization ──────────────────────────────────────────────────────────────
import DOMPurify from 'isomorphic-dompurify';

function sanitizeUserInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // no HTML allowed in text fields
    ALLOWED_ATTR: [],
  });
}
```

### 8.2 Rate Limiting

```typescript
// ─── Redis-Based Sliding Window Rate Limiter ────────────────────────────────────
// File: src/lib/security/rate-limiter.ts

interface RateLimitConfig {
  windowMs: number;   // time window in milliseconds
  maxRequests: number; // max requests per window
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  public: { windowMs: 60000, maxRequests: 100 },        // 100 req/min for public endpoints
  authenticated: { windowMs: 60000, maxRequests: 1000 }, // 1000 req/min for auth endpoints
  aiAnalysis: { windowMs: 60000, maxRequests: 5 },       // 5 req/min for AI analysis
  export: { windowMs: 60000, maxRequests: 10 },          // 10 req/min for export
  search: { windowMs: 1000, maxRequests: 10 },           // 10 req/s for search
};

class RedisRateLimiter {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async check(
    identifier: string,    // IP or user ID
    endpoint: string,      // endpoint key from RATE_LIMITS
  ): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
    const config = RATE_LIMITS[endpoint] || RATE_LIMITS.public;
    const key = CacheKeys.rateLimit(identifier, endpoint);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Remove old entries outside the window
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // Count current requests in window
    const count = await this.redis.zcard(key);

    if (count >= config.maxRequests) {
      // Get the oldest request to calculate retry-after
      const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const retryAfter = oldest.length >= 2
        ? Math.ceil((parseInt(oldest[1]) + config.windowMs - now) / 1000)
        : Math.ceil(config.windowMs / 1000);

      return { allowed: false, remaining: 0, retryAfter };
    }

    // Add current request
    await this.redis.zadd(key, now, `${now}-${crypto.randomUUID()}`);
    await this.redis.pexpire(key, config.windowMs);

    return {
      allowed: true,
      remaining: config.maxRequests - count - 1,
      retryAfter: 0,
    };
  }
}

// ─── Rate Limit Middleware ──────────────────────────────────────────────────────
async function rateLimitMiddleware(
  req: Request,
  endpoint: string,
): Promise<{ response?: Response; identifier: string }> {
  const identifier = getClientIdentifier(req); // IP or user ID
  const limiter = new RedisRateLimiter(getRedis());
  const result = await limiter.check(identifier, endpoint);

  if (!result.allowed) {
    return {
      response: new Response(
        JSON.stringify({ error: { code: 'RATE_LIMIT_ERROR', message: 'Too many requests' } }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(RATE_LIMITS[endpoint]?.maxRequests || 100),
            'X-RateLimit-Remaining': String(result.remaining),
            'Retry-After': String(result.retryAfter),
          },
        },
      ),
      identifier,
    };
  }

  return { identifier };
}

function getClientIdentifier(req: Request): string {
  // Use user ID if authenticated, otherwise IP
  const userId = (req as any).userId;
  if (userId) return `user:${userId}`;

  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return `ip:${ip}`;
}
```

### 8.3 CSRF Protection

```typescript
// ─── CSRF Token Generation & Verification ──────────────────────────────────────
// File: src/lib/security/csrf.ts
import { cookies } from 'next/headers';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_EXPIRY = 86400000; // 24 hours

export function generateCsrfToken(): { token: string; cookie: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const signature = crypto
    .createHmac('sha256', process.env.CSRF_SECRET || 'fallback-secret')
    .update(token)
    .digest('hex');

  const cookieValue = `${token}.${signature}`;

  return {
    token,
    cookie: `${CSRF_COOKIE_NAME}=${cookieValue}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${TOKEN_EXPIRY / 1000}`,
  };
}

export function verifyCsrfToken(
  cookieHeader: string | null,
  requestHeader: string | null,
): boolean {
  if (!cookieHeader || !requestHeader) return false;

  // Parse cookie value: "token.signature"
  const [cookieToken, cookieSig] = cookieHeader.split('.');
  if (!cookieToken || !cookieSig) return false;

  // Verify cookie signature
  const expectedSig = crypto
    .createHmac('sha256', process.env.CSRF_SECRET || 'fallback-secret')
    .update(cookieToken)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(cookieSig), Buffer.from(expectedSig))) {
    return false;
  }

  // Verify double-submit: cookie token must match request header
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(requestHeader),
  );
}

// ─── CSRF Middleware for Mutations ─────────────────────────────────────────────
async function csrfMiddleware(req: Request): Promise<boolean> {
  if (req.method === 'GET' || req.method === 'HEAD') return true;

  const cookies = await cookieStore();
  const csrfCookie = cookies.get(CSRF_COOKIE_NAME)?.value;
  const csrfHeader = req.headers.get(CSRF_HEADER_NAME);

  return verifyCsrfToken(csrfCookie, csrfHeader);
}
```

### 8.4 Content Security Policy

```typescript
// ─── CSP Header Builder ────────────────────────────────────────────────────────
// File: src/lib/security/csp.ts

function buildCspHeader(nonce: string): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", `'nonce-${nonce}'`, "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"], // needed for Tailwind
    'img-src': [
      "'self'",
      'data:', // for blur placeholders
      'https://*.r2.cloudflarestorage.com',
      'https://*.cloudfront.net',
      'https://*.shopee.vn',
      'https://*.lazada.vn',
      'https://*.tiki.vn',
    ],
    'connect-src': [
      "'self'",
      'https://*.shopee.vn',
      'https://*.lazada.vn',
      'https://*.tiki.vn',
      'https://api.sentry.io',
      'https://*.neon.tech',
      'https://*.upstash.io',
    ],
    'font-src': ["'self'", 'data:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  };

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

// ─── Next.js Middleware ─────────────────────────────────────────────────────────
// File: src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCspHeader(nonce);

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}
```

### 8.5 SQL Injection Prevention

```typescript
// ─── Safe Database Access Patterns ──────────────────────────────────────────────
import { Prisma } from '@prisma/client';

// GOOD: Prisma automatically parameterizes all queries
async function getComponent(id: string) {
  return await prisma.component.findUnique({
    where: { id },
    include: { prices: true },
  });
}

// GOOD: Parameterized raw queries (if needed)
async function searchComponentsRaw(query: string) {
  // Prisma tagged template — automatically parameterized
  const results = await prisma.$queryRaw`
    SELECT * FROM "Component"
    WHERE name ILIKE ${`%${query}%`}
    LIMIT 20
  `;
  return results;
}

// GOOD: $executeRaw with tagged templates for dynamic IN clauses
async function getComponentsByIds(ids: string[]) {
  // Prisma handles parameterization
  return await prisma.component.findMany({
    where: { id: { in: ids } },
  });
}

// NEVER DO THIS — string concatenation in SQL
// async function badSearch(query: string) {
//   return await prisma.$executeRawUnsafe(
//     `SELECT * FROM Component WHERE name LIKE '%${query}%'` // SQL INJECTION!
//   );
// }

// ─── Dynamic Sort/Filter Safety ────────────────────────────────────────────────
// Validate and whitelist dynamic order/sort parameters
const ALLOWED_SORT_FIELDS = ['name', 'price', 'createdAt', 'popularity'] as const;
const ALLOWED_SORT_ORDERS = ['asc', 'desc'] as const;

function buildSafeOrderBy(
  sortBy?: string,
  sortOrder?: string,
): Prisma.ComponentOrderByWithRelationInput {
  const field = ALLOWED_SORT_FIELDS.includes(sortBy as any)
    ? sortBy
    : 'createdAt';
  const order = ALLOWED_SORT_ORDERS.includes(sortOrder as any)
    ? sortOrder
    : 'desc';

  return { [field]: order };
}
```

### 8.6 Affiliate Link Security

```typescript
// ─── Affiliate Link Security ───────────────────────────────────────────────────
// File: src/lib/security/affiliate-security.ts

const AFFILIATE_SIGNING_SECRET = process.env.AFFILIATE_SIGNING_SECRET!;
const KEY_ROTATION_INTERVAL = 90 * 24 * 60 * 60 * 1000; // 90 days

interface SignedAffiliateUrl {
  url: string;
  signature: string;
  expiresAt: number;
}

class AffiliateSecurityService {
  private currentSecret: string;
  private previousSecret: string | null; // for graceful key rotation
  private keyCreatedAt: Date;

  constructor() {
    this.currentSecret = process.env.AFFILIATE_SIGNING_SECRET!;
    this.previousSecret = process.env.PREVIOUS_AFFILIATE_SECRET || null;
    this.keyCreatedAt = new Date(process.env.KEY_CREATED_AT || Date.now());
  }

  signUrl(params: Record<string, string>): SignedAffiliateUrl {
    // Check if key needs rotation
    if (this.needsKeyRotation()) {
      console.warn('[Affiliate] Signing key is due for rotation');
    }

    // Create canonical string to sign (sorted params for consistency)
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&');

    const expiresAt = Date.now() + 3600000; // 1 hour expiry
    const stringToSign = `${sortedParams}|${expiresAt}`;

    const signature = crypto
      .createHmac('sha256', this.currentSecret)
      .update(stringToSign)
      .digest('hex')
      .substring(0, 32);

    const urlParams = new URLSearchParams({
      ...params,
      sig: signature,
      exp: expiresAt.toString(36),
    });

    return {
      url: `${params.baseUrl}?${urlParams.toString()}`,
      signature,
      expiresAt,
    };
  }

  verifyUrl(params: Record<string, string>, signature: string, expiresAt: string): boolean {
    // Check expiry
    if (Date.now() > parseInt(expiresAt, 36)) {
      return false;
    }

    const { sig: expectedSig } = this.signUrl(params);

    // Try current secret
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return true;
    }

    // Try previous secret (grace period during rotation)
    if (this.previousSecret) {
      const stringToSign = Object.keys(params)
        .sort()
        .map(k => `${k}=${params[k]}`)
        .join('&') + `|${expiresAt}`;

      const prevSig = crypto
        .createHmac('sha256', this.previousSecret)
        .update(stringToSign)
        .digest('hex')
        .substring(0, 32);

      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(prevSig));
    }

    return false;
  }

  private needsKeyRotation(): boolean {
    return Date.now() - this.keyCreatedAt.getTime() > KEY_ROTATION_INTERVAL;
  }
}

// ─── Click Tracking Verification ───────────────────────────────────────────────
// Verify that a click is legitimate before recording it
async function verifyClickLegitimacy(
  req: Request,
  componentId: string,
  shop: string,
  signature: string,
): Promise<{ legitimate: boolean; reason?: string }> {
  // 1. Verify signature
  const security = new AffiliateSecurityService();
  if (!security.verifyUrl({ componentId, shop }, signature, req.url)) {
    return { legitimate: false, reason: 'Invalid signature' };
  }

  // 2. Verify component exists
  const component = await prisma.component.findUnique({
    where: { id: componentId },
    select: { id: true },
  });
  if (!component) {
    return { legitimate: false, reason: 'Unknown component' };
  }

  // 3. Verify shop is in allowed list
  const ALLOWED_SHOPS = ['Shopee', 'Lazada', 'Tiki'];
  if (!ALLOWED_SHOPS.includes(shop)) {
    return { legitimate: false, reason: 'Unknown shop' };
  }

  // 4. Check for bot traffic
  const userAgent = req.headers.get('user-agent') || '';
  const BOT_PATTERNS = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget'];
  if (BOT_PATTERNS.some(pattern => userAgent.toLowerCase().includes(pattern))) {
    return { legitimate: false, reason: 'Bot detected' };
  }

  return { legitimate: true };
}
```

---

## Appendix A: File Structure Reference

```
src/
├── app/
│   ├── (marketing)/          # Landing, themes, about
│   ├── (auth)/               # Sign in, sign up, forgot password
│   ├── (app)/                # Authenticated app routes
│   │   ├── planner/          # Main setup planner
│   │   ├── components/       # Component catalog
│   │   ├── setups/           # Saved setups
│   │   └── settings/         # User settings
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   ├── components/
│   │   ├── setups/
│   │   ├── affiliate/
│   │   │   └── track/        # Click tracking endpoint
│   │   └── upload/
│   ├── error.tsx             # Route error boundary
│   └── global-error.tsx      # Critical error boundary
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── layout/               # Header, footer, sidebar
│   ├── components/           # ComponentCard, ComponentGrid
│   ├── setup/                # PlannerShell, SetupCanvas
│   ├── style/                # StyleScore, ColorPalette
│   └── room/                 # RoomVisualizer, RoomUploader
├── lib/
│   ├── style/                # Style engine
│   │   ├── color-harmony.ts
│   │   ├── theme-consistency.ts
│   │   ├── space-fitting.ts
│   │   ├── budget-balance.ts
│   │   └── index.ts          # StyleEngine class
│   ├── scrapers/             # Price scrapers
│   │   ├── shopee.ts
│   │   ├── lazada.ts
│   │   ├── tiki.ts
│   │   ├── pipeline.ts
│   │   └── rate-limiter.ts
│   ├── cache/                # Cache layers
│   │   ├── memory.ts
│   │   ├── redis.ts
│   │   └── manager.ts
│   ├── affiliate/            # Affiliate link system
│   │   ├── generator.ts
│   │   ├── tracker.ts
│   │   └── rotation.ts
│   ├── security/             # Security utilities
│   │   ├── rate-limiter.ts
│   │   ├── csrf.ts
│   │   ├── csp.ts
│   │   └── affiliate-security.ts
│   ├── images/               # Image pipeline
│   │   └── pipeline.ts
│   └── db/                   # Database client
│       └── prisma.ts
├── stores/                   # Zustand stores
│   └── setup.ts
├── hooks/                    # Custom React hooks
│   ├── use-debounce.ts
│   ├── use-optimistic-setup.ts
│   └── use-debounced-search.ts
├── schemas/                  # Zod validation schemas
│   ├── component.ts
│   ├── setup.ts
│   └── upload.ts
├── config/
│   └── themes.json           # Theme definitions (JSON-driven)
├── i18n/                     # Internationalization
│   ├── en.json
│   └── vi.json
└── types/                    # Shared TypeScript types
    ├── style.ts
    ├── scraper.ts
    └── affiliate.ts
```

---

## Appendix B: Key Design Decisions

| Decision | Rationale |
|---|---|
| HSL over RGB for color math | HSL maps directly to human perception of hue relationships |
| Token bucket over fixed window | Allows burst traffic while maintaining average rate |
| Multi-level cache (L1 + L2 + L3) | Balances speed (L1), persistence (L2), and global distribution (L3) |
| Strategy pattern for scrapers | Each shop has different APIs; shared interface enables uniform pipeline |
| JSON-driven themes | New themes require zero code changes — just add a config entry |
| Plugin architecture for scoring | Allows extending the style engine without modifying core logic |
| Optimistic UI with rollback | Feels instant to user; server is source of truth |
| HMAC-signed affiliate links | Prevents users from forging affiliate IDs or tampering with params |
| Zod at every API boundary | Single source of truth for validation; TypeScript types inferred from schemas |
| Sharp for image processing | Fastest Node.js image library; supports WebP, AVIF, blur placeholders |

---

*End of Engineering Patterns Document*