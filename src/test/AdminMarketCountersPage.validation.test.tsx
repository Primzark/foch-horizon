import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { supabaseClientMock, signInMock, getCountersMock, updateCountersMock } = vi.hoisted(() => {
  const signInMock = vi.fn();
  return {
    signInMock,
    getCountersMock: vi.fn(),
    updateCountersMock: vi.fn(),
    supabaseClientMock: {
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        signInWithPassword: signInMock,
        signOut: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/supabase/browserClient", () => ({
  getBrowserSupabaseClient: () => supabaseClientMock,
}));

vi.mock("@/features/listings/api/properties.service", () => ({
  getMarketCountersSnapshot: (...args: unknown[]) => getCountersMock(...args),
  updateMarketCountersSnapshot: (...args: unknown[]) => updateCountersMock(...args),
}));

import AdminMarketCountersPage from "@/features/admin/pages/AdminMarketCountersPage";

const snapshot = {
  soldCount: 42,
  underOfferCount: 5,
  underContractCount: 3,
  updatedAt: "2026-10-01T10:00:00.000Z",
  source: "manual" as const,
};

function renderAdminPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminMarketCountersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Admin market counter forms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseClientMock.auth.getSession.mockResolvedValue({ data: { session: null } });
    signInMock.mockResolvedValue({ error: null });
    getCountersMock.mockResolvedValue(snapshot);
    updateCountersMock.mockResolvedValue(snapshot);
  });

  it("validates login fields on blur and submit before calling Supabase", async () => {
    renderAdminPage();
    const email = await screen.findByLabelText("Email");

    fireEvent.change(email, { target: { value: "not-an-email" } });
    fireEvent.blur(email);
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Vérifiez le format de votre adresse email.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "secret" } });
    fireEvent.submit(email.closest("form")!);
    expect(await screen.findByText("Votre formulaire contient des erreurs.")).toBeInTheDocument();
    expect(signInMock).not.toHaveBeenCalled();

    fireEvent.change(email, { target: { value: "admin@example.fr" } });
    expect(screen.queryByText("Vérifiez le format de votre adresse email.")).not.toBeInTheDocument();
    fireEvent.submit(email.closest("form")!);
    await waitFor(() => expect(signInMock).toHaveBeenCalledWith({
      email: "admin@example.fr",
      password: "secret",
    }));
  });

  it("rechecks counter entries as they are corrected and submits valid integers", async () => {
    const adminSession = {
      access_token: "session-token",
      user: { email: "admin@example.fr" },
    };
    supabaseClientMock.auth.getSession.mockResolvedValue({ data: { session: adminSession } });
    renderAdminPage();

    const soldCount = await screen.findByLabelText("Biens vendus");
    fireEvent.change(soldCount, { target: { value: "1.5" } });
    fireEvent.blur(soldCount);
    expect(soldCount).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Saisissez un nombre entier supérieur ou égal à 0.")).toBeInTheDocument();

    const saveForm = soldCount.closest("form")!;
    fireEvent.submit(saveForm);
    expect(await screen.findByText("Votre formulaire contient des erreurs.")).toBeInTheDocument();
    expect(updateCountersMock).not.toHaveBeenCalled();

    fireEvent.change(soldCount, { target: { value: "0" } });
    expect(soldCount).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText("Saisissez un nombre entier supérieur ou égal à 0.")).not.toBeInTheDocument();
    fireEvent.submit(saveForm);

    await waitFor(() => expect(updateCountersMock).toHaveBeenCalledWith(
      { soldCount: 0, underOfferCount: 5, underContractCount: 3 },
      "session-token",
    ));
  });
});
