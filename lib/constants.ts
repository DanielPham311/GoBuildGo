/** App-wide constants. Mirror Prisma enums in docs/database-design.md §7. */

export const COMPONENT_CATEGORIES = [
  "desk",
  "chair",
  "monitor",
  "keyboard",
  "mouse",
  "lighting",
  "decor",
  "audio",
  "accessory",
] as const;
export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number];

export const ROOM_TYPES = ["bedroom", "gaming_room", "office", "studio"] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const SHOPS = ["goodspace", "apshop"] as const;
export type Shop = (typeof SHOPS)[number];

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;
