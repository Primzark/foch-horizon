import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const getSession = vi.fn();
  const onAuthStateChange = vi.fn();
  const invoke = vi.fn();

  return {
    getSession,
    onAuthStateChange,
    invoke,
    authListener: null as ((event: string, session: unknown) => void) | null,
    supabaseClient: {
      auth: { getSession, onAuthStateChange },
      functions: { invoke },
    },
  };
});

vi.mock("@/lib/supabase/browserClient", () => ({
  getBrowserSupabaseClient: () => mocks.supabaseClient,
}));

vi.mock("@/features/favorites/useFavoritesStore", () => ({
  useFavoritesStore: (selector: (state: { ids: number[] }) => unknown) => selector({ ids: [] }),
}));

vi.mock("@/components/layout/LanguageSwitcher", () => ({ LanguageSwitcher: () => null }));
vi.mock("@/components/layout/ThemeToggle", () => ({ ThemeToggle: () => null }));
vi.mock("@/features/listings/components/SpotlightSearchModal", () => ({ SpotlightSearchModal: () => null }));

import { AppHeader } from "@/layout/AppHeader";

function createSession(accessToken = "test-access-token") {
  return { access_token: accessToken } as unknown as Session;
}

function renderHeader() {
  return render(
    <MemoryRouter>
      <AppHeader />
    </MemoryRouter>,
  );
}

describe("admin shortcut in the public header", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.authListener = null;
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.onAuthStateChange.mockImplementation((callback: (event: string, session: unknown) => void) => {
      mocks.authListener = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mocks.invoke.mockResolvedValue({ data: null, error: new Error("Not authorized") });
  });

  it("does not render the shortcut or call the admin check for a signed-out visitor", async () => {
    const { container } = renderHeader();

    await waitFor(() => expect(mocks.getSession).toHaveBeenCalled());
    expect(container.querySelector('a[href="/admin"]')).not.toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("keeps the shortcut hidden when a signed-in account fails the server allowlist check", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: createSession() }, error: null });
    const { container } = renderHeader();

    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("admin-properties?check=admin-access", { method: "GET" }));
    expect(container.querySelector('a[href="/admin"]')).not.toBeInTheDocument();
  });

  it("shows the shortcut only after the Edge Function confirms admin access", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: createSession() }, error: null });
    mocks.invoke.mockResolvedValue({ data: { authorized: true }, error: null });
    renderHeader();

    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("admin-properties?check=admin-access", { method: "GET" }));
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));

    expect(await screen.findByRole("link", { name: "Administration" })).toHaveAttribute("href", "/admin");
  });

  it("removes the shortcut immediately when the authenticated session signs out", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: createSession() }, error: null });
    mocks.invoke.mockResolvedValue({ data: { authorized: true }, error: null });
    const { container } = renderHeader();

    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("admin-properties?check=admin-access", { method: "GET" }));
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    expect(await screen.findByRole("link", { name: "Administration" })).toBeInTheDocument();

    act(() => mocks.authListener?.("SIGNED_OUT", null));

    await waitFor(() => expect(container.querySelector('a[href="/admin"]')).not.toBeInTheDocument());
  });
});
