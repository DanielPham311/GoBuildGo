import type { NormalizedProduct } from "./types";

/** Vietnamese + English keyword mappings for category inference. */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  desk: ["bàn làm việc", "desk", "standing desk", "bàn"],
  chair: ["ghế", "chair", "gaming chair", "office chair"],
  monitor: ["màn hình", "monitor", "display", "screen"],
  keyboard: ["bàn phím", "keyboard", "mechanical"],
  mouse: ["chuột", "mouse"],
  lighting: ["đèn", "light", "lamp", "led", "rgb"],
  audio: ["tai nghe", "headset", "headphone", "speaker", "loa"],
  decor: ["kệ", "shelf", "cable", "decor", "trang trí", "plant", "mat", "pad", "arm"],
  accessory: [],
};

const COLOR_MAP: Record<string, string[]> = {
  black: ["đen", "black"],
  white: ["trắng", "white"],
  red: ["đỏ", "red"],
  blue: ["xanh dương", "blue"],
  green: ["xanh lá", "green"],
  pink: ["hồng", "pink"],
  silver: ["bạc", "silver"],
  gray: ["xám", "gray", "grey"],
  gold: ["vàng", "gold"],
  rgb: ["rgb"],
};

const STYLE_KEYWORDS: Record<string, string[]> = {
  gaming: ["gaming", "esport", "game"],
  office: ["office", "văn phòng", "công sở", "work"],
  minimal: ["minimal", "minimalist", "đơn giản", "simple"],
  rgb: ["rgb", "led", "lighting"],
  professional: ["pro", "professional", "chuyên nghiệp"],
  premium: ["cao cấp", "premium", "luxury", "pro"],
  ergonomic: ["ergonomic", "ergo"],
  smart: ["smart", "thông minh"],
};

/**
 * Clean a normalized product: normalize text, infer missing fields,
 * strip promotional noise, ensure valid category.
 */
export function cleanProduct(p: NormalizedProduct): NormalizedProduct {
  return {
    ...p,
    name: cleanName(p.name),
    brand: cleanBrand(p.brand),
    description: p.description ? cleanText(p.description) : null,
    category: validateCategory(p.category, p.name),
    colors: p.colors.length > 0 ? p.colors : inferColors(p.name),
    styleTags: p.styleTags.length > 0 ? p.styleTags : inferStyleTags(p.name, p.category),
    specs: p.specs,
  };
}

function cleanName(name: string): string {
  return name
    .replace(/[\[\]【】()（）]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\b(HÀNG CÓ SẴN|HÀNG CHÍNH HÃNG|FLASH SALE|GIẢM GIÁ|FREESHIP|MIỄN PHÍ VẬN CHUYỂN)\b/gi, "")
    .replace(/[-–—]\s*$/, "")
    .trim();
}

function cleanBrand(brand: string): string {
  if (brand === "No Brand" || brand === "Unknown" || brand === "Generic") return "Generic";
  return brand.trim();
}

function validateCategory(cat: string, name: string): string {
  const valid = ["desk", "chair", "monitor", "keyboard", "mouse", "lighting", "decor", "audio", "accessory"];
  if (valid.includes(cat)) return cat;
  // Re-infer from name if category is invalid
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => name.toLowerCase().includes(kw))) {
      return category;
    }
  }
  return "accessory";
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function inferColors(name: string): string[] {
  const colors: string[] = [];
  const lower = name.toLowerCase();
  for (const [color, keywords] of Object.entries(COLOR_MAP)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      colors.push(color);
    }
  }
  return colors;
}

function inferStyleTags(name: string, category: string): string[] {
  const tags: string[] = [];
  const lower = name.toLowerCase();
  for (const [tag, keywords] of Object.entries(STYLE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      tags.push(tag);
    }
  }
  if (tags.length === 0) tags.push("versatile");
  return tags;
}
