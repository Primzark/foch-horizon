import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

function removeLovableBadge(): void {
  const selectors = [
    'a[href*="lovable"]',
    'iframe[src*="lovable"]',
    "[data-lovable]",
    '[id*="lovable"]',
    '[class*="lovable"]',
  ];

  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach((node) => node.remove());
  }

  document.querySelectorAll<HTMLElement>("a,button,div,span").forEach((node) => {
    const text = node.textContent?.toLowerCase();
    if (!text?.includes("edit with lovable")) {
      return;
    }

    const computedStyle = window.getComputedStyle(node);
    if (computedStyle.position !== "fixed") {
      return;
    }

    const left = Number.parseFloat(computedStyle.left);
    const bottom = Number.parseFloat(computedStyle.bottom);
    if (!Number.isFinite(left) || !Number.isFinite(bottom)) {
      return;
    }

    if (left <= 48 && bottom <= 48) {
      (node.closest("a,button,div") ?? node).remove();
    }
  });
}

function startLovableBadgeCleanup(): void {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof MutationObserver === "undefined"
  ) {
    return;
  }

  removeLovableBadge();

  const observer = new MutationObserver(() => {
    removeLovableBadge();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("beforeunload", () => {
    observer.disconnect();
  });
}

startLovableBadgeCleanup();

createRoot(document.getElementById("root")!).render(<App />);
