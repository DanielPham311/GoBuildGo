import type { Scraper } from "./types";
import { shopeeScraper } from "./shopee";

/** Scraper registry — add new shops here. */
const scrapers: Map<string, Scraper> = new Map();
scrapers.set("shopee", shopeeScraper);

export function getScraper(name: string): Scraper | undefined {
  return scrapers.get(name);
}

export function getAllScrapers(): Scraper[] {
  return Array.from(scrapers.values());
}

export { shopeeScraper };
