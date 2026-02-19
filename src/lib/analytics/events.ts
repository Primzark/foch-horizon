export type AnalyticsEventName =
  | "search_opened"
  | "filter_applied"
  | "listing_viewed"
  | "gallery_opened"
  | "lead_submitted"
  | "phone_clicked"
  | "extranet_clicked"
  | "favorites_opened"
  | "motion_performance"
  | "motion_pref_changed";

export function trackEvent(name: AnalyticsEventName, payload?: Record<string, unknown>): void {
  if (typeof window === "undefined") {
    return;
  }

  const data = { event: name, ...payload };

  const win = window as unknown as { dataLayer?: unknown[] };
  if (Array.isArray(win.dataLayer)) {
    win.dataLayer.push(data);
  }

  if (import.meta.env.DEV) {
    // Non-blocking analytics trace for development and QA.
    console.info("[analytics]", name, payload ?? {});
  }
}
