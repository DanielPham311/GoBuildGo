import { prisma } from "@/shared/db";
import { slugify } from "@/lib/utils";
import type { CreateSetupInput, UpdateSetupInput, ListSetupsQuery } from "./schema";
import { toPublicSetup, type PublicSetup } from "./public";

/** List public setups with filtering, sorting, pagination. */
export async function listPublicSetups(query: ListSetupsQuery): Promise<{ items: PublicSetup[]; total: number }> {
  const { page, limit, roomType, theme, sort } = query;
  const where = {
    isPublic: true,
    ...(roomType ? { roomType } : {}),
    ...(theme ? { theme } : {}),
  };
  const orderBy = sort === "popular"
    ? { viewCount: "desc" as const }
    : { createdAt: "desc" as const };

  const [items, total] = await Promise.all([
    prisma.setup.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        items: {
          include: { component: { select: { id: true, name: true, brand: true, imageUrl: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.setup.count({ where }),
  ]);

  return { items: items.map(toPublicSetup), total };
}

/** Get a single setup by ID. Returns null if not found or private (and not owner). */
export async function getSetupById(id: string, userId?: string) {
  const setup = await prisma.setup.findUnique({
    where: { id },
    include: {
      items: {
        include: { component: { select: { id: true, name: true, brand: true, imageUrl: true, category: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!setup) return null;
  if (!setup.isPublic && setup.userId !== userId) return null;
  return setup;
}

/** Create a new setup for a user. */
export async function createSetup(userId: string, data: CreateSetupInput) {
  const slug = data.slug ?? slugify(data.name);
  const totalPrice = await calculateTotalPrice(data.items);

  return prisma.setup.create({
    data: {
      userId,
      name: data.name,
      slug,
      roomType: data.roomType,
      roomDimensions: data.roomDimensions ?? undefined,
      theme: data.theme ?? null,
      isPublic: data.isPublic,
      totalPrice,
      items: {
        create: data.items.map((item, i) => ({
          componentId: item.componentId,
          quantity: item.quantity,
          position: item.position ?? undefined,
          sortOrder: i,
        })),
      },
    },
    include: {
      items: {
        include: { component: { select: { id: true, name: true, brand: true, imageUrl: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

/** Update a setup (owner only). */
export async function updateSetup(id: string, userId: string, data: UpdateSetupInput) {
  const existing = await prisma.setup.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const totalPrice = data.items ? await calculateTotalPrice(data.items) : undefined;

  // If items are being replaced, delete old ones and recreate
  if (data.items) {
    await prisma.setupItem.deleteMany({ where: { setupId: id } });
  }

  return prisma.setup.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.slug ? { slug: data.slug } : {}),
      ...(data.roomType ? { roomType: data.roomType } : {}),
      ...(data.roomDimensions !== undefined ? { roomDimensions: data.roomDimensions } : {}),
      ...(data.theme !== undefined ? { theme: data.theme } : {}),
      ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
      ...(totalPrice !== undefined ? { totalPrice } : {}),
      ...(data.items ? {
        items: {
          create: data.items.map((item, i) => ({
            componentId: item.componentId,
            quantity: item.quantity,
            position: item.position ?? undefined,
            sortOrder: i,
          })),
        },
      } : {}),
    },
    include: {
      items: {
        include: { component: { select: { id: true, name: true, brand: true, imageUrl: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

/** Delete a setup (owner only). Returns true if deleted. */
export async function deleteSetup(id: string, userId: string): Promise<boolean> {
  const existing = await prisma.setup.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.setup.delete({ where: { id } });
  return true;
}

/** Clone a setup to the current user's account. */
export async function cloneSetup(sourceId: string, userId: string, name?: string) {
  const source = await prisma.setup.findUnique({
    where: { id: sourceId },
    include: { items: true },
  });
  if (!source || (!source.isPublic && source.userId !== userId)) return null;

  const slug = slugify(name ?? `${source.name}-clone`);
  return prisma.setup.create({
    data: {
      userId,
      name: name ?? `${source.name} (Clone)`,
      slug: `${slug}-${Date.now().toString(36)}`,
      roomType: source.roomType,
      roomDimensions: source.roomDimensions ?? undefined,
      theme: source.theme,
      isPublic: false,
      totalPrice: source.totalPrice,
      items: {
        create: source.items.map((item) => ({
          componentId: item.componentId,
          quantity: item.quantity,
          position: item.position ?? undefined,
          sortOrder: item.sortOrder,
        })),
      },
    },
    include: {
      items: {
        include: { component: { select: { id: true, name: true, brand: true, imageUrl: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

/** Toggle like on a setup. Returns { liked: boolean, count: number }. */
export async function toggleLike(setupId: string, userId: string): Promise<{ liked: boolean; count: number }> {
  const existing = await prisma.setupLike.findUnique({
    where: { setupId_userId: { setupId, userId } },
  });
  if (existing) {
    await prisma.setupLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.setupLike.create({ data: { setupId, userId } });
  }
  const count = await prisma.setupLike.count({ where: { setupId } });
  return { liked: !existing, count };
}

/** Increment view count (fire-and-forget safe). */
export async function incrementView(setupId: string): Promise<void> {
  await prisma.setup.update({
    where: { id: setupId },
    data: { viewCount: { increment: 1 } },
  });
}

// --- Helpers ---

async function calculateTotalPrice(items: { componentId: string; quantity?: number }[]): Promise<number> {
  if (items.length === 0) return 0;
  const componentIds = items.map((i) => i.componentId);
  const components = await prisma.component.findMany({
    where: { id: { in: componentIds } },
    include: { prices: { where: { isAvailable: true }, orderBy: { price: "asc" }, take: 1 } },
  });
  const priceMap = new Map(components.map((c) => [c.id, c.prices[0]?.price ?? 0]));
  return items.reduce((sum, item) => {
    const price = Number(priceMap.get(item.componentId) ?? 0);
    return sum + price * (item.quantity ?? 1);
  }, 0);
}

