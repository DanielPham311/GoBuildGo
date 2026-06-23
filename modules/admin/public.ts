import type { Component, PromptLog } from "@prisma/client";

/** Admin component row — includes flags + price count the public DTO hides. */
export type AdminComponent = {
  id: string;
  category: string;
  brand: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  colors: string[];
  styleTags: string[];
  isActive: boolean;
  embeddingStale: boolean;
  priceCount: number;
  createdAt: string;
  updatedAt: string;
};

type ComponentWithCount = Component & { _count?: { prices: number } };

export function toAdminComponent(c: ComponentWithCount): AdminComponent {
  return {
    id: c.id,
    category: c.category,
    brand: c.brand,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    colors: c.colors,
    styleTags: c.styleTags,
    isActive: c.isActive,
    embeddingStale: c.embeddingStale,
    priceCount: c._count?.prices ?? 0,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/** Admin prompt-log row with the (optional) author. */
export type AdminPromptLog = {
  id: string;
  type: string;
  prompt: string;
  resultCount: number;
  itemIds: string[];
  imageUrl: string | null;
  user: { id: string; name: string | null; email: string | null } | null;
  createdAt: string;
};

type PromptLogWithUser = PromptLog & {
  user: { id: string; name: string | null; email: string | null } | null;
};

export function toAdminPromptLog(p: PromptLogWithUser): AdminPromptLog {
  return {
    id: p.id,
    type: p.type,
    prompt: p.prompt,
    resultCount: p.resultCount,
    itemIds: p.itemIds,
    imageUrl: p.imageUrl,
    user: p.user,
    createdAt: p.createdAt.toISOString(),
  };
}
