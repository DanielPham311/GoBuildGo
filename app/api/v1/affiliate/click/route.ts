import type { NextRequest } from "next/server";
import { parseAffiliatePayload, recordClick, hashIp } from "@/modules/affiliate";
import { getCurrentUser } from "@/shared/auth/helpers";
import { Shop } from "@prisma/client";

// POST /api/v1/affiliate/click — track click + redirect to shop.
// Also supports GET for link-following (crawlers, etc.)
export async function POST(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const encoded = sp.get("d");
  const sig = sp.get("s");

  if (!encoded || !sig) {
    return new Response("Missing parameters", { status: 400 });
  }

  const payload = parseAffiliatePayload(encoded, sig);
  if (!payload) {
    return new Response("Invalid signature", { status: 403 });
  }

  // Validate shop exists (just check component exists)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // Fire-and-forget click recording
  recordClick({
    componentId: payload.componentId,
    shop: Shop.shopee, // default; could be encoded in payload later
    setupId: payload.setupId ?? undefined,
    userId: undefined,
    referrer: req.headers.get("referer") ?? undefined,
    ipHash: hashIp(ip),
  }).catch(() => {
    // ignore recording failures
  });

  // Redirect to the shop URL
  return Response.redirect(payload.url, 302);
}

export async function GET(req: NextRequest) {
  return POST(req);
}
