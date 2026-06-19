import { notImplemented } from "@/shared/api/response";

// GET /api/v1/admin/scraper/status — last scrape run status (API_DESIGN.md §10).
export async function GET() {
  return notImplemented("GET /api/v1/admin/scraper/status");
}
