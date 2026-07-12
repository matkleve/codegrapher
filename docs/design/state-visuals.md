# State visuals

**Who this is for:** anyone implementing hover, focus, selection, or disabled on shared controls.  
**Normative contract:** [interaction-emphasis.md](../specs/system/interaction-emphasis.md).  
**Full accent matrix:** [brand-book.md](brand-book.md).

---

## Interaction emphasis (summary)

codegrapher uses a **single high-attention tier** for pointer focus: **brand gold** in both light and dark themes.

| State | Ink | Surface |
| ----- | --- | ------- |
| Idle | `--muted-foreground` or inherited foreground | transparent / card |
| Hover / focus-visible | `--brand` | `--brand-surface` + `--brand-border` via `.hoverable` |
| Toggle pressed (`aria-pressed`) | theme foreground | `--interactive-toggle-*` |
| Path highlight (graph) | `--ring` | `ring-2 ring-ring` on node |

**Blocker:** Do not set child icon/label colors to `--primary` while the host uses brand hover — ink must stay consistent on the interactive root.

## Motion philosophy

Motion is classified by **what a change means**, not by which property moves. Two tiers:

| Tier | Applies to | Motion | Why |
| ---- | ---------- | ------ | --- |
| **A · Affordance** | direct `:hover` (brand lift, caret ink, chevron rotate), body-wrap hover wash | fast, one clock (`--motion-*` = 120ms) | confirms "you can act on *this*" |
| **B · Reveal / mode** | trace dim+lit, Ctrl dampen, pinned, sim step | **instant (0ms)** | it is a *reading* state; a crisp before/after beats a dissolve, and snapping means ink & fill never desync while scanning |
| **C · Ambient** | Ctrl shimmer, node breathe, wire dash | keyframe `animation` | decorative, independent of the tiers |

**Enforcement (do not re-litigate per element):** Tier B is owned by one rule in
`client/src/styles/trace-modes.css` that sets `transition-duration: 0s` on everything inside
`.react-flow__node` whenever a reveal mode class is on `.graph-pane`. So an element can keep a
Tier-A hover transition at rest and still snap during trace/Ctrl/sim automatically. **Never add
a per-element transition to animate a reveal** — it will fight the system and reintroduce the
desynced-crossfade smear this replaced. Tier C uses `animation`, which the snap rule does not touch.

## Implementation entry points

- Global: `client/src/index.css` — `.hoverable:hover`, section headers, graph controls
- JS constants: `client/src/lib/controlTokens.ts` — keep in sync with CSS
- Connector motion: `client/src/styles/preview-wires.css`, `client/src/styles/tokens-chips.css`
- Accessibility (WCAG 1.4.1 matrix for wires): [accessibility.md](accessibility.md)

## Focus-visible

Keyboard focus on enabled controls: use visible ring (`ring-ring` / `--ring`). Disabled controls: no hover chrome, reduced pointer interaction.
