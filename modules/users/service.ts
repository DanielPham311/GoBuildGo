import { Prisma, SubscriptionType } from "@prisma/client";
import { prisma } from "@/shared/db";
import type { UpdateProfileInput, UpdateEmailSettingsInput } from "./schema";

export class UserError extends Error {
  constructor(
    public code: "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "UserError";
  }
}

/** Current user's profile with aggregate counts. */
export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { setups: true, favorites: true, setupLikes: true } } },
  });
  if (!user) throw new UserError("NOT_FOUND", "User not found");
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const data: Prisma.UserUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.image !== undefined) data.image = input.image;
  if (input.bio !== undefined) data.bio = input.bio;
  if (input.location !== undefined) data.location = input.location;
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    include: { _count: { select: { setups: true, favorites: true, setupLikes: true } } },
  });
  return user;
}

/** Toggle a component favorite; returns the new state. */
export async function toggleFavorite(userId: string, componentId: string) {
  const component = await prisma.component.findUnique({
    where: { id: componentId },
    select: { id: true },
  });
  if (!component) throw new UserError("NOT_FOUND", "Component not found");

  const existing = await prisma.userFavorite.findUnique({
    where: { userId_componentId: { userId, componentId } },
  });
  if (existing) {
    await prisma.userFavorite.delete({ where: { id: existing.id } });
    return { favorited: false, componentId };
  }
  await prisma.userFavorite.create({ data: { userId, componentId } });
  return { favorited: true, componentId };
}

/** Add a favorite; idempotent (no error if already favorited). */
export async function addFavorite(userId: string, componentId: string) {
  const component = await prisma.component.findUnique({
    where: { id: componentId },
    select: { id: true },
  });
  if (!component) throw new UserError("NOT_FOUND", "Component not found");
  await prisma.userFavorite.upsert({
    where: { userId_componentId: { userId, componentId } },
    create: { userId, componentId },
    update: {},
  });
  return { favorited: true, componentId };
}

/** Remove a favorite; idempotent. */
export async function removeFavorite(userId: string, componentId: string) {
  await prisma.userFavorite.deleteMany({ where: { userId, componentId } });
  return { favorited: false, componentId };
}

/** Map the three SubscriptionType rows to the boolean settings shape. */
export async function getEmailSettings(userId: string) {
  const subs = await prisma.emailSubscription.findMany({ where: { userId } });
  const active = (type: SubscriptionType) =>
    subs.find((s) => s.subscriptionType === type)?.isActive ?? false;
  return {
    priceAlerts: active(SubscriptionType.price_alert),
    weeklyDigest: active(SubscriptionType.weekly_digest),
    promotions: active(SubscriptionType.promotions),
  };
}

export async function updateEmailSettings(userId: string, input: UpdateEmailSettingsInput) {
  const upserts: Array<{ type: SubscriptionType; isActive: boolean }> = [];
  if (input.priceAlerts !== undefined)
    upserts.push({ type: SubscriptionType.price_alert, isActive: input.priceAlerts });
  if (input.weeklyDigest !== undefined)
    upserts.push({ type: SubscriptionType.weekly_digest, isActive: input.weeklyDigest });
  if (input.promotions !== undefined)
    upserts.push({ type: SubscriptionType.promotions, isActive: input.promotions });

  await prisma.$transaction(
    upserts.map((u) =>
      prisma.emailSubscription.upsert({
        where: { userId_subscriptionType: { userId, subscriptionType: u.type } },
        create: { userId, subscriptionType: u.type, isActive: u.isActive },
        update: { isActive: u.isActive },
      }),
    ),
  );
  return getEmailSettings(userId);
}

/** Current user's favorited components, newest first. */
export async function listFavorites(userId: string, page: number, limit: number) {
  const where = { userId };
  const [rows, total] = await Promise.all([
    prisma.userFavorite.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        component: { include: { prices: { orderBy: { price: "asc" }, take: 1 } } },
      },
    }),
    prisma.userFavorite.count({ where }),
  ]);
  return { rows, total };
}
