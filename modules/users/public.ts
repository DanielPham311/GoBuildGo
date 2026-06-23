import type { User } from "@prisma/client";

type UserWithCounts = User & {
  _count: { setups: number; favorites: number; setupLikes: number };
};

/** API-safe user profile (API_DESIGN.md §8). */
export function toPublicProfile(u: UserWithCounts) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    bio: u.bio,
    location: u.location,
    role: u.role,
    setupCount: u._count.setups,
    favoriteCount: u._count.favorites,
    likeCount: u._count.setupLikes,
    createdAt: u.createdAt,
  };
}

type FavoriteRow = {
  createdAt: Date;
  component: {
    id: string;
    name: string;
    brand: string;
    category: string;
    imageUrl: string | null;
    prices: { price: unknown }[];
  };
};

/** A favorited component summary (API_DESIGN.md §8). */
export function toFavoriteComponent(row: FavoriteRow) {
  const c = row.component;
  return {
    id: c.id,
    name: c.name,
    brand: c.brand,
    category: c.category,
    imageUrl: c.imageUrl,
    lowestPrice: c.prices[0]?.price != null ? Number(c.prices[0].price) : null,
    favoritedAt: row.createdAt,
  };
}
