import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

/** Query params for GET /api/v1/themes (API_DESIGN.md §6). */
export const listThemesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  featured: z.coerce.boolean().optional(),
});

export type ListThemesQuery = z.infer<typeof listThemesQuerySchema>;
