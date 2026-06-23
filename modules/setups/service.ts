import { Prisma } from "@prisma/client";
import type { RoomType } from "@prisma/client";
import { prisma } from "@/shared/db";
import { slugify } from "@/lib/utils";
import type { CreateSetupInput, UpdateSetupInput, ListSetupsQuery } from "./schema";
import { toPublicSetup, type PublicSetup } from "./public";

/** Domain errors raised by the service; handlers map `.code` → HTTP status. */
export class SetupError extends Error {
  constructor(
    public code: "NOT_FOUND" | "FORBIDDEN" | "INVALID_COMPONENT" | "DUPLICATE_SLUG",
    message: string,
  ) {
    super(message);
    this.name = "SetupError";
  }
}

/** Include shape for the full setup detail (matches API_DESIGN.md §5 GET). */
const detailInclude = {
  user: { select: { id: true, name: true, image: true } },
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      component: {
        include: { prices: { orderBy: { price: "asc" as const }, take: 1 } },
      },
    },
  },
  _count: { select: { likes: true } },
} satisfies Prisma.SetupInclude;

export type SetupDetail = Prisma.SetupGetPayload<{ include: typeof detailInclude }>;

/** List public setups with filtering, sorting, pagination. */
export async function listPublicSetups(
  query: ListSetupsQuery,
): Promise<{ items: PublicSetup[]; total: number }> {
  const { page, limit, roomType, theme, sort } = query;
  const where: Prisma.SetupWhereInput = {
    isPublic: true,
    ...(roomType ? { roomType } : {}),
    ...(theme ? { theme } : {}),
  };
  const orderBy =
    sort === "popular" ? { viewCount: "desc" as const } : { createdAt: "desc" as const };
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

/** Current user's setups, newest first. */
export async function listUserSetups(
  userId: string,
  page: number,
  limit: number,
  includePrivate: boolean,
) {
  const where: Prisma.SetupWhereInput = {
    userId,
    ...(includePrivate ? {} : { isPublic: true }),
  };
  const [items, total] = await Promise.all([
    prisma.setup.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { likes: true, items: true } } },
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

/** Setup detail with items + author + like count. Throws on missing/private. */
export async function getSetup(id: string, viewerId?: string): Promise<SetupDetail> {
  const setup = await prisma.setup.findUnique({ where: { id }, include: detailInclude });
  if (!setup) throw new SetupError("NOT_FOUND", "Setup not found");
  if (!setup.isPublic && setup.userId !== viewerId) {
    throw new SetupError("FORBIDDEN", "This setup is private");
  }
  return setup;
}

/** Whether the viewer has liked this setup. */
export async function isLikedBy(setupId: string, userId?: string): Promise<boolean> {
  if (!userId) return false;
  const like = await prisma.setupLike.findUnique({
    where: { setupId_userId: { setupId, userId } },
  });
  return Boolean(like);
}

/** Sum of lowest price per item × quantity. */
async function computeTotalPrice(
  componentIds: string[],
  quantities: Record<string, number>,
): Promise<Prisma.Decimal> {
  if (componentIds.length === 0) return new Prisma.Decimal(0);
  const cheapest = await prisma.price.groupBy({
    by: ["componentId"],
    where: { componentId: { in: componentIds } },
    _min: { price: true },
  });
  return cheapest.reduce((sum, row) => {
    const min = row._min.price ?? new Prisma.Decimal(0);
    return sum.add(min.mul(quantities[row.componentId] ?? 1));
  }, new Prisma.Decimal(0));
}

/** Validate component IDs exist; throw INVALID_COMPONENT for the first missing. */
async function assertComponentsExist(ids: string[]) {
  if (ids.length === 0) return;
  const found = await prisma.component.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const foundSet = new Set(found.map((c) => c.id));
  const missing = ids.find((id) => !foundSet.has(id));
  if (missing) throw new SetupError("INVALID_COMPONENT", `Component "${missing}" not found`);
}

/** Generate a unique slug from a base; appends -2, -3… on collision. */
async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "setup";
  let candidate = root;
  for (let n = 2; ; n++) {
    const existing = await prisma.setup.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${root}-${n}`;
  }
}

function buildItemsCreate(items: CreateSetupInput["items"]) {
  return items.map((it, i) => ({
    componentId: it.componentId,
    quantity: it.quantity,
    position: it.position ? (it.position as Prisma.InputJsonValue) : undefined,
    sortOrder: i,
  }));
}

export async function createSetup(userId: string, input: CreateSetupInput): Promise<SetupDetail> {
  const itemIds = input.items.map((i) => i.componentId);
  await assertComponentsExist(itemIds);

  const quantities = Object.fromEntries(input.items.map((i) => [i.componentId, i.quantity]));
  const totalPrice = await computeTotalPrice(itemIds, quantities);

  let slug: string;
  if (input.slug) {
    const clash = await prisma.setup.findUnique({ where: { slug: input.slug } });
    if (clash) throw new SetupError("DUPLICATE_SLUG", "A setup with this slug already exists");
    slug = input.slug;
  } else {
    slug = await uniqueSlug(input.name);
  }

  const created = await prisma.setup.create({
    data: {
      userId,
      name: input.name,
      slug,
      roomType: input.roomType as RoomType,
      roomDimensions: input.roomDimensions
        ? (input.roomDimensions as Prisma.InputJsonValue)
        : undefined,
      theme: input.theme,
      isPublic: input.isPublic,
      totalPrice,
      items: { create: buildItemsCreate(input.items) },
    },
    include: detailInclude,
  });
  return created;
}

export async function updateSetup(
  id: string,
  userId: string,
  input: UpdateSetupInput,
): Promise<SetupDetail> {
  const owned = await prisma.setup.findUnique({ where: { id }, select: { userId: true } });
  if (!owned) throw new SetupError("NOT_FOUND", "Setup not found");
  if (owned.userId !== userId) throw new SetupError("FORBIDDEN", "You do not own this setup");

  const data: Prisma.SetupUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.roomType !== undefined) data.roomType = input.roomType as RoomType;
  if (input.roomDimensions !== undefined) {
    data.roomDimensions = input.roomDimensions as Prisma.InputJsonValue;
  }
  if (input.theme !== undefined) data.theme = input.theme;
  if (input.isPublic !== undefined) data.isPublic = input.isPublic;

  if (input.slug !== undefined) {
    const clash = await prisma.setup.findUnique({ where: { slug: input.slug } });
    if (clash && clash.id !== id) {
      throw new SetupError("DUPLICATE_SLUG", "A setup with this slug already exists");
    }
    data.slug = input.slug;
  }

  // Items are replaced wholesale when provided (matches PATCH semantics in §5).
  if (input.items !== undefined) {
    const itemIds = input.items.map((i) => i.componentId);
    await assertComponentsExist(itemIds);
    const quantities = Object.fromEntries(input.items.map((i) => [i.componentId, i.quantity]));
    data.totalPrice = await computeTotalPrice(itemIds, quantities);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (input.items !== undefined) {
      await tx.setupItem.deleteMany({ where: { setupId: id } });
      await tx.setupItem.createMany({
        data: buildItemsCreate(input.items).map((it) => ({ ...it, setupId: id })),
      });
    }
    return tx.setup.update({ where: { id }, data, include: detailInclude });
  });
  return updated;
}

export async function deleteSetup(id: string, userId: string): Promise<void> {
  const owned = await prisma.setup.findUnique({ where: { id }, select: { userId: true } });
  if (!owned) throw new SetupError("NOT_FOUND", "Setup not found");
  if (owned.userId !== userId) throw new SetupError("FORBIDDEN", "You do not own this setup");
  await prisma.setup.delete({ where: { id } });
}

export async function cloneSetup(
  id: string,
  userId: string,
  name?: string,
): Promise<SetupDetail> {
  const source = await prisma.setup.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!source) throw new SetupError("NOT_FOUND", "Source setup not found");

  const slug = await uniqueSlug(name ?? `${source.name} (copy)`);
  const clone = await prisma.setup.create({
    data: {
      userId,
      name: name ?? source.name,
      slug,
      roomType: source.roomType,
      roomDimensions: source.roomDimensions ?? Prisma.JsonNull,
      theme: source.theme,
      isPublic: false,
      totalPrice: source.totalPrice,
      items: {
        create: source.items.map((it) => ({
          componentId: it.componentId,
          quantity: it.quantity,
          position: it.position ?? Prisma.JsonNull,
          sortOrder: it.sortOrder,
        })),
      },
    },
    include: detailInclude,
  });
  return clone;
}

/** Toggle a like; returns the new state + count. */
export async function toggleLike(setupId: string, userId: string) {
  const setup = await prisma.setup.findUnique({ where: { id: setupId }, select: { id: true } });
  if (!setup) throw new SetupError("NOT_FOUND", "Setup not found");

  const existing = await prisma.setupLike.findUnique({
    where: { setupId_userId: { setupId, userId } },
  });
  if (existing) {
    await prisma.setupLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.setupLike.create({ data: { setupId, userId } });
  }
  const likeCount = await prisma.setupLike.count({ where: { setupId } });
  return { liked: !existing, likeCount };
}
