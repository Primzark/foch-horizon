import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trackEvent } from "@/lib/analytics/events";
import { useUiStore } from "@/lib/state/useUiStore";

type AnalyticsWindow = Window & { dataLayer?: unknown[] };
const dataLayer = () => (window as AnalyticsWindow).dataLayer;

describe("GA4 event allowlist", () => {
  beforeEach(() => {
    (window as AnalyticsWindow).dataLayer = [];
    useUiStore.setState({ cookieConsent: "accepted" });
  });

  afterEach(() => {
    useUiStore.setState({ cookieConsent: "unset" });
    delete (window as AnalyticsWindow).dataLayer;
  });

  it("forwards only safe, relevant parameters and clears previous data-layer values", () => {
    trackEvent("property_view", {
      property_id: 5159,
      source: "property_detail",
      email: "visitor@example.com",
      message: "Private enquiry text",
      page_path: "/biens/5159",
    });
    trackEvent("phone_clicked", {
      source: "footer",
      method: "phone",
    });

    expect(dataLayer()).toEqual([
      {
        property_id: 5159,
        property_ids: null,
        source: "property_detail",
        action: null,
        form_type: null,
        method: null,
        event: "property_view",
      },
      {
        property_id: null,
        property_ids: null,
        source: "footer",
        action: null,
        form_type: null,
        method: "phone",
        event: "phone_clicked",
      },
    ]);
  });

  it("does not send events without consent", () => {
    useUiStore.setState({ cookieConsent: "rejected" });

    trackEvent("lead_submitted", {
      source: "contact_page",
      form_type: "contact",
      action: "success",
    });

    expect(dataLayer()).toEqual([]);
  });

  it("forwards only selected chatbot actions and never message details", () => {
    trackEvent("chatbot_message_sent", {
      source: "site_chatbot",
      message: "Private request content",
      requestChars: 28,
      hasHistory: true,
    });

    expect(dataLayer()?.[0]).toMatchObject({
      event: "chatbot_message_sent",
      source: "site_chatbot",
    });
    expect(dataLayer()?.[0]).not.toHaveProperty("message");
    expect(dataLayer()?.[0]).not.toHaveProperty("requestChars");
    expect(dataLayer()?.[0]).not.toHaveProperty("hasHistory");
    expect(dataLayer()).toHaveLength(1);
  });

  it("does not forward legacy technical chatbot events", () => {
    trackEvent("chatbot_request_failed", { source: "site_chatbot", error: "request failed" });

    expect(dataLayer()).toEqual([]);
  });
});
