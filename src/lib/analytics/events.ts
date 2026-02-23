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
