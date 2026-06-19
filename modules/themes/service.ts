import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/db";
import type { ListThemesQuery } from "./schema";

export async function listThemes(query: ListThemesQuery) {
  const { page, limit, featured } = query;
  const where: Prisma.ThemeWhereInput = featured === undefined ? {} : { isFeatured: featured };

  const [items, total] = await Promise.all([
    prisma.theme.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.theme.count({ where }),
  ]);

  return { items, total };
}

/** Theme with its recommended components, by slug. */
export async function getThemeBySlug(slug: string) {
  return prisma.theme.findUnique({
    where: { slug },
    include: {
      components: {
        orderBy: { sortOrder: "asc" },
        include: { component: true },
      },
    },
  });
}
