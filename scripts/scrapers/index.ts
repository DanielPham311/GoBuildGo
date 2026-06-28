import type { Scraper } from "./types";
import { goodspaceScraper } from "./goodspace";
import { apshopScraper } from "./apshop";

/**
 * Scraper registry.
 * - GoodSpace: direct category scraping for chairs, desks, decor (server-rendered)
 * - APShop: direct category scraping for monitors, keyboards, mice, desks, chairs, audio, decor (server-rendered)
 */
const scrapers: Map<string, Scraper> = new Map();
scrapers.set("goodspace", goodspaceScraper);
scrapers.set("apshop", apshopScraper);

export function getScraper(name: string): Scraper | undefined {
  return scrapers.get(name);
}

export function getAllScrapers(): Scraper[] {
  return Array.from(scrapers.values());
}

export { goodspaceScraper, apshopScraper };
