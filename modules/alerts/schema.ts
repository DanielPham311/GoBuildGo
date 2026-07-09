import { z } from "zod";

// Input for the price alert check (internal use)
export const PriceAlertCheckInput = z.object({
  sinceHours: z.number().min(1).max(168).default(24), // Last 24 hours to 1 week
  limit: z.number().min(1).max(100).default(50), // Max alerts to process
});

export type PriceAlertCheckInput = z.infer<typeof PriceAlertCheckInput>;

// Email template for price drop alerts
export interface PriceAlertEmail {
  to: string;
  componentName: string;
  componentBrand: string;
  shopName: string;
  oldPrice: number;
  newPrice: number;
  dropPercentage: number;
  url: string;
}