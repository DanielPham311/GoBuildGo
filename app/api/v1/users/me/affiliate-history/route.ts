import type { NextRequest } from "next/server";
import { prisma } from "@/shared/db";
import { requireUser } from "@/shared/auth/helpers";
import { jsonError } from "@/shared/api/response";

// GET /api/v1/users/me/affiliate-history — user's click history.
export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return jsonError("UNAUTHENTICATED", "Authentication required");
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 20));

  const [items, total] = await Promise.all([
    prisma.affiliateClick.findMany({
      where: { userId: user.id },
      orderBy: { clickedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        component: { select: { id: true, name: true, brand: true, imageUrl: true } },
      },
    }),
    prisma.affiliateClick.count({ where: { userId: user.id } }),
  ]);

  return Response.json({
    data: items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
