import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/db";
import type { ListComponentsQuery } from "./schema";

/** List active components with filtering + pagination. */
export async function listComponents(query: ListComponentsQuery) {
  const { page, limit, category, brand, search } = query;

  const where: Prisma.ComponentWhereInput = {
    isActive: true,
    ...(category ? { category } : {}),
    ...(brand ? { brand } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
  };

  // TODO: price_asc/price_desc/popular require price aggregation; defaulting to newest.
  const [items, total] = await Promise.all([
    prisma.component.findMany({
      where,
      orderBy: query.sort === "name_asc" ? { name: "asc" } : { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.component.count({ where }),
  ]);

  return { items, total };
}

/** Single component (with prices) by id, or null. */
export async function getComponentById(id: string) {
  return prisma.component.findUnique({
    where: { id },
    include: { prices: { where: { isAvailable: true } } },
  });
}
