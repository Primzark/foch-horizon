import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSeo } from "@/lib/seo/useSeo";

function SeoProbe() {
  useSeo({
    title: "SEO Test",
    description: "Description SEO test",
    canonicalPath: "/contact",
  });
  return null;
}

describe("useSeo canonical behavior without public site URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    document.head.innerHTML = "";
  });

  it("does not emit canonical or og:url when VITE_PUBLIC_SITE_URL is missing", async () => {
    vi.stubEnv("VITE_PUBLIC_SITE_URL", "");

    render(<SeoProbe />);

    await waitFor(() => {
      expect(document.title).toBe("SEO Test");
    });

    expect(document.querySelector("link[rel='canonical']")).toBeNull();
    expect(document.querySelector('meta[property="og:url"]')).toBeNull();
  });

  it("emits canonical and og:url when VITE_PUBLIC_SITE_URL is configured", async () => {
    vi.stubEnv("VITE_PUBLIC_SITE_URL", "https://preview.example.test");

    render(<SeoProbe />);

    await waitFor(() => {
      const canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
      expect(canonical?.href).toBe("https://preview.example.test/contact");
    });

    const ogUrl = document.querySelector('meta[property="og:url"]');
    expect(ogUrl?.getAttribute("content")).toBe("https://preview.example.test/contact");
  });
});
