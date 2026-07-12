import {
  getAllByLocalDefId,
  getByLocalDefId,
} from "@/lib/elementRegistry";

/** All DOM hosts for a scoped local definition id (param/local). */
export function allLocalDefElements(
  root: ParentNode,
  defId: string,
): HTMLElement[] {
  const fromRegistry = getAllByLocalDefId(defId);
  if (fromRegistry.length > 0) return fromRegistry;

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
  const fromRegistry = getByLocalDefId(defId);
  if (fromRegistry?.isConnected) {
    const all = getAllByLocalDefId(defId);
    if (all.length <= 1) return fromRegistry;
    for (const el of all) {
      if (el.closest(".member-body-wrap")) return el;
    }
    return fromRegistry;
  }

  const all = allLocalDefElements(root, defId);
  if (all.length === 0) return null;
  if (all.length === 1) return all[0]!;

  for (const el of all) {
    if (el.closest(".member-body-wrap")) return el;
  }
  return all[0]!;
}
