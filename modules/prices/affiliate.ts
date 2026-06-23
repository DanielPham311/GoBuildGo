import { createHmac, timingSafeEqual } from "crypto";

/**
 * Affiliate links are HMAC-signed so the redirect endpoint can verify a click
 * originated from us before recording it and forwarding to the shop.
 * Reference: architecture rule — "Affiliate links: HMAC-signed to prevent tampering".
 */
const SECRET = process.env.AFFILIATE_SECRET ?? "dev-affiliate-secret";

/** Canonical message that gets signed: priceId + componentId + shop. */
function message(priceId: string, componentId: string, shop: string): string {
  return `${priceId}:${componentId}:${shop}`;
}

export function signAffiliate(priceId: string, componentId: string, shop: string): string {
  return createHmac("sha256", SECRET).update(message(priceId, componentId, shop)).digest("hex");
}

export function verifyAffiliate(
  priceId: string,
  componentId: string,
  shop: string,
  sig: string,
): boolean {
  const expected = signAffiliate(priceId, componentId, shop);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Build the relative affiliate redirect URL embedding the signature. */
export function affiliateUrl(priceId: string, componentId: string, shop: string): string {
  const sig = signAffiliate(priceId, componentId, shop);
  const qs = new URLSearchParams({ priceId, componentId, shop, sig });
  return `/api/v1/prices/affiliate?${qs.toString()}`;
}
