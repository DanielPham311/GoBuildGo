import type { NextRequest } from "next/server";
import { visualizeRequestSchema, visualize } from "@/modules/visualize";
import { jsonError } from "@/shared/api/response";
import { NextResponse } from "next/server";

// POST /api/v1/visualize — query → RAG retrieval → Gemini room image.
// Reference: docs/RAG_VISUALIZATION.md §4–5.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = visualizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      "Invalid request",
      parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    );
  }

  try {
    const result = await visualize(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Visualization failed";
    return jsonError("INTERNAL_ERROR", message);
  }
}
