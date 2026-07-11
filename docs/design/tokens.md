# Design tokens

**Who this is for:** anyone styling UI or referencing colors from JS/SVG.  
**Canonical emission:** `client/src/index.css` (`:root` light default, `.dark` class for dark).

**CSS layout:**

| File | Owns |
| ---- | ---- |
| `index.css` | Theme emission (`:root`), `.hoverable` interactive system, explorer, graph chrome |
| `styles/tokens-chips.css` | Token chip resting ink, chip-on, load connector shell |
| `styles/trace-modes.css` | Ctrl preview, trace dim/lit, syntax fade |
| `styles/preview-wires.css` | Preview + structural wires, flow anchors |
| `styles/nodes.css` | Class node headers, member rows, signature tags, file pills |

---

## Semantic colors

| Token | Role |
| ----- | ---- |
| `--background`, `--foreground` | App shell |
| `--card`, `--card-foreground` | Class node cards |
| `--border`, `--input`, `--ring` | Borders and focus rings |
| `--muted`, `--muted-foreground` | Secondary text |
| `--primary` | Periwinkle action accent (both themes) — **not** default interactive hover |

## Brand (interactive hover)

| Token | Role |
| ----- | ---- |
| `--brand` | Gold hover ink (both themes) |
| `--brand-surface` | Hover fill |
| `--brand-border` | Hover border |

## Motion

Emitted in `:root` (`index.css`):

