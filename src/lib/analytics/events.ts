import { useUiStore } from "@/lib/state/useUiStore";

export type AnalyticsEventName =
  | "search_opened"
  | "search_submitted"
  | "filter_applied"
  | "property_view"
  | "gallery_opened"
  | "property_shared"
  | "property_contact_clicked"
  | "property_reference_copied"
  | "lead_submitted"
  | "form_start"
  | "form_error"
  | "phone_clicked"
  | "email_clicked"
  | "alert_form_opened"
  | "alert_subscribed"
  | "extranet_clicked"
  | "favorites_opened"
  | "property_liked"
  | "property_unliked"
  | "comparison_add"
  | "comparison_remove"
  | "comparison_open"
  | "comparison_differences_toggle"
  | "comparison_listing_click"
  | "comparison_contact_click"
  | "motion_performance"
  | "motion_pref_changed"
  | "chatbot_opened"
  | "chatbot_reset"
  | "chatbot_message_sent"
  | "chatbot_reply_received"
  | "chatbot_request_failed"
  | "chatbot_citation_clicked"
  | "chatbot_feedback_submitted"
  | "chatbot_tool_action_rendered"
  | "chatbot_tool_action_clicked"
  | "chatbot_tool_orchestration_result"
  | "chatbot_tool_compare_requested"
  | "chatbot_tool_handoff_prefill_opened"
  | "chatbot_stream_started"
  | "chatbot_stream_completed"
  | "chatbot_stream_failed"
  | "chatbot_multimodal_analysis_rendered"
  | "chatbot_multimodal_analysis_clicked"
  | "chatbot_memory_updated"
  | "chatbot_planner_v2_plan_executed"
  | "chatbot_planner_v2_clarify";

type AnalyticsParameter = "property_id" | "source" | "action" | "form_type" | "method";

const EVENT_PARAMETERS: Partial<Record<AnalyticsEventName, readonly AnalyticsParameter[]>> = {
  search_opened: ["source"],
  search_submitted: ["source", "action"],
  filter_applied: ["source", "action"],
  property_view: ["property_id", "source"],
  gallery_opened: ["property_id", "source", "action"],
  property_shared: ["property_id", "source", "action", "method"],
  property_contact_clicked: ["property_id", "source", "action", "method"],
  property_reference_copied: ["property_id", "source", "action", "method"],
  lead_submitted: ["property_id", "source", "form_type", "action"],
  form_start: ["property_id", "source", "form_type", "action"],
  form_error: ["property_id", "source", "form_type", "action"],
  phone_clicked: ["property_id", "source", "method"],
  email_clicked: ["property_id", "source", "method"],
  alert_form_opened: ["source", "form_type", "action"],
  alert_subscribed: ["source", "form_type", "action", "method"],
  favorites_opened: ["source", "action"],
  property_liked: ["property_id", "source", "action"],
  property_unliked: ["property_id", "source", "action"],
  comparison_add: ["property_id", "source"],
  comparison_remove: ["property_id", "source", "action"],
  comparison_open: ["source"],
  comparison_differences_toggle: ["source", "action"],
  comparison_listing_click: ["property_id", "source", "action"],
  comparison_contact_click: ["property_id", "source", "method"],
  chatbot_opened: ["source"],
  chatbot_message_sent: ["source"],
  chatbot_tool_action_clicked: ["property_id", "source", "action"],
  chatbot_tool_handoff_prefill_opened: ["source", "form_type", "action"],
};

const ALLOWED_VALUES: Record<Exclude<AnalyticsParameter, "property_id">, ReadonlySet<string>> = {
  source: new Set([
    "header",
    "mobile_menu",
    "footer",
    "contact_page",
    "property_page",
    "property_detail",
    "property_sidebar",
    "property_sticky",
    "about_page",
    "agency_team",
    "favorites_share",
    "search_drawer",
    "homepage_search",
    "spotlight_search",
    "comparison_page",
    "comparison_tray",
    "comparison_toggle",
    "property_card",
    "favorites_page",
    "lead_form",
    "site_chatbot",
    "property_alerts",
    "alert_confirmation",
    "estimation_page",
  ]),
  action: new Set([
    "keyword",
    "filters",
    "suggested_search",
    "browse_all",
    "apply_filters",
    "open_gallery",
    "share",
    "copy_link",
    "copy_reference",
    "open_form",
    "open_message_form",
    "save",
    "remove",
    "show_differences",
    "show_all",
    "open_property",
    "start",
    "validation",
    "submission",
    "success",
    "request_contact",
    "confirm",
    "open_saved_list",
  ]),
  form_type: new Set(["contact", "valuation", "property_contact", "favorites_share", "chatbot_contact", "property_alert"]),
  method: new Set(["phone", "email", "form", "native_share", "clipboard"]),
};

const EVENT_PARAMETER_RESET: Record<AnalyticsParameter, null> = {
  property_id: null,
  source: null,
  action: null,
  form_type: null,
  method: null,
};

function sanitizeParameter(key: AnalyticsParameter, value: unknown): string | number | undefined {
  if (key === "property_id") {
    const propertyId = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    return Number.isSafeInteger(propertyId) && propertyId > 0 ? propertyId : undefined;
  }

  if (typeof value === "string" && ALLOWED_VALUES[key].has(value)) return value;
  return undefined;
}

function sanitizePayload(name: AnalyticsEventName, payload?: Record<string, unknown>): Partial<Record<AnalyticsParameter, string | number>> {
  const allowedParameters = EVENT_PARAMETERS[name];
  if (!allowedParameters || !payload) return {};

  const safePayload: Partial<Record<AnalyticsParameter, string | number>> = {};
  for (const key of allowedParameters) {
    const value = sanitizeParameter(key, payload[key]);
    if (value !== undefined) safePayload[key] = value;
  }
  return safePayload;
}

export function trackEvent(name: AnalyticsEventName, payload?: Record<string, unknown>): void {
  const eventParameters = EVENT_PARAMETERS[name];
  if (!eventParameters || typeof window === "undefined") return;
  if (useUiStore.getState().cookieConsent !== "accepted") return;

  const safePayload = sanitizePayload(name, payload);
  const win = window as unknown as { dataLayer?: unknown[] };
  if (Array.isArray(win.dataLayer)) {
    // Clear optional Data Layer Variables on every event so GTM cannot reuse a
    // property ID, source, action, form type, method, or legacy property ID list.
    win.dataLayer.push({ ...EVENT_PARAMETER_RESET, property_ids: null, event: name, ...safePayload });
  }

  if (import.meta.env.DEV) {
    // Keep local traces limited to the same allowlisted fields sent to GTM.
    console.info("[analytics]", name, safePayload);
  }
}
