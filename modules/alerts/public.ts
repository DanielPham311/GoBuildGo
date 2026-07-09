// Public DTOs for price alerts
// Currently empty - alerts are sent via email, not exposed via API

export interface PriceAlertCheckResult {
  alerts: number;
  emails: number;
  failed?: number;
}