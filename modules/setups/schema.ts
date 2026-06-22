import { z } from "zod";
import { RoomType } from "@prisma/client";

/** POST /api/v1/setups — create a setup. */
export const createSetupSchema = z.object({
  name: z.string().min(3).max(100),
  slug: z.string().min(3).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  roomType: z.nativeEnum(RoomType),
  roomDimensions: z.object({
    width: z.number().positive(),
    depth: z.number().positive(),
    height: z.number().positive().optional(),
  }).optional(),
  theme: z.string().optional(),
  isPublic: z.boolean().default(false),
  items: z.array(z.object({
    componentId: z.string(),
    quantity: z.number().int().min(1).max(20).default(1),
    position: z.object({ x: z.number(), y: z.number() }).optional(),
  })).max(50).default([]),
});

export type CreateSetupInput = z.infer<typeof createSetupSchema>;

/** PATCH /api/v1/setups/[id] — update a setup. */
export const updateSetupSchema = createSetupSchema.partial();

export type UpdateSetupInput = z.infer<typeof updateSetupSchema>;

/** POST /api/v1/setups/[id]/clone — clone a setup. */
export const cloneSetupSchema = z.object({
  name: z.string().min(3).max(100).optional(),
});

/** GET /api/v1/setups — list query. */
export const listSetupsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  roomType: z.nativeEnum(RoomType).optional(),
  theme: z.string().optional(),
  sort: z.enum(["newest", "popular"]).default("newest"),
});

export type ListSetupsQuery = z.infer<typeof listSetupsQuerySchema>;
