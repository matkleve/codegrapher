/** All DOM hosts for a scoped local definition id (param/local). */
export function allLocalDefElements(
  root: ParentNode,
  defId: string,
): HTMLElement[] {
  return [
    ...root.querySelectorAll<HTMLElement>(
      `[data-local-def-id="${CSS.escape(defId)}"]`,
    ),
  ];
}

/**
 * Prefer the declaration inside expanded method source over the signature
 * summary chip in the member header — both share the same `localDefId`.
 */
export function findLocalDefElement(
  root: ParentNode,
  defId: string,
): HTMLElement | null {
  const all = allLocalDefElements(root, defId);
  if (all.length === 0) return null;
  if (all.length === 1) return all[0]!;

  for (const el of all) {
    if (el.closest(".member-body-wrap")) return el;
  }
  return all[0]!;
}
