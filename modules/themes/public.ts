import type { Theme } from "@prisma/client";

export type PublicTheme = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  colorPalette: string[];
  styleTags: string[];
  isFeatured: boolean;
};

export function toPublicTheme(t: Theme): PublicTheme {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    coverImageUrl: t.coverImageUrl,
    colorPalette: t.colorPalette,
    styleTags: t.styleTags,
    isFeatured: t.isFeatured,
  };
}
