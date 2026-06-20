import type { NextRequest } from "next/server";
import { refreshEmbeddings } from "@/modules/search/embed-refresh";
import { jsonError } from "@/shared/api/response";
import { NextResponse } from "next/server";

// POST /api/v1/cron/embed — refresh stale component embeddings.
// Triggered by Vercel Cron. Protected by CRON_SECRET bearer token.
// Reference: docs/RAG_VISUALIZATION.md §4, §6.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return jsonError("UNAUTHENTICATED", "Invalid cron secret");
  }

  try {
    const result = await refreshEmbeddings();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Embed refresh failed";
    return jsonError("INTERNAL_ERROR", message);
  }
}
