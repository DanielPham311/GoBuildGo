import { NextResponse, type NextRequest } from "next/server";
import { toggleFavorite, addFavorite, removeFavorite } from "@/modules/users";
import { requireUser } from "@/shared/auth/helpers";
import { toErrorResponse } from "@/shared/api/handle";

type Ctx = { params: { componentId: string } };

// POST /api/v1/users/me/favorites/[componentId] — toggle favorite (API_DESIGN.md §8).
export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireUser();
    return NextResponse.json(await toggleFavorite(user.id!, params.componentId));
  } catch (err) {
    return toErrorResponse(err);
  }
}

// PUT /api/v1/users/me/favorites/[componentId] — add favorite (idempotent).
export async function PUT(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireUser();
    return NextResponse.json(await addFavorite(user.id!, params.componentId));
  } catch (err) {
    return toErrorResponse(err);
  }
}

// DELETE /api/v1/users/me/favorites/[componentId] — remove favorite.
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireUser();
    return NextResponse.json(await removeFavorite(user.id!, params.componentId));
  } catch (err) {
    return toErrorResponse(err);
  }
}
