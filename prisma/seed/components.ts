import type { PrismaClient, Prisma } from "@prisma/client";
import { slugify } from "@/lib/utils";

type SeedPrice = {
  shop: "goodspace" | "apshop";
  price: number;
  originalPrice?: number;
  url: string;
  shopName: string;
  isAvailable?: boolean;
};

type SeedComponent = {
  name: string;
  brand: string;
  category: "desk" | "chair" | "monitor" | "keyboard" | "mouse" | "lighting" | "decor" | "audio" | "accessory";
  description: string;
  specs: Record<string, unknown>;
  colors: string[];
  styleTags: string[];
  imageUrl?: string;
  prices: SeedPrice[];
};

const SEED_COMPONENTS: SeedComponent[] = [
  // --- DESK (4) ---
  {
    name: "BEKANT Desk 120x60",
    brand: "IKEA",
    category: "desk",
    description: "A spacious 120x60cm desk with a sturdy steel frame and a warm oak veneate top. Perfect for home office setups.",
    specs: { width: 120, depth: 60, height: 75, material: "steel+oak_veneer", max_load_kg: 50 },
    colors: ["white", "brown"],
    styleTags: ["scandinavian", "minimal"],
    prices: [
      { shop: "goodspace", price: 2490000, url: "https://goodspace.art/ban-nang-ha/ikea-bekant", shopName: "GoodSpace" },
    ],
  },
  {
    name: "E7 Pro Standing Desk",
    brand: "FlexiSpot",
    category: "desk",
    description: "Electric height-adjustable standing desk with dual motors, memory presets, and a bamboo top. Whisper-quiet operation.",
    specs: { width: 160, depth: 80, height: "62-125", material: "steel+bamboo", max_load_kg: 125, motors: 2, memory_presets: 3 },
    colors: ["black", "white"],
    styleTags: ["modern", "professional"],
    prices: [
      { shop: "goodspace", price: 8990000, url: "https://goodspace.art/ban-nang-ha/flexispot-e7", shopName: "GoodSpace" },
    ],
  },
  {
    name: "MAGNUS Pro Desk",
    brand: "Secretlab",
    category: "desk",
    description: "Premium metal gaming desk with integrated cable management, magnetic accessories, and a sleek black design.",
    specs: { width: 150, depth: 65, height: 75, material: "steel", max_load_kg: 150, cable_management: true },
    colors: ["black"],
    styleTags: ["gaming", "premium"],
    prices: [
      { shop: "goodspace", price: 12900000, url: "https://goodspace.art/ban-nang-ha/secretlab-magnus", shopName: "GoodSpace" },
    ],
  },
  {
    name: "Smart Desk Pro",
    brand: "Xiaomi",
    category: "desk",
    description: "Smart electric standing desk with app control, USB-C charging, and child safety lock. Modern white finish.",
    specs: { width: 140, depth: 70, height: "65-125", material: "steel+MDF", max_load_kg: 80, usb_c: true, app_control: true },
    colors: ["white"],
    styleTags: ["modern", "smart"],
    prices: [
      { shop: "goodspace", price: 7490000, url: "https://goodspace.art/ban-nang-ha/xiaomi-smart-desk", shopName: "GoodSpace" },
    ],
  },

  // --- CHAIR (4) ---
  {
    name: "TITAN Evo 2024 Gaming Chair",
    brand: "Secretlab",
    category: "chair",
    description: "Ergonomic gaming chair with 4-way lumbar support, magnetic head pillow, and premium leatherette upholstery.",
    specs: { seat_width: 52, max_weight_kg: 130, recline_degrees: 165, armrest: "4D", material: "leatherette" },
    colors: ["black", "white"],
    styleTags: ["gaming", "premium"],
    prices: [
      { shop: "goodspace", price: 11900000, url: "https://goodspace.art/ghe-cong-thai-hoc/secretlab-titan", shopName: "GoodSpace" },
    ],
  },
  {
    name: "MARKUS Office Chair",
    brand: "IKEA",
    category: "chair",
    description: "Comfortable mesh office chair with a high backrest and 10-year warranty. Great value for long work sessions.",
    specs: { seat_width: 48, max_weight_kg: 110, recline_degrees: 129, armrest: "fixed", material: "mesh+fabric" },
    colors: ["black", "grey"],
    styleTags: ["office", "minimal"],
    prices: [
      { shop: "goodspace", price: 3990000, url: "https://goodspace.art/ghe-cong-thai-hoc/ikea-markus", shopName: "GoodSpace" },
    ],
  },
  {
    name: "Doro S300 Ergonomic Chair",
    brand: "Sihoo",
    category: "chair",
    description: "Ergonomic office chair with dual lumbar support, breathable mesh, and adjustable headrest. Popular in Vietnam.",
    specs: { seat_width: 50, max_weight_kg: 120, recline_degrees: 135, armrest: "3D", material: "mesh" },
    colors: ["black"],
    styleTags: ["office", "ergonomic"],
    prices: [
      { shop: "goodspace", price: 3490000, url: "https://goodspace.art/ghe-cong-thai-hoc/sihoo-doro", shopName: "GoodSpace" },
    ],
  },
  {
    name: "Aeron Remastered",
    brand: "Herman Miller",
    category: "chair",
    description: "The iconic ergonomic office chair. Pellicle suspension, fully adjustable, 12-year warranty. Premium tier.",
    specs: { seat_width: 52, max_weight_kg: 150, recline_degrees: 130, armrest: "4D", material: "pellicle" },
    colors: ["black", "grey"],
    styleTags: ["premium", "professional"],
    prices: [
      { shop: "goodspace", price: 38900000, url: "https://goodspace.art/ghe-cong-thai-hoc/herman-miller-aeron", shopName: "GoodSpace" },
    ],
  },

  // --- MONITOR (4) ---
  {
    name: "27GP850-B 27\" QHD 165Hz",
    brand: "LG",
    category: "monitor",
    description: "27-inch QHD IPS gaming monitor with 165Hz refresh rate, 1ms response time, and NVIDIA G-Sync Compatible.",
    specs: { size: 27, resolution: "2560x1440", refresh_rate: 165, panel: "IPS", response_ms: 1, hdr: "HDR10" },
    colors: ["black"],
    styleTags: ["gaming", "professional"],
    prices: [
      { shop: "goodspace", price: 6990000, url: "https://goodspace.art/man-hinh/lg-27gp850", shopName: "GoodSpace" },
    ],
  },
  {
    name: "Odyssey G7 32\" QHD 240Hz",
    brand: "Samsung",
    category: "monitor",
    description: "32-inch curved QHD gaming monitor with 240Hz refresh rate, 1ms response, and HDR600. Immersive 1000R curve.",
    specs: { size: 32, resolution: "2560x1440", refresh_rate: 240, panel: "VA", response_ms: 1, hdr: "HDR600", curve: "1000R" },
    colors: ["black"],
    styleTags: ["gaming", "premium"],
    prices: [
      { shop: "goodspace", price: 10990000, url: "https://goodspace.art/man-hinh/samsung-odyssey-g7", shopName: "GoodSpace" },
    ],
  },
  {
    name: "U2723QE 27\" 4K USB-C",
    brand: "Dell",
    category: "monitor",
    description: "27-inch 4K IPS monitor with USB-C 90W power delivery, daisy-chain support, and factory-calibrated colors.",
    specs: { size: 27, resolution: "3840x2160", refresh_rate: 60, panel: "IPS", response_ms: 5, usb_c_watt: 90 },
    colors: ["black", "silver"],
    styleTags: ["professional", "minimal"],
    prices: [
      { shop: "goodspace", price: 11490000, url: "https://goodspace.art/man-hinh/dell-u2723qe", shopName: "GoodSpace" },
    ],
  },
  {
    name: "EW3280U 32\" 4K HDR",
    brand: "BenQ",
    category: "monitor",
    description: "32-inch 4K IPS monitor with HDR10, 95% DCI-P3, and built-in speakers. Great for content creation.",
    specs: { size: 32, resolution: "3840x2160", refresh_rate: 60, panel: "IPS", response_ms: 5, hdr: "HDR10", speakers: "2x5W" },
    colors: ["black"],
    styleTags: ["professional", "creative"],
    prices: [
      { shop: "goodspace", price: 13990000, url: "https://goodspace.art/man-hinh/benq-ew3280u", shopName: "GoodSpace" },
    ],
  },

  // --- KEYBOARD (4) ---
  {
    name: "K8 Pro Wireless",
    brand: "Keychron",
    category: "keyboard",
    description: "Tenkeyless mechanical keyboard with hot-swappable switches, RGB backlight, and Bluetooth 5.1. Gateron Red switches.",
    specs: { layout: "TKL", switches: "Gateron_Red", hot_swap: true, connection: "Bluetooth+USB-C", rgb: true },
    colors: ["black", "grey"],
    styleTags: ["minimal", "professional"],
    prices: [
      { shop: "goodspace", price: 2490000, url: "https://goodspace.art/ban-phim/keychron-k8-pro", shopName: "GoodSpace" },
    ],
  },
  {
    name: "FC750R PD",
    brand: "Leopold",
    category: "keyboard",
    description: "Premium tenkeyless mechanical keyboard with PBT double-shot keycaps and Cherry MX Brown switches.",
    specs: { layout: "TKL", switches: "Cherry_MX_Brown", keycaps: "PBT_double-shot", connection: "USB-C" },
    colors: ["white", "grey"],
    styleTags: ["minimal", "premium"],
    prices: [
      { shop: "goodspace", price: 3290000, url: "https://goodspace.art/ban-phim/leopold-fc750r", shopName: "GoodSpace" },
    ],
  },
  {
    name: "G Pro X TKL",
    brand: "Logitech",
    category: "keyboard",
    description: "Compact gaming mechanical keyboard with GX switches, LIGHTSYNC RGB, and tournament mode.",
    specs: { layout: "TKL", switches: "GX_Blue", rgb: "LIGHTSYNC", connection: "USB", detachable_cable: true },
    colors: ["black"],
    styleTags: ["gaming", "professional"],
    prices: [
      { shop: "goodspace", price: 2190000, url: "https://goodspace.art/ban-phim/logitech-g-pro-x", shopName: "GoodSpace" },
    ],
  },
  {
    name: "BlackWidow V4 Pro",
    brand: "Razer",
    category: "keyboard",
    description: "Full-size mechanical gaming keyboard with Razer Green switches, command dial, and Chroma RGB.",
    specs: { layout: "full", switches: "Razer_Green", rgb: "Chroma", dial: true, connection: "USB" },
    colors: ["black"],
    styleTags: ["gaming", "rgb"],
    prices: [
      { shop: "goodspace", price: 4490000, url: "https://goodspace.art/ban-phim/razer-blackwidow-v4", shopName: "GoodSpace" },
    ],
  },

  // --- MOUSE (4) ---
  {
    name: "G Pro X Superlight 2",
    brand: "Logitech",
    category: "mouse",
    description: "Ultra-light wireless gaming mouse at 60g. HERO 2 sensor, LIGHTSPEED wireless, 95h battery.",
    specs: { weight_g: 60, dpi: 44000, sensor: "HERO_2", wireless: "LIGHTSPEED", battery_hours: 95 },
    colors: ["white", "black"],
    styleTags: ["gaming", "professional"],
    prices: [
      { shop: "goodspace", price: 2990000, url: "https://goodspace.art/chuot/logitech-superlight-2", shopName: "GoodSpace" },
    ],
  },
  {
    name: "DeathAdder V3",
    brand: "Razer",
    category: "mouse",
    description: "Ergonomic wireless gaming mouse with Focus Pro 30K sensor, 90h battery, and optical switches.",
    specs: { weight_g: 59, dpi: 30000, sensor: "Focus_Pro_30K", wireless: "HyperSpeed", battery_hours: 90 },
    colors: ["black"],
    styleTags: ["gaming", "ergonomic"],
    prices: [
      { shop: "goodspace", price: 2490000, url: "https://goodspace.art/chuot/razer-deathadder-v3", shopName: "GoodSpace" },
    ],
  },
  {
    name: "X2 Wireless",
    brand: "Pulsar",
    category: "mouse",
    description: "Lightweight symmetrical gaming mouse at 54g. PAW3395 sensor, 26K DPI, Kailh GM 8.0 switches.",
    specs: { weight_g: 54, dpi: 26000, sensor: "PAW3395", wireless: "2.4GHz", switches: "Kailh_GM_8.0" },
    colors: ["white", "black"],
    styleTags: ["gaming", "minimal"],
    prices: [
      { shop: "goodspace", price: 1890000, url: "https://goodspace.art/chuot/pulsar-x2", shopName: "GoodSpace" },
    ],
  },
  {
    name: "EC2-C Wireless",
    brand: "Zowie",
    category: "mouse",
    description: "Legendary ergonomic gaming mouse. No software required, plug-and-play. 3200 DPI optical sensor.",
    specs: { weight_g: 74, dpi: 3200, sensor: "3360", wireless: "2.4GHz", shape: "ergonomic_right" },
    colors: ["black"],
    styleTags: ["gaming", "professional"],
    prices: [
      { shop: "goodspace", price: 2290000, url: "https://goodspace.art/chuot/zowie-ec2-c", shopName: "GoodSpace" },
    ],
  },

  // --- LIGHTING (3) ---
  {
    name: "ScreenBar Halo",
    brand: "BenQ",
    category: "lighting",
    description: "Monitor-mounted LED desk lamp with auto-dimming, adjustable color temperature, and no screen glare.",
    specs: { type: "bar_mount", color_temp: "2700-6500K", brightness_lux: 500, auto_dim: true, usb_c: true },
    colors: ["black", "silver"],
    styleTags: ["minimal", "professional"],
    prices: [
      { shop: "goodspace", price: 2990000, url: "https://goodspace.art/den/benq-screenbar-halo", shopName: "GoodSpace" },
    ],
  },
  {
    name: "Mi Desk Lamp Pro",
    brand: "Xiaomi",
    category: "lighting",
    description: "Smart LED desk lamp with touch control, 4 brightness levels, and adjustable color temperature. App-controlled.",
    specs: { type: "desk_stand", color_temp: "2700-6500K", brightness_lux: 1000, app_control: true, usb: true },
    colors: ["white"],
    styleTags: ["modern", "smart"],
    prices: [
      { shop: "goodspace", price: 1290000, url: "https://goodspace.art/den/xiaomi-desk-lamp-pro", shopName: "GoodSpace" },
    ],
  },
  {
    name: "RGBIC Floor Lamp",
    brand: "Govee",
    category: "lighting",
    description: "RGBIC floor lamp with 16 million colors, music sync, and smart home integration. Great for gaming rooms.",
    specs: { type: "floor", colors: "16M", music_sync: true, smart_home: true, height_cm: 150 },
    colors: ["black"],
    styleTags: ["gaming", "rgb"],
    prices: [
      { shop: "goodspace", price: 1990000, url: "https://goodspace.art/den/govee-rgbic-lamp", shopName: "GoodSpace" },
    ],
  },

  // --- DECOR (3) ---
  {
    name: "LACK Wall Shelf 78x26",
    brand: "IKEA",
    category: "decor",
    description: "Minimalist wall-mounted shelf in white. Perfect for displaying small plants, books, or collectibles.",
    specs: { width: 78, depth: 26, material: "lacquered_MDF", max_load_kg: 5, mount: "wall" },
    colors: ["white", "black"],
    styleTags: ["minimal", "scandinavian"],
    prices: [
      { shop: "goodspace", price: 290000, url: "https://goodspace.art/phu-kien-va-setup/ikea-lack-shelf", shopName: "GoodSpace" },
    ],
  },
  {
    name: "M75 Monitor Arm",
    brand: "Ergotron",
    category: "decor",
    description: "Premium single monitor arm with 35lb capacity, 13-inch vertical range, and integrated cable management.",
    specs: { type: "monitor_arm", max_weight_kg: 15.9, vertical_range_cm: 33, tilt: true, rotate: true, cable_mgmt: true },
    colors: ["silver", "black"],
    styleTags: ["professional", "minimal"],
    prices: [
      { shop: "goodspace", price: 3490000, url: "https://goodspace.art/arm-man-hinh/ergotron-m75", shopName: "GoodSpace" },
    ],
  },
  {
    name: "Desk Mat XXL",
    brand: "Secretlab",
    category: "decor",
    description: "Premium desk mat with stitched edges, anti-slip rubber base, and microfiber surface. 90x40cm.",
    specs: { width: 90, depth: 40, thickness_mm: 4, material: "microfiber+rubber", stitched_edges: true },
    colors: ["black", "grey"],
    styleTags: ["gaming", "premium"],
    prices: [
      { shop: "goodspace", price: 1290000, url: "https://goodspace.art/phu-kien-va-setup/secretlab-desk-mat", shopName: "GoodSpace" },
    ],
  },

  // --- AUDIO (3) ---
  {
    name: "WH-1000XM5",
    brand: "Sony",
    category: "audio",
    description: "Industry-leading noise-cancelling wireless headphones. 30h battery, multipoint connection, LDAC audio.",
    specs: { type: "over_ear", wireless: "Bluetooth_5.2", battery_hours: 30, noise_cancelling: true, codec: "LDAC" },
    colors: ["black", "silver"],
    styleTags: ["premium", "minimal"],
    prices: [
      { shop: "goodspace", price: 7490000, url: "https://goodspace.art/tai-nghe/sony-wh1000xm5", shopName: "GoodSpace" },
    ],
  },
  {
    name: "G733 Headset",
    brand: "Logitech",
    category: "audio",
    description: "Wireless gaming headset with LIGHTSYNC RGB, Blue VO!CE mic technology, and 29h battery.",
    specs: { type: "over_ear", wireless: "LIGHTSPEED", battery_hours: 29, rgb: true, mic: "Blue_VO!CE" },
    colors: ["black", "white"],
    styleTags: ["gaming", "rgb"],
    prices: [
      { shop: "goodspace", price: 2990000, url: "https://goodspace.art/tai-nghe/logitech-g733", shopName: "GoodSpace" },
    ],
  },
  {
    name: "Flip 6 Bluetooth Speaker",
    brand: "JBL",
    category: "audio",
    description: "Portable Bluetooth speaker with IP67 waterproof, 12h battery, and PartyBoost for multi-speaker pairing.",
    specs: { type: "portable", wireless: "Bluetooth_5.3", battery_hours: 12, waterproof: "IP67", weight_g: 560 },
    colors: ["black", "blue", "red"],
    styleTags: ["versatile", "modern"],
    prices: [
      { shop: "goodspace", price: 2490000, url: "https://goodspace.art/loa/jbl-flip-6", shopName: "GoodSpace" },
    ],
  },

  // --- ACCESSORY (3) ---
  {
    name: "USB-C Hub 7-in-1",
    brand: "Anker",
    category: "accessory",
    description: "7-port USB-C hub with 100W passthrough charging, HDMI 4K@60Hz, SD card reader, and dual USB-A.",
    specs: { ports: 7, hdmi: "4K@60Hz", usb_a: 2, usb_c: 2, sd_card: true, power_delivery_w: 100 },
    colors: ["grey"],
    styleTags: ["minimal", "professional"],
    prices: [
      { shop: "goodspace", price: 1490000, url: "https://goodspace.art/phu-kien/anker-usb-c-hub", shopName: "GoodSpace" },
    ],
  },
  {
    name: "C920 HD Pro Webcam",
    brand: "Logitech",
    category: "accessory",
    description: "1080p webcam with auto-focus, built-in privacy shutter, and dual microphones. Great for streaming.",
    specs: { resolution: "1080p", fps: 30, autofocus: true, privacy_shutter: true, mic: "dual_stereo" },
    colors: ["black"],
    styleTags: ["professional", "minimal"],
    prices: [
      { shop: "goodspace", price: 1790000, url: "https://goodspace.art/phu-kien/logitech-c920", shopName: "GoodSpace" },
    ],
  },
  {
    name: "Headphone Stand Pro",
    brand: "Grovemade",
    category: "accessory",
    description: "Premium aluminum headphone stand with weighted base and cable management channel.",
    specs: { material: "aluminum", weight_g: 450, base_diameter_cm: 10, cable_mgmt: true },
    colors: ["silver", "black"],
    styleTags: ["premium", "minimal"],
    prices: [
      { shop: "goodspace", price: 1990000, url: "https://goodspace.art/phu-kien-va-setup/grovemade-stand", shopName: "GoodSpace" },
    ],
  },
];

