# State visuals

**Who this is for:** anyone implementing hover, focus, selection, or disabled on shared controls.  
**Normative contract:** [interaction-emphasis.md](../specs/system/interaction-emphasis.md).  
**Full accent matrix:** [brand-book.md](brand-book.md).

---

## Interaction emphasis (summary)

codegrapher uses **brand gold** as the single pointer-focus accent in both light and dark themes.

| State | Ink | Surface |
| ----- | --- | ------- |
| Idle | `--muted-foreground` or inherited foreground | transparent / card |
| Hover / focus-visible | `--brand` | `--brand-surface` + `--brand-border` via `.hoverable` |
| Toggle pressed (`aria-pressed`) | theme foreground | `--interactive-toggle-*` |
| Path highlight (graph) | `--ring` | `ring-2 ring-ring` on node |

**Blocker:** Do not set child icon/label colors to `--primary` while the host uses brand hover — ink must stay consistent on the interactive root.

## Motion philosophy

Motion is classified by **what a change means**, not by which property moves. Three classes:

| Class | Applies to | Motion | Why |
| ----- | ---------- | ------ | --- |
| **Affordance** | direct `:hover` (brand lift, caret ink, chevron rotate), body-wrap hover wash | fast, one clock (`--motion-*` = 120ms) | confirms "you can act on *this*" |
| **Reveal dim** | syntax / member-row surround | **`--motion-trace` = 120ms** | same clock as chips, sockets, wires, pending dwell |
| **Reveal lite** | lit chips, sockets, wire opacity | **`--motion-trace` = 120ms** | unified with dim — no staggered importance pops |
| **Ambient** | Ctrl shimmer, node breathe, wire dash | keyframe `animation` | decorative, independent of affordance and reveal |

**Enforcement:** Trace importance changes use `--motion-trace` (120ms) on member rows,
code lines, chips, sockets, and wire opacity. Wire stroke draw stays WAAPI (~240ms).

## Implementation entry points

- Global: `client/src/index.css` — `.hoverable:hover`, section headers, graph controls
- JS constants: `client/src/lib/controlTokens.ts` — keep in sync with CSS
- Connector motion: `client/src/styles/preview-wires.css`, `client/src/styles/tokens-chips.css`
- Accessibility (WCAG 1.4.1 matrix for wires): [accessibility.md](accessibility.md)

## Focus-visible

Keyboard focus on enabled controls: use visible ring (`ring-ring` / `--ring`). Disabled controls: no hover chrome, reduced pointer interaction.
