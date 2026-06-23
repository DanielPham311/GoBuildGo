import crypto from "node:crypto";
import { prisma } from "@/shared/db";
import { Shop } from "@prisma/client";

const AFFILIATE_SECRET = process.env.AFFILIATE_SECRET ?? "dev-secret-change-me";

/**
 * Sign a URL with HMAC-SHA256. Returns hex signature.
 */
export function signUrl(url: string): string {
  return crypto.createHmac("sha256", AFFILIATE_SECRET).update(url).digest("hex");
}

/**
 * Verify an HMAC signature for a URL. Returns true if valid.
 */
export function verifySignature(url: string, sig: string): boolean {
  const expected = signUrl(url);
  // timing-safe compare to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

/**
 * Build a signed affiliate redirect URL.
 * Format: /api/v1/affiliate/click?url=<base64url-encoded-url>&sig=<hmac>
 */
export function buildAffiliateUrl(originalUrl: string, componentId: string, setupId?: string): string {
  const payload = JSON.stringify({ url: originalUrl, componentId, setupId: setupId ?? null });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", AFFILIATE_SECRET).update(encoded).digest("hex");
  return `/api/v1/affiliate/click?d=${encoded}&s=${sig}`;
}

/**
 * Parse and verify an affiliate redirect payload.
 * Returns { url, componentId, setupId } if valid, or null if tampered.
 */
export function parseAffiliatePayload(encoded: string, sig: string): { url: string; componentId: string; setupId: string | null } | null {
  const expected = crypto.createHmac("sha256", AFFILIATE_SECRET).update(encoded).digest("hex");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    if (!payload.url || !payload.componentId) return null;
    return { url: payload.url, componentId: payload.componentId, setupId: payload.setupId ?? null };
  } catch {
    return null;
  }
}

/**
 * Record an affiliate click. Fire-and-forget safe.
 */
export async function recordClick(data: {
  componentId: string;
  shop: Shop;
  setupId?: string;
  userId?: string;
  referrer?: string;
  ipHash?: string;
}): Promise<void> {
  await prisma.affiliateClick.create({
    data: {
      componentId: data.componentId,
      shop: data.shop,
      setupId: data.setupId ?? null,
      userId: data.userId ?? null,
      referrer: data.referrer ?? null,
      ipHash: data.ipHash ?? null,
    },
  });
}

/**
 * Hash an IP address for privacy-preserving analytics.
 */
export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + AFFILIATE_SECRET).digest("hex").slice(0, 16);
}

/**
 * Get click stats for a component.
 */
export async function getClickStats(componentId: string, days = 30) {
  const since = new Date(Date.now() - days * 86400000);

  const [total, byShop, recent] = await Promise.all([
    prisma.affiliateClick.count({ where: { componentId } }),
    prisma.affiliateClick.groupBy({
      by: ["shop"],
      where: { componentId },
      _count: { id: true },
    }),
    prisma.affiliateClick.count({
      where: { componentId, clickedAt: { gte: since } },
    }),
  ]);

  return {
    total,
    recent,
    byShop: Object.fromEntries(byShop.map((r) => [r.shop, r._count.id])),
  };
}
