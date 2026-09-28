import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListingShareButton } from "@/features/listings/components/ListingShareButton";

const { successToast, trackEvent } = vi.hoisted(() => ({ successToast: vi.fn(), trackEvent: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: successToast } }));
vi.mock("@/lib/analytics/events", () => ({ trackEvent }));

const path = "/biens/5159-appartement-au-havre";
const canonicalUrl = new URL(path, window.location.origin).href;

function renderShareButton() {
  render(<ListingShareButton propertyId={5159} title="Appartement au Havre" path={path} />);
  fireEvent.click(screen.getByRole("button", { name: "Partager" }));
}

describe("listing sharing", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("opens native sharing with the listing's canonical URL", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });
    renderShareButton();
    await waitFor(() => expect(trackEvent).toHaveBeenCalledWith("listing_viewed", { propertyId: 5159, action: "share" }));
    expect(share).toHaveBeenCalledWith({ title: "Appartement au Havre | Foch Immobilier", url: canonicalUrl });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the link and confirms success when native sharing is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    renderShareButton();
    await waitFor(() => expect(successToast).toHaveBeenCalledWith("Lien du bien copié"));
    expect(writeText).toHaveBeenCalledWith(canonicalUrl);
  });

  it("falls back to clipboard when native sharing fails", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share: vi.fn().mockRejectedValue(new Error("Denied")), clipboard: { writeText } });
    renderShareButton();
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(canonicalUrl));
  });

  it("does not copy or show errors after native sharing is cancelled", async () => {
    const writeText = vi.fn();
    const cancelled = new Error("Cancelled");
    cancelled.name = "AbortError";
    vi.stubGlobal("navigator", { share: vi.fn().mockRejectedValue(cancelled), clipboard: { writeText } });
    renderShareButton();
    await waitFor(() => expect(screen.getByRole("button", { name: "Partager" })).toBeEnabled());
    expect(writeText).not.toHaveBeenCalled();
    expect(successToast).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("provides a selectable link when browser permissions also block the clipboard", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) } });
    renderShareButton();
    const link = await screen.findByRole("textbox", { name: "Lien du bien à partager" });
    expect(link).toHaveValue(canonicalUrl);
    expect(screen.getByRole("dialog", { name: "Partager ce bien" })).toBeInTheDocument();
    expect(successToast).not.toHaveBeenCalled();
  });
});
