import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CookieConsentManager } from "@/layout/CookieConsentManager";
import { useUiStore } from "@/lib/state/useUiStore";

const gtmMocks = vi.hoisted(() => {
  const state = { loaded: false };
  return {
    state,
    hasGoogleTagManagerScript: vi.fn(() => state.loaded),
    syncGoogleTagManagerConsent: vi.fn((granted: boolean) => {
      if (granted) state.loaded = true;
    }),
    trackGoogleAnalyticsPageView: vi.fn(),
  };
});

vi.mock("@/lib/analytics/gtm", () => ({
  hasGoogleTagManagerScript: gtmMocks.hasGoogleTagManagerScript,
  syncGoogleTagManagerConsent: gtmMocks.syncGoogleTagManagerConsent,
  trackGoogleAnalyticsPageView: gtmMocks.trackGoogleAnalyticsPageView,
}));

function RouteControls() {
  return (
    <nav>
      <Link to="/biens">Biens</Link>
      <Link to="/biens?type=appartement">Filtrer</Link>
      <Link to="/biens?type=appartement#photos">Ancre photo</Link>
    </nav>
  );
}

describe("consent-gated virtual page views", () => {
  beforeEach(() => {
    localStorage.clear();
    gtmMocks.state.loaded = false;
    gtmMocks.hasGoogleTagManagerScript.mockClear();
    gtmMocks.syncGoogleTagManagerConsent.mockClear();
    gtmMocks.trackGoogleAnalyticsPageView.mockClear();
    useUiStore.setState({ cookieConsent: "accepted" });
  });

  afterEach(() => {
    useUiStore.setState({ cookieConsent: "unset" });
  });

  it("tracks the first public route once in StrictMode, then once per URL navigation", async () => {
    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/"]}>
          <RouteControls />
          <CookieConsentManager />
        </MemoryRouter>
      </StrictMode>,
    );

    expect(gtmMocks.trackGoogleAnalyticsPageView).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("link", { name: "Biens" }));
    await waitFor(() => expect(gtmMocks.trackGoogleAnalyticsPageView).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole("link", { name: "Filtrer" }));
    await waitFor(() => expect(gtmMocks.trackGoogleAnalyticsPageView).toHaveBeenCalledTimes(3));

    fireEvent.click(screen.getByRole("link", { name: "Ancre photo" }));
    expect(gtmMocks.trackGoogleAnalyticsPageView).toHaveBeenCalledTimes(3);
  });

  it("does not record page views when consent is rejected", () => {
    useUiStore.setState({ cookieConsent: "rejected" });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <CookieConsentManager />
      </MemoryRouter>,
    );

    expect(gtmMocks.trackGoogleAnalyticsPageView).not.toHaveBeenCalled();
  });
});
