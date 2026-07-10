/**
 * Unified interactive surface system.
 *
 * Brand-cyan hover (surface, border, text, motion) lives in index.css on `.hoverable`.
 * Components import these constants — do not duplicate hover:bg-brand-* in Tailwind.
 *
 * CSS tokens: --brand, --brand-surface, --brand-border,
 *             --motion-hover-surface, --motion-hover-color, --ease
 * Toggle-on tokens: --interactive-toggle-bg, --interactive-toggle-border
 */

/** Base interactive surface — hover + expanded/pressed use brand tokens */
export const INTERACTIVE_SURFACE = "hoverable";

/** Compact menu / explorer row */
export const INTERACTIVE_ROW =
  "hoverable control-row-compact pointer-events-auto flex cursor-pointer items-center border border-transparent";

export const INTERACTIVE_ROW_LEFT = `${INTERACTIVE_ROW} w-full justify-start text-left`;

export const INTERACTIVE_ROW_NODRAG = `${INTERACTIVE_ROW} nodrag`;

/** Graph map / toolbar toggle when aria-pressed */
export const INTERACTIVE_TOGGLE_ACTIVE = "interactive-toggle--active";

/** Icon control: border only at rest, brand fill only on :hover (ignores aria-expanded fill) */
export const INTERACTIVE_BORDER_BTN = "hoverable interactive-border-only";
