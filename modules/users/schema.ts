import { z } from "zod";

/** PATCH /api/v1/users/me body (API_DESIGN.md §8). */
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  image: z.string().optional(),
  bio: z.string().max(280).optional(),
  location: z.string().max(100).optional(),
});

/**
 * PATCH /api/v1/users/me/email-settings (API_DESIGN.md §8).
 * The schema's SubscriptionType enum has three types; `newSetups` is folded
 * into `weeklyDigest` and `priceAlertComponents` is not persisted (no column).
 */
export const updateEmailSettingsSchema = z.object({
  priceAlerts: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  promotions: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateEmailSettingsInput = z.infer<typeof updateEmailSettingsSchema>;
