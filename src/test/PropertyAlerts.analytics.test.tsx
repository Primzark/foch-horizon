import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PropertyAlertsDialog } from "@/features/listings/components/PropertyAlertsDialog";
import PropertyAlertActionPage from "@/features/listings/pages/PropertyAlertActionPage";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import type { PropertySearchParams } from "@/types/api";

const { invokeMock, trackEventMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  trackEventMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

vi.mock("@/lib/analytics/events", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

const filters: PropertySearchParams = {
  transaction: "vente",
  page: 1,
  pageSize: 12,
};

describe("property alert analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invokeMock.mockResolvedValue({ data: {}, error: null });
  });

  it("tracks opening and validation errors without sending form values", () => {
    render(<PropertyAlertsDialog filters={filters} />);
    fireEvent.click(screen.getByRole("button", { name: "Créer une alerte" }));

    expect(trackEventMock).toHaveBeenCalledWith("alert_form_opened", {
      source: "property_alerts",
      form_type: "property_alert",
      action: "open_form",
    });

    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    expect(trackEventMock).toHaveBeenCalledWith("form_error", {
      source: "property_alerts",
      form_type: "property_alert",
      action: "validation",
    });
    expect(JSON.stringify(trackEventMock.mock.calls)).not.toContain("@");
  });

  it("records an alert subscription only after the confirmation request succeeds", async () => {
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={["/alertes/confirmation?token=private-token"]}>
          <PropertyAlertActionPage />
        </MemoryRouter>
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirmer mon adresse" }));
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());

    expect(invokeMock).toHaveBeenCalledWith("property-alerts", {
      body: { action: "confirm", token: "private-token" },
    });
    expect(trackEventMock).toHaveBeenCalledWith("alert_subscribed", {
      source: "alert_confirmation",
      form_type: "property_alert",
      action: "confirm",
      method: "email",
    });
    expect(trackEventMock.mock.calls.flat()).not.toContain("private-token");
  });
});