Two tiers by **meaning** (see [state-visuals.md → Motion philosophy](state-visuals.md#motion-philosophy)):

| Tier | Token | Value | Role |
| ---- | ----- | ----- | ---- |
| A · affordance | `--motion-hover-surface` | 120ms | Background, border, box-shadow (`.hoverable`, buttons) |
| A · affordance | `--motion-hover-color` | 120ms | Text, icon, stroke, chevron rotation |
| A · affordance | `--motion-chip-surface` | 120ms | Token chip background/shadow |
| A · affordance | `--motion-chip-color` | 120ms | Token chip text color |
| B · reveal | `--motion-dim` | 0ms | Trace/Ctrl/sim reveal — instant, never a crossfade |
| — | `--ease` | cubic-bezier | Standard deceleration |
| — | `--spring` | cubic-bezier | Preview edge / socket pop |

The four Tier-A tokens share one value; they stay split by property so a tier can be
retuned later. Tier B is 0ms **and** enforced structurally: `trace-modes.css` snaps every
transition inside `.react-flow__node` while a reveal mode is active, so per-element reveal
timing must never be re-added.

**Rule:** New clickable/draggable surfaces MUST use brand tokens via `.hoverable` or `INTERACTIVE_SURFACE` / `INTERACTIVE_ROW` in `client/src/lib/controlTokens.ts`. Do not route interactive hover through `--primary`.

See [brand-book.md](brand-book.md) for the full accent matrix.

## Connector / preview edges

| Token | Role |
| ----- | ---- |
| `TOKEN_EDGE_STROKE` (JS) | Preview edge stroke — CSS variable via `style`, never hex in SVG attrs |
| `TOKEN_ANCHOR` (JS) | Flow-anchor fill classes |

Chip resting ink, Ctrl shimmer, and trace lit states are **CSS-only** in `tokens-chips.css` / `trace-modes.css` via `data-token-kind` — do not duplicate in TS maps.

### Semantic token ink (`--token-edge-*`)

One hue per indexed symbol kind — chips, preview edges, and lit trace endpoints:

| Token | Kind | Hue |
| ----- | ---- | --- |
| `--token-edge-class` | class | periwinkle (~278) |
| `--token-edge-function` | function / method | blue (~255) |
| `--token-edge-type` | type annotation, import path | teal (~200) |
| `--token-edge-variable` | variable, property, param | indigo (~292) |
| `--token-surface-*` | chip `:hover`, `:focus-visible`, `token-chip-on` fill — `color-mix(in srgb, …)` light tint of matching `--token-edge-*` (never oklch into achromatic neutral — hue snaps red) |
| `--code-type-primitive` | TS primitive in signatures | muted blue-gray |

Syntax literals (non-indexed): `--code-keyword`, `--code-string`, `--code-number`.

### Achromatic surfaces (property rows, signature pills)

| Token | Role |
| ----- | ---- |
| `--surface-neutral` | Property member row resting fill |
| `--surface-neutral-strong` | Return pill, code body hover |

### Method member rows

| Token / surface | Role |
| ------------- | ---- |
| `bg-muted` on `.member-row` | Resting fill for all member rows (blue-grey `--muted`) |
| `--member-sig-bg-in` | Param pill fill — `color-mix` of function blue into `--background` |
| `--member-sig-bg-out` | Return pill fill (`--surface-neutral-strong`) |
| `--member-row-trace-lit-bg` | Lit member row during trace hover — function blue mixed into `--background` |
| `--member-row-trace-lit-border` | Lit row border (pairs with inset ring in `trace-modes.css`) |

Do **not** `color-mix` chromatic tokens into `--card` (chroma 0 breaks oklch hue toward red). Mix into `--background` or `--muted` instead.

### Signature chips

| Token | Role |
| ----- | ---- |
| `--member-sig-bg-in` | Param value fill (`--surface-neutral`) |
| `--member-sig-bg-out` | Return value fill (`--surface-neutral-strong`) |

Borderless; param names use variable ink; indexed types use semantic ink only when **connectable**. No `--brand` on signature surfaces.

### Structural connection edges (`--edge-*`)

Persistent taxonomy wires (inheritance, implementation, composition, module import):

| Token | Kind |
| ----- | ---- |
| `--edge-inheritance` | `extends` (solid, hollow triangle) |
| `--edge-implementation` | `implements` (dotted, hollow triangle) |
| `--edge-composition` | constructor DI (solid, filled diamond) |
| `--edge-import` | module import toggle (thin dotted) |

Mapped in JS via `STRUCTURAL_EDGE_STROKE` in `client/src/lib/structuralEdgeColors.ts`.

Preview **binding** wires (initializer → local/param) reuse `--token-edge-variable` with a dotted overlay style (`preview-edge-path--binding`) — not a separate `--edge-*` hue. See [connection-taxonomy.md](../specs/system/connection-taxonomy.md) § Binding.

Preview **control-flow** wires (`switch`/`if` → branch) use a dedicated hue, `--edge-control-flow`, with a dash-dot overlay style (`preview-edge-branch`) — unlike binding/usage, they don't reuse a token-kind color, since the anchors are keywords/conditions rather than a specific symbol kind. See [connection-taxonomy.md](../specs/system/connection-taxonomy.md) § Control flow.

### Trace dimming

| Token | Role |
| ----- | ---- |
| `--faint` | Plain trace dim ink |
| `--faint-ctrl` | Ctrl reveal dim (harder bleach) |
| `--glint-hi` | Ctrl shimmer streak highlight |

## File-type pills

| Token | Role |
| ----- | ---- |
| `--file-chip-ts` | TypeScript |
| `--file-chip-react` | React (tsx/jsx) |
| `--file-chip-angular` | Angular |
| `--file-chip-test` | Spec/test files |

Applied via `.file-type-chip--*` classes in `nodes.css`.

## Shape

| Token | Role |
| ----- | ---- |
| `--radius` | Base scale (0.625rem) |
| `--radius-sm` … `--radius-xl` | Derived corner radii |
| `--radius-node` | Class node card (`calc(--radius + 0.1875rem)`) |
| `--token-chip-radius` | Inline code chips (0.3125rem) |

## Typography & control sizes (canonical scale)

Emitted once in `:root` (`index.css`). **Do not** use arbitrary `text-[Npx]` or `h-7`/`h-8` in app components — run `npm run lint:tokens`.

| Token | rem | Tailwind bridge | Role |
| ----- | --- | --------------- | ---- |
| `--font-size-2xs` | 0.625 | `text-2xs` | Micro labels (chevrons, badges) |
| `--font-size-caption` | 0.6875 | `text-caption` | Load connector, compact toolbar |
| `--font-size-xs` | 0.75 | `text-xs` | Explorer rows, code lines, menus |
| `--font-size-sm` | 0.875 | `text-sm` | Node titles, buttons |
| `--font-size-md` | 1 | `text-base` | Body default |
| `--control-height-compact` | 1.375 | — | Explorer / menu row height |
| `--control-height-sm` | 1.75 | — | Small buttons, compact inputs |
| `--control-height-md` | 2 | — | Default buttons |
| `--control-height-lg` | 2.25 | — | Icon-only large controls |
| `--control-gap` | 0.375 | — | Button / row internal gap |

**Component pattern** (see `button.tsx`): `h-[var(--control-height-sm)]`, `text-[length:var(--font-size-xs)]`, `px-[var(--control-padding-x-sm)]`. Tailwind bridge classes (`text-xs`, `text-caption`) resolve to the same tokens via `@theme inline`.

## Toggle / pressed chrome

| Token | Role |
| ----- | ---- |
| `--interactive-toggle-bg`, `--interactive-toggle-border` | `aria-pressed` map/toolbar toggles |

---

## Tailwind bridge

Brand registered as `brand`, `brand-surface`, `brand-border` in Tailwind config. Prefer CSS variables in new work.
