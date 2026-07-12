# Design tokens

**Who this is for:** anyone styling UI or referencing colors from JS/SVG.  
**Canonical emission:** `client/src/styles/theme-light.css` (`:root`) and `theme-dark.css` (`.dark`); wired from `index.css`.  
**Agent rule:** `.cursor/rules/tailwind-tokens-only.mdc` — reuse tokens below; never add one-off CSS variables.

**CSS layout:**

| File | Owns |
| ---- | ---- |
| `index.css` | Tailwind entry, `@theme inline`, base layer, style imports |
| `styles/theme-light.css` / `theme-dark.css` | Canonical `:root` / `.dark` token emission |
| `styles/control-rows.css` | Compact menu / legend row density |
| `styles/interactive-surfaces.css` | `.hoverable`, explorer headers, graph toggles |
| `styles/graph-chrome.css` | Canvas grid, pane cursors, map controls, resizer |
| `styles/panel-resize.css` | Sidebar + simulation panel resize handles |
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
| `--muted`, `--muted-foreground` | Secondary text; **member row resting fill** (`bg-muted`) |
| `--primary` | Periwinkle action accent (both themes) — **not** default interactive hover |

## Brand (interactive hover)

| Token | Role |
| ----- | ---- |
| `--brand` | Gold hover ink (both themes) |
| `--brand-surface` | Hover fill |
| `--brand-border` | Hover border |

Registered in Tailwind as `brand`, `brand-surface`, `brand-border`.

## Motion

Emitted in `:root` (`index.css`):

