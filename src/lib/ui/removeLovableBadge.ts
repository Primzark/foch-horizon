const LOVABLE_TEXT_RE = /edit\s+with\s+lovable/i;
const LOVABLE_ATTR_RE = /lovable/i;

function findFixedAncestor(node: Element): Element | null {
  let current: Element | null = node;

  for (let depth = 0; current && depth < 5; depth += 1) {
    const style = window.getComputedStyle(current);
    if (style.position === "fixed") {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function removeBadgeNode(node: Element): void {
  // Guard: only remove if the node is still attached and its parent still owns it.
  if (!node.isConnected || !node.parentNode) {
    return;
  }
  try {
    node.parentNode.removeChild(node);
  } catch {
    // Node was already removed (e.g. by React's reconciler) — safe to ignore.
  }
}

function stripLovableBadges(): void {
  const nodes = document.querySelectorAll<HTMLElement>("a,button,div,span,p,aside");

  nodes.forEach((node) => {
    const text = node.textContent?.trim() ?? "";
    const href = node instanceof HTMLAnchorElement ? node.href : "";
    const dataAttrs = Array.from(node.attributes).some((attr) => LOVABLE_ATTR_RE.test(attr.name) || LOVABLE_ATTR_RE.test(attr.value));
    const fixedAncestor = findFixedAncestor(node);
    const hasBadgeText = LOVABLE_TEXT_RE.test(text);
    const hasLovableSignal = LOVABLE_ATTR_RE.test(href) || dataAttrs;
    const target = fixedAncestor ?? node;

    if (hasBadgeText || (hasLovableSignal && fixedAncestor)) {
      removeBadgeNode(target);
    }
  });
}

export function removeLovableBadge(): void {
  if (typeof window === "undefined") {
    return;
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) {
      return;
    }

    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      stripLovableBadges();
    });
  };

  schedule();

  const observer = new MutationObserver(() => {
    schedule();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("beforeunload", () => observer.disconnect(), { once: true });
}
