/**
 * Unified interactive surface system.
 *
 * Brand-gold hover (surface, border, text, motion) lives in index.css on `.hoverable`.
 * Components import these constants — do not duplicate hover:bg-brand-* in Tailwind.
 *
 * CSS tokens: --brand, --brand-surface, --brand-border,
 *             --motion-hover-surface, --motion-hover-color, --motion-dim,
 *             --motion-chip-surface, --motion-chip-color, --ease
 * Toggle-on tokens: --interactive-toggle-bg, --interactive-toggle-border
 */

/** Base interactive surface — hover + expanded/pressed use brand tokens */
export const INTERACTIVE_SURFACE = "hoverable";

/** Compact menu / explorer row */
export const INTERACTIVE_ROW =
  "hoverable control-row-compact pointer-events-auto flex cursor-pointer items-center border border-transparent";

export const INTERACTIVE_ROW_LEFT = `${INTERACTIVE_ROW} w-full justify-start text-left`;

/** Two-line title + subtitle rows (menus, connection lists) — nav font tokens, not compact fixed height */
export const INTERACTIVE_ROW_DOUBLE =
  `${INTERACTIVE_SURFACE} control-row-double pointer-events-auto flex w-full cursor-pointer items-center justify-start border border-transparent text-left`;

export const INTERACTIVE_ROW_NODRAG = `${INTERACTIVE_ROW} nodrag`;

/** Read-only menu row — muted hover, no click affordance */
export const INTERACTIVE_ROW_STATIC_LEFT =
  "hoverable-neutral control-row-compact flex w-full cursor-default items-center border border-transparent justify-start text-left";

/** Toggle / legend row — grey hover, clickable */
export const INTERACTIVE_ROW_NEUTRAL_LEFT =
  "hoverable-neutral control-row-compact pointer-events-auto flex w-full cursor-pointer items-center border border-transparent justify-start text-left";

/** Read-only passive row — grey surface + border at rest (hidden/disabled legend items) */
export const INTERACTIVE_ROW_PASSIVE_LEFT =
  "list-row-passive control-row-compact flex w-full items-center justify-start text-left";

/** Passive toggle row — grey at rest, clickable */
export const INTERACTIVE_ROW_PASSIVE_TOGGLE_LEFT =
  `${INTERACTIVE_ROW_PASSIVE_LEFT} pointer-events-auto cursor-pointer`;

/** Graph map / toolbar toggle when aria-pressed */
export const INTERACTIVE_TOGGLE_ACTIVE = "interactive-toggle--active";
