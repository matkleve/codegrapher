# Design tokens

**Who this is for:** anyone styling UI or referencing colors from JS/SVG.  
**Canonical emission:** `client/src/index.css` (`:root` light default, `.dark` class for dark).  
**Agent rule:** `.cursor/rules/tailwind-tokens-only.mdc` — reuse tokens below; never add one-off CSS variables.

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

Mapped in JS via `STRUCTURAL_EDGE_STROKE` in `client/src/lib/structuralEdgeColors.ts`.

Preview **binding** wires (initializer → local/param) reuse `--token-edge-variable` with a dotted overlay style (`preview-edge-path--binding`) — not a separate `--edge-*` hue. See [connection-taxonomy.md](../specs/system/connection-taxonomy.md) § Binding.

Preview **control-flow** wires (`switch`/`if` → branch) use a dedicated hue, `--edge-control-flow`, with a dash-dot overlay style (`preview-edge-branch`) — unlike binding/usage, they don't reuse a token-kind color, since the anchors are keywords/conditions rather than a specific symbol kind. **Binding** wires use `--edge-binding` (type-adjacent cyan), dotted (`preview-edge-binding`). See [connection-taxonomy.md](../specs/system/connection-taxonomy.md) § Control flow.

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
| `--control-height-compact` | 1.5 | — | Explorer / menu row height |
| `--control-height-sm` | 1.75 | — | Small buttons, compact inputs |
| `--control-height-md` | 2 | — | Default buttons |
| `--control-height-lg` | 2.25 | — | Icon-only large controls |
| `--control-gap` | 0.375 | — | Button / row internal gap |

**Component pattern** (see `button.tsx`): `h-[var(--control-height-sm)]`, `text-[length:var(--font-size-xs)]`, `px-[var(--control-padding-x-sm)]`. Tailwind bridge classes (`text-xs`, `text-caption`) resolve to the same tokens via `@theme inline`.

## Toggle / pressed chrome

| Token | Role |
| ----- | ---- |
| `--interactive-toggle-bg`, `--interactive-toggle-border` | Aliases of `--surface-active*` for `aria-pressed` toggles |

---

## Tailwind bridge

Brand and shadcn palette colors are registered in `@theme inline` (`index.css`). Domain tokens (chips, trace, member rows) stay CSS-only via `var(--…)` unless a bridge is explicitly added. Prefer existing tokens over new ones.
