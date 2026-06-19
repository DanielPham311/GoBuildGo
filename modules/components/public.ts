import type { Component } from "@prisma/client";

/** API-safe component shape (drops internal flags + timestamps). */
export type PublicComponent = {
  id: string;
  category: string;
  brand: string;
  name: string;
  slug: string;
  description: string | null;
  specs: unknown;
  colors: string[];
  styleTags: string[];
  imageUrl: string | null;
  dimensions: unknown;
};

export function toPublicComponent(c: Component): PublicComponent {
  return {
    id: c.id,
    category: c.category,
    brand: c.brand,
    name: c.name,
    slug: c.slug,
    description: c.description,
    specs: c.specs,
    colors: c.colors,
    styleTags: c.styleTags,
    imageUrl: c.imageUrl,
    dimensions: c.dimensions,
  };
}
