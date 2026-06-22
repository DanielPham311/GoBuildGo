import { NextResponse, type NextRequest } from "next/server";
import { getPrice, recordAffiliateClick, verifyAffiliate } from "@/modules/prices";
import { getCurrentUser } from "@/shared/auth/helpers";
import { jsonError } from "@/shared/api/response";
import { toErrorResponse } from "@/shared/api/handle";

// GET /api/v1/prices/affiliate — verify a signed affiliate link, track the
// click, then 302-redirect to the shop URL (API_DESIGN.md §7).
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const priceId = sp.get("priceId");
    const componentId = sp.get("componentId");
    const shop = sp.get("shop");
    const sig = sp.get("sig");

    if (!priceId || !componentId || !shop || !sig) {
      return jsonError("VALIDATION_ERROR", "Missing required query parameters");
    }
    if (!verifyAffiliate(priceId, componentId, shop, sig)) {
      return jsonError("FORBIDDEN", "Invalid affiliate signature");
    }

    const price = await getPrice(priceId);

    const user = await getCurrentUser();
    // Fire-and-forget; never block the redirect on the audit write.
    void recordAffiliateClick({
      componentId,
      shop,
      userId: user?.id,
      referrer: req.headers.get("referer") ?? undefined,
    }).catch(() => {});

    return NextResponse.redirect(price.url, 302);
  } catch (err) {
    return toErrorResponse(err);
  }
}
