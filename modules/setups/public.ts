import type { Setup } from "@prisma/client";

export type PublicSetup = {
  id: string;
  name: string;
  slug: string;
  roomType: string | null;
  theme: string | null;
  totalPrice: number | null;
  coverImageUrl: string | null;
  viewCount: number;
};

export function toPublicSetup(s: Setup): PublicSetup {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    roomType: s.roomType,
    theme: s.theme,
    totalPrice: s.totalPrice ? Number(s.totalPrice) : null,
    coverImageUrl: s.coverImageUrl,
    viewCount: s.viewCount,
  };
}
