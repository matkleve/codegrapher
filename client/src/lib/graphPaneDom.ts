/** Shared DOM lookup helpers used across the preview-edge builders. */

export function graphPane(): HTMLElement | null {
  return document.querySelector(".graph-pane");
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
