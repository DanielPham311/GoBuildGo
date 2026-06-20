import type { NextRequest } from "next/server";
import { searchQuerySchema, searchComponents } from "@/modules/search";
import { jsonError } from "@/shared/api/response";
import { NextResponse } from "next/server";

// GET /api/v1/search — RAG vector search over component catalog.
// Reference: docs/RAG_VISUALIZATION.md §4.
export async function GET(req: NextRequest) {
  const parsed = searchQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      "Invalid query parameters",
      parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    );
  }

  try {
    const result = await searchComponents(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return jsonError("INTERNAL_ERROR", message);
  }
}
