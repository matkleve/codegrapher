const USAGE_SELECTOR = '[data-symbol-role="usage"]';

/**
 * Find visible usage token chips for a symbol name in the graph pane.
 * Usages only exist in the DOM when their method body is expanded.
 */
export function resolveUsageAnchors(
  symbolName: string,
  excludeEl?: HTMLElement | null,
): HTMLElement[] {
  const pane = document.querySelector(".graph-pane");
  if (!pane) return [];

  const escaped = CSS.escape(symbolName);
  const nodes = pane.querySelectorAll<HTMLElement>(
    `[data-symbol-name="${escaped}"]${USAGE_SELECTOR}`,
  );

  return [...nodes].filter((el) => el.isConnected && el !== excludeEl);
}

/** Pick the chip anchor element (left or right FlowAnchor sibling container). */
export function chipAnchorElement(chipEl: HTMLElement): HTMLElement {
  return chipEl;
}
