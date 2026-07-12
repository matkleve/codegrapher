# Accessibility

**Who this is for:** anyone adding visual semantics (wires, chips, states) or reviewing whether the graph is legible without color alone.  
**Normative hooks:** [connection-taxonomy.md](../specs/system/connection-taxonomy.md), [interaction-emphasis.md](../specs/system/interaction-emphasis.md), [tokens.md](tokens.md).

---

## WCAG anchors

codegrapher targets **WCAG 2.2 Level AA** for the product surfaces we control. The criteria below govern how we encode meaning in the graph UI.

| Criterion | Level | What it requires here |
| --------- | ----- | --------------------- |
| **[1.4.1 Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)** | A | **Color is never the only cue** for connection kind, token role, trace strength, or error/required state. Pair hue with line geometry, dash pattern, arrowhead shape, motion, and/or text labels. |
| **[1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)** | AA | Body text and UI labels ≥ 4.5:1; large text ≥ 3:1 against their background. |
| **[1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)** | AA | Wires, focus rings, and interactive control boundaries ≥ **3:1** against adjacent canvas/card fill. |
| **[2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)** | AA | Keyboard focus on token chips and legend toggles uses a visible ring (`--ring`), not color alone. |

Techniques we rely on (W3C): **G111** (color + pattern), **G182/G183** (redundant visual cues on links/controls), **G205** (text cue alongside color).

---

## Design rule: redundant encoding

Every **connection kind** MUST be identifiable with **at least two** independent signals:

1. **Text label** — `ConnectionLegend` lists every kind by name (`CONNECTION_KIND_LABEL`); toggles use `aria-pressed`.
2. **Line geometry** — cubic curve vs orthogonal bus vs rounded Manhattan.
3. **Dash / dot pattern** — dashed, dotted, dash-dot (see `preview-wires.css`).
4. **Arrowhead** — open chevron (usage), bar cap (binding), bracket caps (typesetting), filled triangle (control flow), hollow triangle (inheritance/implementation), filled diamond (composition).
5. **Motion** — forward dash march (usage/binding/typesetting/control flow), junction pulse (control-flow fork).
6. **Hue** — secondary; reinforces but does not carry meaning alone.

Trace **strength** uses **graph-distance opacity decay** (`tracePathOpacity` in `traceDepth.ts`, inline on wires and chips) **in addition to** kind encoding — never opacity alone across kinds.

---

## Connection kind matrix (colorblind-safe)

Audit baseline: ~8% of men have some form of colour-vision deficiency (deuteranopia most common). Pairs that share a hue family MUST differ on geometry and/or dash.

| Kind | Hue token | Non-color cues | Colorblind notes |
| ---- | --------- | -------------- | ---------------- |
| **Usage** | `--edge-usage` (function blue) | Cubic curve; long dash `10 4`; **open chevron** arrow; forward dash flow | Distinct from teal/cyan family |
| **Binding** | `--edge-binding` (cyan **188°**) | Cubic curve; **tight dot** `2 4`; **bar cap** at binding end; forward dash flow (initializer → binding) | Hue shifted away from typesetting; dots + bar vs brackets |
| **Typesetting** | `--edge-typesetting` (= `--token-edge-type`, teal **200°**) | **Rounded orthogonal** Manhattan; dash-dot `5 3 1 3`; **bracket caps** (no arrow); forward dash flow | Corners visible at 6px fillet; shape ≠ cubic binding |
| **Control flow** | `--edge-control-flow` (green **145°**) | **Sharp orthogonal** gutter bus; dash-dot `7 3 2 3`; **filled triangle** arrow; **junction disc** at bus fork | Green channel + L-path + fork node in legend |
| **Transitive** | `--edge-usage` + hop opacity | Same cubic/dash as Usage; visibly faded | Hop decay, not a separate kind |
| **Inheritance** | `--edge-inheritance` (purple) | **Solid** line; **hollow triangle** | Structural; persistent |
| **Implementation** | `--edge-implementation` (mint) | **Dotted** line; hollow triangle | Dotted vs solid inheritance |
| **Composition** | `--edge-composition` (warm) | **Solid** line; **filled diamond** | Only kind with diamond |
| **Module import** | `--edge-import` (muted) | Thin dotted; toggle-gated | Off by default |

**Known adjacency:** Binding (188° cyan) and Typesetting (200° teal) are deliberately separated in hue *and* in geometry (cubic+dotted vs orthogonal+dash-dot). If user testing still confuses them, widen hue gap before changing dash grammar.

---

## Legend & programmatic access

- Every kind appears in **ConnectionLegend** with a **text name** — not color swatches alone.
- Kinds with non-linear routing (**Typesetting**, **Control flow**) use **polyline legend swatches** (`legendPathD` in `connectionWireStyle.ts`) so shape is previewed before hover.
- Legend rows are `aria-pressed` toggles — state is exposed to assistive tech without relying on swatch color.

---

## Token chips & trace modes

- Indexed token **role** is encoded as chip surface (`--token-surface-{kind}`) **and** optional def/usage label pills — not hue alone.
- Trace dim (`--faint*`) reduces non-lit ink; lit endpoints use `token-chip-lit` + border/socket weight — redundant with opacity.
- Ctrl shimmer is **ambient motion** ([state-visuals.md](state-visuals.md)), not a sole indicator of interactivity — chips also use cursor and hover fill.

---

## When adding a new visual semantic

Checklist (must pass before merge):

1. **1.4.1** — Is there a non-color cue (pattern, shape, label, icon, motion)?
2. **1.4.11** — Does the graphic meet 3:1 against `--card` / `--background` in both themes?
3. **Legend** — Is there a named toggle or tooltip path if the cue is graph-only?
4. **Docs** — Update this matrix and [connection-taxonomy.md](../specs/system/connection-taxonomy.md) if a connection kind changes.

---

## References

- W3C WCAG 2.2: [Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), [Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- Connection implementation: `client/src/lib/connectionWireStyle.ts`, `client/src/lib/wirePaths.ts`, `client/src/styles/preview-wires.css`
- Interaction contract: [interaction-emphasis.md](../specs/system/interaction-emphasis.md)
