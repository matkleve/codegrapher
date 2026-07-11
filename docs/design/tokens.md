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

| Token | Value | Role |
| ----- | ----- | ---- |
| `--motion-hover-surface` | 320ms | Background, border, box-shadow (`.hoverable`, buttons) |
| `--motion-hover-color` | 380ms | Text, icon, stroke, chevron rotation |
| `--motion-dim` | 200ms | Trace/Ctrl fade, member body, node border |
| `--motion-chip-surface` | 220ms | Token chip background/shadow |
| `--motion-chip-color` | 280ms | Token chip text color |
| `--ease` | cubic-bezier | Standard deceleration |
| `--spring` | cubic-bezier | Preview edge / socket pop |

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
| `--code-type-primitive` | TS primitive in signatures | muted blue-gray |

Syntax literals (non-indexed): `--code-keyword`, `--code-string`, `--code-number`.

### Signature chips

| Token | Role |
| ----- | ---- |
| `--member-sig-bg-in` | Param value fill (neutral grey from foreground → card) |
| `--member-sig-bg-out` | Return value fill (slightly darker neutral grey) |

Borderless; semantic ink on indexed types; primitives use `--code-type-primitive`. Container fills are achromatic — no semantic hue tint. No `--brand` on signature surfaces.

### Structural connection edges (`--edge-*`)

Persistent taxonomy wires (inheritance, implementation, composition, module import):

| Token | Kind |
| ----- | ---- |
| `--edge-inheritance` | `extends` (solid, hollow triangle) |
| `--edge-implementation` | `implements` (dotted, hollow triangle) |
| `--edge-composition` | constructor DI (solid, filled diamond) |
| `--edge-import` | module import toggle (thin dotted) |

Mapped in JS via `STRUCTURAL_EDGE_STROKE` in `client/src/lib/structuralEdgeColors.ts`.

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
| `--radius` | Base scale (10px) |
| `--radius-node` | Class node card (13px prototype) |
| `--token-chip-radius` | Inline code chips (5px) |

## Toggle / pressed chrome

| Token | Role |
| ----- | ---- |
| `--interactive-toggle-bg`, `--interactive-toggle-border` | `aria-pressed` map/toolbar toggles |

---

## Tailwind bridge

Brand registered as `brand`, `brand-surface`, `brand-border` in Tailwind config. Prefer CSS variables in new work.
