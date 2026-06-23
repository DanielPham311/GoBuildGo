import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/db";
import { slugify } from "@/lib/utils";
import type {
  ListAdminComponentsQuery,
  CreateComponentInput,
  UpdateComponentInput,
} from "./schema";

export class AdminError extends Error {
  constructor(
    public code: "NOT_FOUND" | "DUPLICATE_SLUG",
    message: string,
  ) {
    super(message);
    this.name = "AdminError";
  }
}

/** Dashboard metrics for GET /api/v1/admin/stats. */
export async function getDashboardStats() {
  const [
    users,
    components,
    activeComponents,
    setups,
    publicSetups,
    prices,
    staleEmbeddings,
    affiliateClicks,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.component.count(),
    prisma.component.count({ where: { isActive: true } }),
    prisma.setup.count(),
    prisma.setup.count({ where: { isPublic: true } }),
    prisma.price.count(),
    prisma.component.count({ where: { embeddingStale: true } }),
    prisma.affiliateClick.count(),
  ]);

  return {
    users,
    components,
    activeComponents,
    setups,
    publicSetups,
    prices,
    staleEmbeddings,
    affiliateClicks,
  };
}

/** List components for admin — includes inactive (unlike the public catalog). */
export async function listAdminComponents(query: ListAdminComponentsQuery) {
  const { page, limit, category, search } = query;

  const where: Prisma.ComponentWhereInput = {
    ...(category ? { category } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.component.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { prices: true } } },
    }),
    prisma.component.count({ where }),
  ]);

  return { items, total };
}

/** Create a component. Slug derived from brand + name; collisions rejected. */
export async function createComponent(input: CreateComponentInput) {
  const slug = slugify(`${input.brand}-${input.name}`).slice(0, 80);

  const existing = await prisma.component.findUnique({ where: { slug }, select: { id: true } });
  if (existing) throw new AdminError("DUPLICATE_SLUG", `A component with slug "${slug}" already exists`);

  return prisma.component.create({
    data: {
      slug,
      category: input.category,
      brand: input.brand,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      colors: input.colors ?? [],
      styleTags: input.styleTags ?? [],
      isActive: input.isActive ?? true,
      embeddingStale: true,
    },
    include: { _count: { select: { prices: true } } },
  });
}

/** Update component metadata. Throws AdminError("NOT_FOUND") if missing. */
export async function updateComponent(id: string, input: UpdateComponentInput) {
  const existing = await prisma.component.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new AdminError("NOT_FOUND", "Component not found");

  // Editing name/brand restages the embedding so search stays accurate.
  const restage = input.name !== undefined || input.brand !== undefined || input.description !== undefined;

  return prisma.component.update({
    where: { id },
    data: {
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.brand !== undefined ? { brand: input.brand } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.colors !== undefined ? { colors: input.colors } : {}),
      ...(input.styleTags !== undefined ? { styleTags: input.styleTags } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(restage ? { embeddingStale: true } : {}),
    },
    include: { _count: { select: { prices: true } } },
  });
}

/** Delete a component (cascades to prices/setup items). Throws if missing. */
export async function deleteComponent(id: string) {
  const existing = await prisma.component.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new AdminError("NOT_FOUND", "Component not found");
  await prisma.component.delete({ where: { id } });
}

/**
 * Affiliate click report: most-clicked components, with totals and per-shop
 * breakdown. `limit` caps the number of components returned.
 */
export async function getAffiliateReport(limit = 50) {
  const grouped = await prisma.affiliateClick.groupBy({
    by: ["componentId"],
    _count: { _all: true },
    orderBy: { _count: { componentId: "desc" } },
    take: limit,
  });

  const componentIds = grouped.map((g) => g.componentId);
  const [components, byShop, totalClicks] = await Promise.all([
    prisma.component.findMany({
      where: { id: { in: componentIds } },
      select: { id: true, name: true, brand: true, category: true, imageUrl: true },
    }),
    prisma.affiliateClick.groupBy({
      by: ["componentId", "shop"],
      where: { componentId: { in: componentIds } },
      _count: { _all: true },
    }),
    prisma.affiliateClick.count(),
  ]);

  const compMap = new Map(components.map((c) => [c.id, c]));
  const shopMap = new Map<string, Record<string, number>>();
  for (const row of byShop) {
    const entry = shopMap.get(row.componentId) ?? {};
    entry[row.shop] = row._count._all;
    shopMap.set(row.componentId, entry);
  }

  const rows = grouped.map((g) => {
    const c = compMap.get(g.componentId);
    return {
      componentId: g.componentId,
      name: c?.name ?? "(deleted)",
      brand: c?.brand ?? "",
      category: c?.category ?? "",
      imageUrl: c?.imageUrl ?? null,
      clicks: g._count._all,
      byShop: shopMap.get(g.componentId) ?? {},
    };
  });

  return { totalClicks, rows };
}

/** Paginated prompt observability log, newest first, optional type filter. */
export async function listPromptLogs(args: {
  page: number;
  limit: number;
  type?: "search" | "visualize";
}) {
  const { page, limit, type } = args;
  const where = type ? { type } : {};

  const [items, total] = await Promise.all([
    prisma.promptLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.promptLog.count({ where }),
  ]);

  return { items, total };
}
