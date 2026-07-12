# Brand book

**Who this is for:** anyone adding UI, reviewing design consistency, or resolving styling drift.  
**Canonical emission:** `client/src/index.css` — always update tokens there first, then docs.

Last updated: 2026-07-10

---

## Identity

codegrapher is a **cool blue-gray developer tool** with two accent tiers:

| Tier | Hue | Role |
| ---- | --- | ---- |
| **Brand gold** | oklch ~88 | Pointer hover — "you can interact here" |
| **Primary periwinkle** | oklch ~278 | Committed actions, focus rings, toggles, graph entities |
| **Token semantics** | per kind | Graph meaning — class, function, type, variable |

Gold is the **discovery** accent (hover). Periwinkle is the **commitment** accent (click, toggle, CTA). Never swap them on the same interaction tier.

---

## Brand gold tokens

Defined in `:root` (light) and `.dark`:

| Token | Light | Dark | Use |
| ----- | ----- | ---- | --- |
| `--brand` | `oklch(0.52 0.13 88)` | `oklch(0.78 0.12 88)` | Hover ink (text, icons, strokes) |
| `--brand-surface` | `oklch(0.96 0.03 88)` | `oklch(0.24 0.04 88)` | Hover fill |
| `--brand-border` | `oklch(0.86 0.06 88)` | `oklch(0.42 0.09 88)` | Hover border |

Tailwind bridge: `bg-brand`, `text-brand`, `border-brand`, `bg-brand-surface`, `border-brand-border`.

**Implementation:** apply via `.hoverable` class or constants from `client/src/lib/controlTokens.ts`. Do **not** duplicate `hover:bg-brand-*` in component Tailwind.

Normative contract: [state-visuals.md](state-visuals.md) · [interaction-emphasis.md](../specs/system/interaction-emphasis.md).

---

## Accent matrix (when to use what)

| Surface | Accent | Mechanism |
| ------- | ------ | --------- |
| Explorer file/folder/section rows | Brand | `variant="explorer*"` on `InteractiveListRow` |
| Button outline / secondary / ghost | Brand | `INTERACTIVE_SURFACE` on `Button` |
| Button default (CTA) | Primary | `hover:bg-primary` mix |
| Button destructive / link | Own palette | Tailwind `hover:` variants |
| Graph map toggle (pressed) | Primary | `--interactive-toggle-*` |
| Graph map toggle (hover when active) | Primary | CSS in `index.css` |
| File node pill | Primary | `bg-primary` — graph entity, not control |
| In-graph explorer file | Primary ink | `--explorer-file-in-graph` |
| Class node resize handle (hover) | Brand | CSS in `index.css` |
| Sidebar resize handle | Brand | CSS in `index.css` |
| Token chips (trace/Ctrl) | Semantic | `--token-edge-*` — not brand |
| TokenContextBar list rows | Neutral | `hoverStyle="neutral"` on `InteractiveListRow` |
| TokenContextBar chrome buttons | Neutral | `Button variant="ghost"` — not list rows |
| Path highlight ring | Ring | `ring-ring` / `--ring` |
| Focus-visible (keyboard) | Ring / primary | `ring-ring` or `ring-primary` on buttons |

---

## Motion

| Token | Value | Use |
| ----- | ----- | --- |
| `--motion-hover-surface` | 320ms | background, border, box-shadow |
| `--motion-hover-color` | 380ms | text, icon, stroke color |
| `--ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | Standard deceleration |
| `--spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Preview edge / socket pop |

### Motion tiers (target standard)

| Tier | Duration | Examples |
| ---- | -------- | -------- |
| Micro | 120ms | Sidebar collapse warning fade |
| Surface | 320ms | `.hoverable`, buttons (target) |
| Color | 380ms | Caret rotation, icon color |
| Narrative | 450–520ms | Scroll-to-line, map flash, node fade-in |

### Known motion drift (not yet unified)

| Location | Current | Should be |
| -------- | ------- | --------- |
| `button.tsx` | `duration-300` | `var(--motion-hover-surface)` (320ms) |
| `tokens-chips.css` chip transitions | aligned | `--motion-chip-*` tokens |
| `ResizableSidebar.tsx` | `duration-200 ease-out` | `var(--ease)` + 320ms |
| `member-body-wrap` | `0.2s` | `var(--motion-hover-surface)` |

---

## Shape (border radius)

| Token / class | Value | Use |
| ------------- | ----- | --- |
| `--radius` | 0.625rem (10px) | Base scale |
| `--radius-sm` … `--radius-4xl` | Derived | Buttons, rows, cards |
| `--token-chip-radius` | 5px | Inline code chips (tight) |
| `--token-def-label-radius` | `--radius-sm` | Method/property name labels |
| `.class-node-root` | **13px** (prototype) | Graph class cards |
| Pills | `rounded-full` | File type chip, file node, anchors |

### Radius by element

| Element | Radius |
| ------- | ------ |
| Button, Input, Container | `rounded-lg` (= `--radius`) |
| Member rows, tooltips | `rounded-md` |
| TokenContextBar | `rounded-xl` |
| Empty-state hero | `rounded-2xl` |
| Class node card | 13px (named token candidate: `--radius-node`) |

