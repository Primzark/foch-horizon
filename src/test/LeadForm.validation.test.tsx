import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { submitLeadMock, trackEventMock } = vi.hoisted(() => ({
  submitLeadMock: vi.fn(),
  trackEventMock: vi.fn(),
}));

vi.mock("@/features/leads/api/leads.service", () => ({
  submitLead: (...args: unknown[]) => submitLeadMock(...args),
}));

vi.mock("@/lib/analytics/events", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

import { LeadForm } from "@/features/leads/components/LeadForm";

function renderLeadForm() {
  return render(
    <MemoryRouter>
      <LeadForm source="contact_page" />
    </MemoryRouter>,
  );
}

function enterValidLead() {
  fireEvent.change(screen.getByLabelText(/Prénom/), { target: { value: "Camille" } });
  fireEvent.change(screen.getByLabelText(/Nom/), { target: { value: "Martin" } });
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "camille@example.fr" } });
  fireEvent.change(screen.getByLabelText(/Téléphone/), { target: { value: "   " } });
  fireEvent.change(document.getElementById("lead-message")!, { target: { value: "Je souhaite vendre mon appartement." } });
  fireEvent.click(screen.getByRole("checkbox"));
}

describe("LeadForm validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    submitLeadMock.mockResolvedValue({ ok: true, leadId: "test-lead", assignedAgentId: null });
  });

  it("waits until email blur and clears the error as soon as the email is corrected", () => {
    renderLeadForm();
    const email = screen.getByLabelText(/Email/);

    fireEvent.change(email, { target: { value: "invalid-email" } });
    expect(screen.queryByText(/Vérifiez l’adresse email/)).not.toBeInTheDocument();

    fireEvent.blur(email);
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-describedby", "lead-email-error");

    fireEvent.change(email, { target: { value: "camille@example.fr" } });
    expect(screen.queryByText(/Vérifiez l’adresse email/)).not.toBeInTheDocument();
    expect(email).not.toHaveAttribute("aria-invalid", "true");
  });

  it("summarizes submit errors, focuses the summary, and links users to fields", async () => {
    renderLeadForm();
    fireEvent.submit(screen.getByRole("button", { name: "Envoyer" }).closest("form")!);

    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Prénom");
    expect(summary).toHaveTextContent("Email");
    expect(summary).toHaveTextContent("Message");
    expect(submitLeadMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Prénom/)).toHaveAttribute("aria-invalid", "true");

    fireEvent.click(screen.getByRole("link", { name: /Prénom: Indiquez votre prénom/i }));
    expect(screen.getByLabelText(/Prénom/)).toHaveFocus();

    fireEvent.change(screen.getByLabelText(/Prénom/), { target: { value: "Camille" } });
    expect(screen.queryByText("Indiquez votre prénom.")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Prénom/)).not.toHaveAttribute("aria-invalid", "true");
  });

  it("submits a valid request and announces success", async () => {
    renderLeadForm();
    enterValidLead();
    fireEvent.submit(screen.getByRole("button", { name: "Envoyer" }).closest("form")!);

    await waitFor(() => expect(submitLeadMock).toHaveBeenCalledTimes(1));
    expect(submitLeadMock).toHaveBeenCalledWith(expect.objectContaining({
      firstName: "Camille",
      lastName: "Martin",
      email: "camille@example.fr",
      phone: undefined,
      consent: true,
    }));
    expect(screen.getByRole("checkbox", { name: /J'accepte que mes données soient utilisées/i })).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("Demande envoyée avec succès");
  });

  it("ignores repeated submissions while the first request is pending", async () => {
    submitLeadMock.mockImplementationOnce(
      () => new Promise((resolve) => window.setTimeout(() => resolve({ ok: true, leadId: "test-lead", assignedAgentId: null }), 25)),
    );
    renderLeadForm();
    enterValidLead();
    const form = screen.getByRole("button", { name: "Envoyer" }).closest("form")!;

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(submitLeadMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toHaveTextContent("Demande envoyée avec succès");
  });

  it("keeps entered values and gives recovery guidance when the server rejects a request", async () => {
    submitLeadMock.mockRejectedValueOnce(new Error("server details should not be exposed"));
    renderLeadForm();
    enterValidLead();
    fireEvent.submit(screen.getByRole("button", { name: "Envoyer" }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent(/réessayez ; vos informations sont conservées/i);
    expect(screen.getByLabelText(/Prénom/)).toHaveValue("Camille");
    expect(screen.getByLabelText(/Email/)).toHaveValue("camille@example.fr");
  });
});
