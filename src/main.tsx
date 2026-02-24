import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const LOVABLE_BADGE_SELECTORS = [
  'a[href*="lovable"]',
  'iframe[src*="lovable"]',
  "[data-lovable]",
  '[id*="lovable"]',
  '[class*="lovable"]',
] as const;
const LOVABLE_BADGE_TEXT = "edit with lovable";

function removeLovableElement(node: Element): void {
  (
    node.closest(
      'a[href*="lovable"],iframe[src*="lovable"],[data-lovable],[id*="lovable"],[class*="lovable"],a,button,div,span',
    ) ?? node
  ).remove();
}

function maybeRemoveLovableTextBadge(node: Element): void {
  if (!/^(A|BUTTON|DIV|SPAN)$/.test(node.tagName)) {
    return;
  }

  const text = node.textContent?.toLowerCase();
  if (!text?.includes(LOVABLE_BADGE_TEXT)) {
    return;
  }

  removeLovableElement(node);
}

function scanLovableBadgeInRoot(root: ParentNode): void {
  for (const selector of LOVABLE_BADGE_SELECTORS) {
    root.querySelectorAll(selector).forEach(removeLovableElement);
  }

  root.querySelectorAll("a,button,div,span").forEach(maybeRemoveLovableTextBadge);
}

function startLovableBadgeCleanup(): void {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof MutationObserver === "undefined"
  ) {
    return;
  }

  scanLovableBadgeInRoot(document);

  let rafId: number | null = null;
  const queuedRoots = new Set<Element>();

  const flushQueuedScans = () => {
    rafId = null;
    queuedRoots.forEach((root) => scanLovableBadgeInRoot(root));
    queuedRoots.clear();
  };

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) {
          return;
        }

        for (const selector of LOVABLE_BADGE_SELECTORS) {
          if (node.matches(selector)) {
            removeLovableElement(node);
            return;
          }
        }

        maybeRemoveLovableTextBadge(node);

        if (node.childElementCount > 0) {
          queuedRoots.add(node);
        }
      });
    }

    if (queuedRoots.size === 0 || rafId != null) {
      return;
    }

    rafId = window.requestAnimationFrame(flushQueuedScans);
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("beforeunload", () => {
    if (rafId != null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    observer.disconnect();
  });
}

startLovableBadgeCleanup();

createRoot(document.getElementById("root")!).render(<App />);