Three motion classes by **meaning** (see [state-visuals.md → Motion philosophy](state-visuals.md#motion-philosophy)):

| Class | Token | Value | Role |
| ----- | ----- | ----- | ---- |
| Affordance | `--motion-hover-surface` | 120ms | Background, border, box-shadow (`.hoverable`, buttons) |
| Affordance | `--motion-hover-color` | 120ms | Text, icon, stroke, chevron rotation |
| Affordance | `--motion-chip-surface` | 120ms | Token chip background/shadow |
| Affordance | `--motion-chip-color` | 120ms | Token chip text color |
| Reveal | `--motion-dim` | 80ms | Trace/Ctrl/sim reveal crossfade (syntax dim, chip lit, wire opacity) |
| — | `--ease` | cubic-bezier | Standard deceleration |
| — | `--spring` | cubic-bezier | Preview edge / socket pop |

The four affordance tokens share one value; they stay split by property so affordance
timing can be retuned later. Reveal is 0ms **and** enforced structurally: `trace-modes.css` snaps every
transition inside `.react-flow__node` while a reveal mode is active, so per-element reveal
timing must never be re-added.

**Rule:** New clickable/draggable surfaces MUST use brand tokens via `.hoverable` or `INTERACTIVE_SURFACE` / `INTERACTIVE_ROW` in `client/src/lib/controlTokens.ts`. Do not route interactive hover through `--primary`.

See [brand-book.md](brand-book.md) for the full accent matrix.

## Connector / preview edges

| Token | Role |
| ----- | ---- |
| `TOKEN_EDGE_STROKE` (JS) | Flow-anchor / jump-tip dot ink by token kind — not preview wire stroke |
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

### Achromatic surfaces

| Token | Role |
| ----- | ---- |
| `--surface-neutral-strong` | Return pill, expanded body hover wash, connector hover |
| `--trace-dim-surface` | Trace/Ctrl dim row + sig pill fill (`foreground` 3% → `card`) |

### Method member rows

| Token / surface | Role |
| ------------- | ---- |
| `bg-muted` on `.member-row` | Resting fill for all member rows (blue-grey `--muted`) |
| `--brand-surface` / `--brand-border` | Header **chrome** hover (`.member-row-header.hoverable`, not title pill) |
| `--member-row-trace-lit-bg` | **Title** hover/trace + lit member row — function blue into `--background` |
| `--member-row-trace-lit-border` | Pairs with inset ring in `trace-modes.css` |
| `--member-sig-bg-in` | Param pill fill — `color-mix` of function blue into `--background` |
| `--member-sig-bg-out` | Return pill fill (`--surface-neutral-strong`) |

Do **not** `color-mix` chromatic tokens into `--card` (chroma 0 breaks oklch hue toward red). Mix into `--background` or `--muted` instead.

### Signature chips

Borderless; param names use variable ink; indexed types use semantic ink only when **connectable**. No `--brand` on signature surfaces. Under Ctrl/trace dim, sig pills use `--trace-dim-surface`.

### Structural connection edges (`--edge-*`)

Persistent taxonomy wires (inheritance, implementation, composition, module import):

| Token | Kind |
| ----- | ---- |
| `--edge-inheritance` | `extends` (solid, hollow triangle) |
| `--edge-implementation` | `implements` (dotted, hollow triangle) |
| `--edge-composition` | constructor DI (solid, filled diamond) |
| `--edge-import` | module import toggle (thin dotted) |
| `--edge-usage` | usage + transitive preview wires (dashed, function blue) |
| `--edge-binding` | initializer → binding preview (dotted) |
| `--edge-typesetting` | sig-type → param def preview (dash-dot, type teal) |
| `--edge-control-flow` | `switch`/`if` → branch preview (dash-dot) |

Mapped in JS via `STRUCTURAL_EDGE_STROKE` in `client/src/lib/structuralEdgeColors.ts`.

Preview **usage** and **transitive** wires use `--edge-usage` (function blue) — one hue for every indexed symbol kind, so usage lines never mimic structural inheritance purple. **Provenance** distance reuses the same hue with opacity from `tracePathOpacity(depth)` (inline on wires and chips via `traceLitApply.ts` / `previewEdgeDom.ts`). See [preview-edges.trace-strength.supplement.md](../specs/system/preview-edges.trace-strength.supplement.md) and [visual-strength-stacks.md](../agent-playbook/core/visual-strength-stacks.md).

Preview **binding** wires use `--edge-binding` (cyan **188°** — hue-separated from typesetting), dotted (`preview-edge-binding`). See [connection-taxonomy.md](../specs/system/connection-taxonomy.md) § Binding.

Preview **typesetting** wires use `--edge-typesetting` (alias of `--token-edge-type`, teal **200°**), dash-dot on **rounded orthogonal** paths (`preview-edge-typesetting`). See [connection-taxonomy.md](../specs/system/connection-taxonomy.md) § Typesetting.

**Accessibility:** connection kinds MUST NOT rely on color alone — see [accessibility.md](accessibility.md).

### Trace dimming

| Token | Role |
| ----- | ---- |
| `--faint` | Plain trace dim ink |
| `--faint-ctrl` | Ctrl reveal dim (harder bleach) |
| `--faint-body`, `--faint-kw`, … | Per-syntax trace dim mixes |
| `--trace-dim-surface` | Dim member rows + sig pills under trace/Ctrl |
| `--glint-hi` | Ctrl shimmer streak highlight |

## File-type pills

| Token | Role |
| ----- | ---- |
| `--file-chip-ts` | TypeScript |
| `--file-chip-react` | React (tsx/jsx) |
| `--file-chip-angular` | Alias of `--file-chip-ts` |
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
| `--font-size-2xs` | 0.625 | `text-2xs` | Micro labels (chevrons, gutters, badges) |
| `--font-size-caption` | 0.6875 | `text-caption` | Load connector, compact toolbar |
| `--font-size-xs` | 0.75 | `text-xs` | Explorer rows, code lines, menus |
| `--font-size-sm` | 0.875 | `text-sm` | Node titles, buttons |
| `--font-size-md` | 1 | `text-base` | Body default |
| `--control-height-compact` | 1.5 | — | Explorer / menu row height (`density="compact"`) |
| `--control-height-sm` | 1.75 | — | Legend rows (`density="legend"`), small buttons |
| `--control-height-md` | 2 | — | Default buttons |
| `--control-height-lg` | 2.25 | — | Icon-only large controls |
| `--legend-swatch-width` | 3.25 | — | Connection legend wire preview width |
| `--legend-swatch-height` | 0.8125 | — | Connection legend wire preview height |
| `--control-gap` | 0.375 | — | Button / row internal gap |

**Component pattern** (see `button.tsx`): `h-[var(--control-height-sm)]`, `text-[length:var(--font-size-xs)]`, `px-[var(--control-padding-x-sm)]`. Tailwind bridge classes (`text-xs`, `text-caption`) resolve to the same tokens via `@theme inline`.

## Toggle / pressed chrome

| Token | Role |
| ----- | ---- |
| `--interactive-toggle-bg`, `--interactive-toggle-border` | Aliases of `--surface-active*` for `aria-pressed` toggles |

---

## Tailwind bridge

Brand and shadcn palette colors are registered in `@theme inline` (`index.css`). Domain tokens (chips, trace, member rows) stay CSS-only via `var(--…)` unless a bridge is explicitly added. Prefer existing tokens over new ones.