export async function seedComponents(prisma: PrismaClient): Promise<void> {
  console.log(`  components: seeding ${SEED_COMPONENTS.length} items…`);

  for (const c of SEED_COMPONENTS) {
    const slug = slugify(`${c.brand}-${c.name}`).slice(0, 80);

    const component = await prisma.component.upsert({
      where: { slug },
      create: {
        slug,
        name: c.name,
        brand: c.brand,
        category: c.category,
        description: c.description,
        specs: c.specs as Prisma.InputJsonValue,
        colors: c.colors,
        styleTags: c.styleTags,
        imageUrl: c.imageUrl ?? null,
        isActive: true,
        embeddingStale: true,
      },
      update: {
        name: c.name,
        brand: c.brand,
        description: c.description,
        specs: c.specs as Prisma.InputJsonValue,
        colors: c.colors,
        styleTags: c.styleTags,
        imageUrl: c.imageUrl ?? null,
        isActive: true,
        embeddingStale: true,
      },
    });

    for (const p of c.prices) {
      await prisma.price.upsert({
        where: {
          componentId_shop_condition: {
            componentId: component.id,
            shop: p.shop,
            condition: "new",
          },
        },
        create: {
          componentId: component.id,
          shop: p.shop,
          price: p.price,
          originalPrice: p.originalPrice ?? null,
          currency: "VND",
          url: p.url,
          shopName: p.shopName,
          isAvailable: p.isAvailable ?? true,
        },
        update: {
          price: p.price,
          originalPrice: p.originalPrice ?? null,
          url: p.url,
          shopName: p.shopName,
          isAvailable: p.isAvailable ?? true,
        },
      });
    }
  }

  console.log(`  components: done (${SEED_COMPONENTS.length} items + prices).`);
}
