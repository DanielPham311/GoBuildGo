import { prisma } from "@/shared/db";
import { SubscriptionType } from "@prisma/client";
import type { PriceAlertCheckInput, PriceAlertEmail } from "./schema";

interface PriceAlert {
  componentId: string;
  componentName: string;
  componentBrand: string;
  shop: string;
  shopName: string | null;
  url: string;
  oldPrice: number;
  newPrice: number;
  dropPercentage: number;
  recordedAt: Date;
}

/** Get users with active price_alert subscription */
export async function getUsersWithPriceAlerts() {
  return prisma.user.findMany({
    where: {
      subscriptions: {
        some: {
          subscriptionType: SubscriptionType.price_alert,
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
}

/**
 * Query PriceHistory for recent drops within the specified time window.
 * Returns alerts with component info, shop info, and price change details.
 */
export async function getPriceDropAlerts(input: PriceAlertCheckInput): Promise<PriceAlert[]> {
  const since = new Date();
  since.setHours(since.getHours() - input.sinceHours);

  // Find price changes where newPrice < oldPrice
  const priceChanges = await prisma.priceHistory.findMany({
    where: {
      recordedAt: { gte: since },
      oldPrice: { gt: prisma.priceHistory.fields.newPrice },
    },
    orderBy: { recordedAt: "desc" },
    take: input.limit * 10,
    include: {
      price: {
        include: {
          component: {
            select: {
              id: true,
              name: true,
              brand: true,
            },
          },
        },
      },
    },
  });

  // Process and dedupe alerts (latest drop per component per shop)
  const alertsMap = new Map<string, PriceAlert>();

  for (const ph of priceChanges) {
    const price = ph.price;
    const key = `${price.componentId}-${price.shop}`;
    const existing = alertsMap.get(key);

    // Keep the most recent drop (later recordedAt)
    if (!existing || ph.recordedAt > existing.recordedAt) {
      const dropPercentage = Math.round(
        ((Number(ph.oldPrice) - Number(ph.newPrice)) / Number(ph.oldPrice)) * 100
      );
      alertsMap.set(key, {
        componentId: price.componentId,
        componentName: price.component.name,
        componentBrand: price.component.brand,
        shop: price.shop,
        shopName: price.shopName,
        url: price.url,
        oldPrice: Number(ph.oldPrice),
        newPrice: Number(ph.newPrice),
        dropPercentage,
        recordedAt: ph.recordedAt,
      });
    }
  }

  return Array.from(alertsMap.values()).slice(0, input.limit);
}

/**
 * Match users with alerts based on their favorited components.
 * Returns array of emails to send with their relevant alerts.
 */
export async function matchAlertsToUsers(
  alerts: PriceAlert[]
): Promise<{ email: string; name?: string | null; alert: PriceAlertEmail[] }[]> {
  const userEmailAlerts = new Map<string, PriceAlertEmail[]>();

  // Get users with price_alert subscription
  const users = await getUsersWithPriceAlerts();

  // For each alert, check if any user has favorited the component
  for (const alert of alerts) {
    // Find users who have favorited this component
    const favorites = await prisma.userFavorite.findMany({
      where: { componentId: alert.componentId },
      select: { userId: true },
    });

    for (const fav of favorites) {
      const userAlerts = userEmailAlerts.get(fav.userId) || [];
      userAlerts.push({
        to: users.find(u => u.id === fav.userId)?.email || "",
        componentName: alert.componentName,
        componentBrand: alert.componentBrand,
        shopName: alert.shopName || alert.shop,
        oldPrice: alert.oldPrice,
        newPrice: alert.newPrice,
        dropPercentage: alert.dropPercentage,
        url: alert.url,
      });
      userEmailAlerts.set(fav.userId, userAlerts);
    }
  }

  return users
    .filter(u => userEmailAlerts.has(u.id))
    .map(u => ({
      email: u.email!,
      name: u.name,
      alert: userEmailAlerts.get(u.id) || [],
    }));
}

/**
 * Send price drop emails via Resend.
 * Requires RESEND_API_KEY environment variable.
 */
export async function sendPriceDropEmails(
  emails: { email: string; name?: string | null; alert: PriceAlertEmail[] }[]
): Promise<{ success: number; failed: number }> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn("[alerts] RESEND_API_KEY not set, skipping emails");
    return { success: 0, failed: emails.length };
  }

  let success = 0;
  let failed = 0;

  for (const { email, alert: alerts } of emails) {
    // Build HTML for multiple alerts
    const alertsHtml = alerts
      .map(
        (a) => `
      <div style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 8px;">
        <h4 style="margin: 0 0 8px 0; color: #1e293b;">${a.componentBrand} ${a.componentName}</h4>
        <p style="margin: 0 0 4px 0; color: #64748b;">
          <span style="color: #e11d48;">${a.dropPercentage}% drop</span> →
          <span style="color: #0f172a; font-weight: 500;">${a.newPrice.toLocaleString()}₫</span>
          ${a.oldPrice > 0 ? ` (from ${a.oldPrice.toLocaleString()}₫)` : ""}
        </p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">Available at ${a.shopName}</p>
        <a href="${a.url}" style="display: inline-block; margin-top: 8px; padding: 6px 12px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">View Product</a>
      </div>
    `
      )
      .join("");

    const html = `
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1e293b; margin-bottom: 16px;">Price Drop Alert</h1>
          <p style="color: #64748b; margin-bottom: 16px;">
            ${alerts.length} product${alerts.length > 1 ? "s" : ""} price${alerts.length > 1 ? "s" : ""} dropped:
          </p>
          ${alertsHtml}
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="font-size: 12px; color: #94a3b8;">
            You're receiving this because you favorited these products.
            <a href="https://gobuildgo.vn/dashboard/settings" style="color: #3b82f6;">Manage email settings</a>
          </p>
        </body>
      </html>
    `;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "GoBuildGo <alerts@gobuildgo.vn>",
          to: email,
          subject: `Price drop: ${alerts.length} product${alerts.length > 1 ? "s" : ""} on sale`,
          html,
        }),
      });

      if (res.ok) {
        success++;
      } else {
        console.error(`[alerts] Failed to send to ${email}: ${res.status}`);
        failed++;
      }
    } catch (err) {
      console.error(`[alerts] Error sending to ${email}:`, err);
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Main function to run the price drop alert check.
 * Called by cron job.
 */
export async function checkPriceAlerts(input: PriceAlertCheckInput = { sinceHours: 24, limit: 50 }) {
  console.log(`[alerts] Checking price drops (last ${input.sinceHours}h, limit ${input.limit})`);

  const alerts = await getPriceDropAlerts(input);
  console.log(`[alerts] Found ${alerts.length} price drop events`);

  if (alerts.length === 0) {
    console.log("[alerts] No alerts to send");
    return { alerts: 0, emails: 0 };
  }

  const matched = await matchAlertsToUsers(alerts);
  console.log(`[alerts] Matched alerts to ${matched.length} users`);

  const result = await sendPriceDropEmails(matched);
  console.log(`[alerts] Sent ${result.success} emails, ${result.failed} failed`);

  return {
    alerts: alerts.length,
    emails: result.success,
    failed: result.failed,
  };
}