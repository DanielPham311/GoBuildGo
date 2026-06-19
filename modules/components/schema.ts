import { z } from "zod";
import { COMPONENT_CATEGORIES, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

export const componentSortValues = [
  "newest",
  "name_asc",
  "price_asc",
  "price_desc",
  "popular",
] as const;

/** Query params for GET /api/v1/components (API_DESIGN.md §4). */
export const listComponentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  category: z.enum(COMPONENT_CATEGORIES).optional(),
  brand: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
  sort: z.enum(componentSortValues).default("newest"),
});

export type ListComponentsQuery = z.infer<typeof listComponentsQuerySchema>;
