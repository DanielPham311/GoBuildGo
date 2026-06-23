import { NextResponse } from "next/server";
import { getThemeBySlug, toPublicTheme } from "@/modules/themes";
import { toPublicComponent } from "@/modules/components";
import { jsonError } from "@/shared/api/response";

// GET /api/v1/themes/[slug] — theme detail + recommended items (API_DESIGN.md §6).
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const theme = await getThemeBySlug(params.slug);
  if (!theme) return jsonError("NOT_FOUND", "Theme not found");

  return NextResponse.json({
    ...toPublicTheme(theme),
    components: theme.components.map((tc) => ({
      ...toPublicComponent(tc.component),
      lowestPrice: tc.component.prices[0]?.price != null ? Number(tc.component.prices[0].price) : null,
    })),
  });
}
