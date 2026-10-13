import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock, onAuthStateChangeMock, signInWithPasswordMock, signOutMock, toastMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  signOutMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock("@/lib/supabase/browserClient", () => ({
  getBrowserSupabaseClient: () => ({
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
      signInWithPassword: signInWithPasswordMock,
      signOut: signOutMock,
    },
  }),
}));

vi.mock("@/lib/seo/useSeo", () => ({ useSeo: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }));

import AdminPropertiesPage from "@/features/admin/pages/AdminPropertiesPage";

function renderAdminLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminPropertiesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function getLoginForm() {
  await screen.findByRole("heading", { name: "Espace administrateur" });
  return screen.getByRole("button", { name: "Se connecter" }).closest("form")!;
}

function enterCredentials() {
  fireEvent.change(screen.getByLabelText("Adresse email"), { target: { value: "admin@example.fr" } });
  fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "correct horse battery staple" } });
}

describe("admin login validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ data: { session: null } });
    onAuthStateChangeMock.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    signInWithPasswordMock.mockResolvedValue({ error: null });
  });

  it("waits until email blur, then clears the email error immediately when corrected", async () => {
    renderAdminLogin();
    await getLoginForm();
    const email = screen.getByLabelText("Adresse email");

    fireEvent.change(email, { target: { value: "invalid-email" } });
    expect(screen.queryByText(/Vérifiez l’adresse email/)).not.toBeInTheDocument();

    fireEvent.blur(email);
    expect(await screen.findByText(/Vérifiez l’adresse email/, { selector: "p" })).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-describedby", "admin-email-error");

    fireEvent.change(email, { target: { value: "admin@example.fr" } });
    expect(screen.queryByText(/Vérifiez l’adresse email/)).not.toBeInTheDocument();
    expect(email).not.toHaveAttribute("aria-invalid", "true");
  });

  it("summarizes submit errors, focuses the summary, and clears field errors as values are corrected", async () => {
    renderAdminLogin();
    const form = await getLoginForm();
    fireEvent.submit(form);

    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Adresse email");
    expect(summary).toHaveTextContent("Mot de passe");
    expect(summary).toHaveTextContent("Corrigez les champs signalés, puis réessayez.");
    await waitFor(() => expect(summary).toHaveFocus());
    expect(signInWithPasswordMock).not.toHaveBeenCalled();

    const email = screen.getByLabelText("Adresse email");
    const password = screen.getByLabelText("Mot de passe");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(email, { target: { value: "admin@example.fr" } });
    fireEvent.change(password, { target: { value: "password" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(email).not.toHaveAttribute("aria-invalid", "true");
    expect(password).not.toHaveAttribute("aria-invalid", "true");
  });

  it("blocks a malformed email on submit even when the field was not blurred", async () => {
    renderAdminLogin();
    const form = await getLoginForm();
    const email = screen.getByLabelText("Adresse email");
    fireEvent.change(email, { target: { value: "not-an-email" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "password" } });
    expect(screen.queryByText(/Vérifiez l’adresse email/)).not.toBeInTheDocument();

    fireEvent.submit(form);

    expect(await screen.findByText(/Vérifiez l’adresse email/, { selector: "p" })).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it("preserves credentials and gives a generic recovery message for authentication errors", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({ error: new Error("Invalid login credentials") });
    renderAdminLogin();
    const form = await getLoginForm();
    enterCredentials();
    fireEvent.submit(form);

    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent(/vérifiez votre adresse email et votre mot de passe/i);
    expect(error).not.toHaveTextContent("Invalid login credentials");
    await waitFor(() => expect(error).toHaveFocus());
    expect(screen.getByLabelText("Adresse email")).toHaveValue("admin@example.fr");
    expect(screen.getByLabelText("Mot de passe")).toHaveValue("correct horse battery staple");

    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "updated password" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows recovery guidance for a network failure without exposing the exception", async () => {
    signInWithPasswordMock.mockRejectedValueOnce(new Error("network timeout details"));
    renderAdminLogin();
    const form = await getLoginForm();
    enterCredentials();
    fireEvent.submit(form);

    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent(/réessayez.*vérifiez votre connexion internet/i);
    expect(error).not.toHaveTextContent("network timeout details");
  });

  it("submits valid credentials to Supabase without changing the payload", async () => {
    renderAdminLogin();
    const form = await getLoginForm();
    enterCredentials();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(signInWithPasswordMock).toHaveBeenCalledWith({
        email: "admin@example.fr",
        password: "correct horse battery staple",
      });
    });
  });

  it("ignores repeated submissions while sign-in is pending", async () => {
    let resolveSignIn: ((value: { error: null }) => void) | undefined;
    signInWithPasswordMock.mockImplementationOnce(
      () => new Promise((resolve) => { resolveSignIn = resolve; }),
    );
    renderAdminLogin();
    const form = await getLoginForm();
    enterCredentials();
    fireEvent.submit(form);

    await waitFor(() => expect(screen.getByRole("button", { name: "Connexion…" })).toBeDisabled());
    fireEvent.submit(form);
    expect(signInWithPasswordMock).toHaveBeenCalledTimes(1);

    resolveSignIn?.({ error: null });
    await waitFor(() => expect(screen.getByRole("button", { name: "Se connecter" })).toBeEnabled());
  });
});