---

## Shadow

| Token / utility | Use |
| --------------- | --- |
| `--node-shadow` | Class node cards, empty-state icon |
| `shadow-sm` | File node pill |
| `shadow-md` | Jump tooltip, path info banner |
| `shadow-lg` | TokenContextBar, context menu, recent folders dropdown |

Floating panels do not yet share a single shadow scale — candidate tokens: `--shadow-float-sm`, `--shadow-float-md`, `--shadow-float-lg`.

---

## Typography

| Token | Value | Use |
| ----- | ----- | --- |
| `--font-sans` | Geist Variable | All UI |
| `--font-size-xs` | 0.75rem (12px) | Explorer rows, compact controls |
| `--font-size-sm` | 0.875rem (14px) | Buttons, node headers |
| `--font-size-md` | 1rem (16px) | Body default |

Code surfaces: `font-mono`. Token chips use non-standard weights **560** / **620** in `tokens-chips.css`.

### Typography drift

Overlays use ad-hoc sizes (`text-[10px]`–`text-[11.5px]`) instead of tokens. Candidate: `--font-size-2xs: 0.625rem` for microcopy.

---

## Control sizing

| Token | Value |
| ----- | ----- |
| `--control-height-compact` | 1.375rem (22px) — explorer rows |
| `--control-height-sm` | 1.75rem (28px) |
| `--control-height-md` | 2rem (32px) — default button |
| `--control-height-lg` | 2.25rem (36px) |
| `--control-padding-x-compact/sm/md` | Horizontal padding per density |
| `--icon-size-xs/sm/md` | Icon boxes per control size |

Apply via `control-row-compact` class or Button size variants — avoid one-off `h-7` unless documented as an exception.

---

## Element compliance reference

| Area | Hover | Motion | Shape | Notes |
| ---- | ----- | ------ | ----- | ----- |
| Explorer | ★★★★★ | ★★★★☆ | ★★★★★ | Reference implementation |
| Graph chrome | ★★★☆☆ | ★★★☆☆ | ★★★★☆ | Mixed primary/brand |
| Class node | ★★★★☆ | ★★★☆☆ | ★★★☆☆ | 13px proto radius |
| Code / tokens | ★★★★★ | ★★☆☆☆ | ★★★★☆ | Semantic colors, not brand |
| Button primitives | ★★☆☆☆ | ★★★☆☆ | ★★★★★ | default=primary, others=brand |
| Floating overlays | ★★★☆☆ | ★★☆☆☆ | ★★★☆☆ | Ad-hoc typography |

---

## Exceptions (intentional — do not "fix" without design review)

| Exception | Why |
| --------- | --- |
| TokenContextBar neutral hover | Brand on semantic chips reads as warning |
| Member row transparent `.hoverable` bg | Caret-only brand emphasis |
| Language pill hex (`fileTypeChip.ts`) | TS/React/Angular brand recognition |
| Class node 13px radius | `connectors-proto.html` fidelity |
| File node primary pill | Graph entity, not sidebar control |

---

## Hardcoded colors (avoid in new work)

| Location | Colors | Status |
| -------- | ------ | ------ |
| `lib/fileTypeChip.ts` | `#3178c6`, `#61dafb`, `#dd0031`, `amber-500` | Accepted exception |
| `index.css` dark `--glint-hi` | `#ffffff` | Ctrl shimmer streak |
| Component `.tsx` files | None expected | Rule: CSS vars only |

---

## Adding new interactive UI

1. Pick accent from [accent matrix](#accent-matrix-when-to-use-what) — default is **brand**.
2. Add `INTERACTIVE_SURFACE` or `INTERACTIVE_ROW` from `controlTokens.ts`.
3. Do **not** add `hover:bg-*` Tailwind for brand surfaces.
4. JS/SVG colors: `style={{ stroke: 'var(--token-edge-function)' }}` — never hex in SVG attrs.
5. Update the owning spec's **Interaction emphasis** section.
6. If you introduce a new token, add it to `index.css` and this book.

---

## Open cleanup backlog

Priority fixes for consistency (safe to do incrementally):

1. Button `duration-300` → motion token (320ms)
2. Name prototype radii: `--radius-node: 13px` in `:root`
3. ~~Align chip transitions to motion tokens~~ (done 2026-07-11)
4. Add `--font-size-2xs` and migrate overlay microcopy
5. Wire `INTERACTIVE_BORDER_BTN` or remove the export
6. Tokenize floating shadows (`--shadow-float-*`)

Tracked spec drift: [SPEC-DRIFT.md](../specs/SPEC-DRIFT.md) (brand gold resolved 2026-07-10).

---

## Related docs

| Doc | Purpose |
| --- | ------- |
| [tokens.md](tokens.md) | Token quick reference |
| [state-visuals.md](state-visuals.md) | Hover / focus contract |
| [interaction-emphasis.md](../specs/system/interaction-emphasis.md) | Trace + brand normative rules |
| [glossary.md](../glossary.md) | "Brand accent" definition |
