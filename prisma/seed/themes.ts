import type { PrismaClient } from "@prisma/client";
import { slugify } from "@/lib/utils";

type ThemeComponent = {
  /** brand-name slug suffix — matches the slug generated in seedComponents */
  slugSuffix: string;
  sortOrder: number;
};

type SeedTheme = {
  name: string;
  description: string;
  colorPalette: string[];
  styleTags: string[];
  isFeatured: boolean;
  components: ThemeComponent[];
};

const SEED_THEMES: SeedTheme[] = [
  {
    name: "Japandi",
    description: "Japanese-Scandinavian fusion. Warm wood tones, natural materials, clean lines, and a sense of calm. Minimal but cozy.",
    colorPalette: ["#F5F0E8", "#D4C5A9", "#8B7355", "#4A4A4A", "#2C2C2C"],
    styleTags: ["minimal", "warm", "natural", "cozy"],
    isFeatured: true,
    components: [
      { slugSuffix: "ikea-bekant-desk-120x60", sortOrder: 1 },
      { slugSuffix: "ikea-markus-office-chair", sortOrder: 2 },
      { slugSuffix: "xiaomi-desk-lamp-pro", sortOrder: 3 },
      { slugSuffix: "ikea-lack-wall-shelf-78x26", sortOrder: 4 },
      { slugSuffix: "grovemade-headphone-stand-pro", sortOrder: 5 },
    ],
  },
  {
    name: "Industrial",
    description: "Raw and urban. Dark metals, exposed materials, utilitarian design. Inspired by converted lofts and workshops.",
    colorPalette: ["#1A1A1A", "#3D3D3D", "#6B6B6B", "#8B6914", "#C4A35A"],
    styleTags: ["dark", "raw", "urban", "metal"],
    isFeatured: false,
    components: [
      { slugSuffix: "secretlab-magnus-pro-desk", sortOrder: 1 },
      { slugSuffix: "logitech-g-pro-x-tkl", sortOrder: 2 },
      { slugSuffix: "ergotron-m75-monitor-arm", sortOrder: 3 },
      { slugSuffix: "govee-rgbic-floor-lamp", sortOrder: 4 },
      { slugSuffix: "sony-wh1000xm5", sortOrder: 5 },
    ],
  },
  {
    name: "Minimalist",
    description: "Less is more. Clean white surfaces, hidden cables, and only the essentials. A clutter-free workspace.",
    colorPalette: ["#FFFFFF", "#F8F8F8", "#E0E0E0", "#BDBDBD", "#9E9E9E"],
    styleTags: ["minimal", "clean", "white", "simple"],
    isFeatured: true,
    components: [
      { slugSuffix: "flexispot-e7-pro-standing-desk", sortOrder: 1 },
      { slugSuffix: "keychron-k8-pro-wireless", sortOrder: 2 },
      { slugSuffix: "dell-u2723qe-27-4k-usb-c", sortOrder: 3 },
      { slugSuffix: "benq-screenbar-halo", sortOrder: 4 },
      { slugSuffix: "anker-usb-c-hub-7-in-1", sortOrder: 5 },
      { slugSuffix: "logitech-g-pro-x-superlight-2", sortOrder: 6 },
    ],
  },
  {
    name: "Gaming RGB",
    description: "Bold and aggressive. Black surfaces with RGB lighting, high-refresh monitors, and gaming peripherals.",
    colorPalette: ["#0D0D0D", "#1A1A2E", "#16213E", "#E94560", "#0F3460"],
    styleTags: ["gaming", "rgb", "dark", "aggressive"],
    isFeatured: true,
    components: [
      { slugSuffix: "secretlab-titan-evo-2024-gaming-chair", sortOrder: 1 },
      { slugSuffix: "samsung-odyssey-g7-32-qhd-240hz", sortOrder: 2 },
      { slugSuffix: "razer-blackwidow-v4-pro", sortOrder: 3 },
      { slugSuffix: "logitech-g-pro-x-superlight-2", sortOrder: 4 },
      { slugSuffix: "govee-rgbic-floor-lamp", sortOrder: 5 },
      { slugSuffix: "secretlab-desk-mat-xxl", sortOrder: 6 },
    ],
  },
  {
    name: "Retro",
    description: "Warm nostalgia. Vintage-inspired pieces, warm wood tones, and classic designs that never go out of style.",
    colorPalette: ["#F4E4C1", "#D2B48C", "#8B4513", "#5C4033", "#3E2723"],
    styleTags: ["retro", "warm", "vintage", "classic"],
    isFeatured: false,
    components: [
      { slugSuffix: "ikea-bekant-desk-120x60", sortOrder: 1 },
      { slugSuffix: "leopold-fc750r-pd", sortOrder: 2 },
      { slugSuffix: "jbl-flip-6-bluetooth-speaker", sortOrder: 3 },
      { slugSuffix: "ikea-lack-wall-shelf-78x26", sortOrder: 4 },
      { slugSuffix: "logitech-c920-hd-pro-webcam", sortOrder: 5 },
    ],
  },
  {
    name: "Scandinavian",
    description: "Light, airy, and functional. Pale woods, soft pastels, and hygge-inspired coziness. Danish design principles.",
    colorPalette: ["#FAFAF8", "#E8E4DF", "#C9C2B6", "#A8B5A0", "#7B8A6E"],
    styleTags: ["scandinavian", "light", "airy", "hygge"],
    isFeatured: false,
    components: [
      { slugSuffix: "ikea-bekant-desk-120x60", sortOrder: 1 },
      { slugSuffix: "sihoo-doro-s300-ergonomic-chair", sortOrder: 2 },
      { slugSuffix: "benq-screenbar-halo", sortOrder: 3 },
      { slugSuffix: "xiaomi-desk-lamp-pro", sortOrder: 4 },
      { slugSuffix: "anker-usb-c-hub-7-in-1", sortOrder: 5 },
    ],
  },
];

export async function seedThemes(prisma: PrismaClient): Promise<void> {
  console.log(`  themes: seeding ${SEED_THEMES.length} themes…`);

  for (const t of SEED_THEMES) {
    const slug = slugify(t.name);

    const theme = await prisma.theme.upsert({
      where: { slug },
      create: {
        slug,
        name: t.name,
        description: t.description,
        colorPalette: t.colorPalette,
        styleTags: t.styleTags,
        isFeatured: t.isFeatured,
      },
      update: {
        name: t.name,
        description: t.description,
        colorPalette: t.colorPalette,
        styleTags: t.styleTags,
        isFeatured: t.isFeatured,
      },
    });

    // Link components to theme. We need to find each component by slug.
    for (const tc of t.components) {
      // Find the component by matching slug suffix (since full slug = cuid-like prefix + suffix)
      const component = await prisma.component.findFirst({
        where: { slug: { endsWith: tc.slugSuffix } },
        select: { id: true },
      });

      if (!component) {
        console.warn(`    theme "${t.name}": component with slug suffix "${tc.slugSuffix}" not found, skipping`);
        continue;
      }

      await prisma.themeComponent.upsert({
        where: {
          themeId_componentId: {
            themeId: theme.id,
            componentId: component.id,
          },
        },
        create: {
          themeId: theme.id,
          componentId: component.id,
          sortOrder: tc.sortOrder,
        },
        update: {
          sortOrder: tc.sortOrder,
        },
      });
    }
  }

  console.log(`  themes: done (${SEED_THEMES.length} themes).`);
}
