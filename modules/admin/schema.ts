import { z } from "zod";
import { COMPONENT_CATEGORIES, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

/** Query params for GET /api/v1/admin/components (admin list — includes inactive). */
export const listAdminComponentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  category: z.enum(COMPONENT_CATEGORIES).optional(),
  search: z.string().min(1).optional(),
});

/** Body for POST /api/v1/admin/components. */
export const createComponentSchema = z.object({
  category: z.enum(COMPONENT_CATEGORIES),
  brand: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  colors: z.array(z.string()).optional(),
  styleTags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

/** Body for PATCH /api/v1/admin/components/[id] — all fields optional. */
export const updateComponentSchema = createComponentSchema.partial();

/** Query params for GET /api/v1/admin/prompts. */
export const listPromptLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  type: z.enum(["search", "visualize"]).optional(),
});

export type ListPromptLogsQuery = z.infer<typeof listPromptLogsQuerySchema>;

export type ListAdminComponentsQuery = z.infer<typeof listAdminComponentsQuerySchema>;
export type CreateComponentInput = z.infer<typeof createComponentSchema>;
export type UpdateComponentInput = z.infer<typeof updateComponentSchema>;
