import type { Setup, Prisma } from "@prisma/client";
import type { SetupDetail } from "./service";

export type PublicSetup = {
  id: string;
  name: string;
  slug: string;
  roomType: string | null;
  theme: string | null;
  totalPrice: number | null;
  coverImageUrl: string | null;
  viewCount: number;
  items: unknown[];
};

export function toPublicSetup(s: Setup & { items?: unknown[] }): PublicSetup {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    roomType: s.roomType,
    theme: s.theme,
    totalPrice: s.totalPrice ? Number(s.totalPrice) : null,
    coverImageUrl: s.coverImageUrl,
    viewCount: s.viewCount,
    items: s.items ?? [],
  };
}

/** A user's own setup summary (includes item/like counts). API_DESIGN.md §8. */
type SetupWithCounts = Setup & { _count: { likes: number; items: number } };

export function toUserSetupSummary(s: SetupWithCounts & { isPublic: boolean }) {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    roomType: s.roomType,
    theme: s.theme,
    isPublic: s.isPublic,
    totalPrice: s.totalPrice ? Number(s.totalPrice) : null,
    itemCount: s._count.items,
    likeCount: s._count.likes,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

/** Full setup detail with items + author. API_DESIGN.md §5. */
export function toSetupDetail(s: SetupDetail, isLiked = false) {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    roomType: s.roomType,
    roomDimensions: s.roomDimensions,
    theme: s.theme,
    isPublic: s.isPublic,
    totalPrice: s.totalPrice ? Number(s.totalPrice) : null,
    coverImageUrl: s.coverImageUrl,
    likeCount: s._count.likes,
    isLiked,
    author: s.user ? { id: s.user.id, name: s.user.name, image: s.user.image } : null,
    items: s.items.map((it) => ({
      id: it.id,
      componentId: it.componentId,
      component: {
        id: it.component.id,
        name: it.component.name,
        brand: it.component.brand,
        category: it.component.category,
        imageUrl: it.component.imageUrl,
        lowestPrice: it.component.prices[0]?.price
          ? Number(it.component.prices[0].price)
          : null,
      },
      quantity: it.quantity,
      position: it.position as Prisma.JsonValue,
    })),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}
