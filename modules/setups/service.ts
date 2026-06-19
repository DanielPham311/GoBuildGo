import { prisma } from "@/shared/db";

/** Public (shared) setups, newest first. */
export async function listPublicSetups(page: number, limit: number) {
  const where = { isPublic: true };
  const [items, total] = await Promise.all([
    prisma.setup.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.setup.count({ where }),
  ]);
  return { items, total };
}

// TODO: createSetup, updateSetup, deleteSetup, cloneSetup, toggleLike (API_DESIGN.md §5).
// These mutate user-owned data — call requireUser() and writeAuditLog() from the handler.
