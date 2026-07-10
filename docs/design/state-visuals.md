# State visuals

**Who this is for:** anyone implementing hover, focus, selection, or disabled on shared controls.  
**Normative contract:** [interaction-emphasis.md](../specs/system/interaction-emphasis.md).

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

## Implementation entry points

- Global: `client/src/index.css` — `.hoverable:hover`, section headers, graph controls
- JS constants: `client/src/lib/controlTokens.ts` — keep in sync with CSS
- Connector motion: `client/src/styles/connectors.css`

## Focus-visible

Keyboard focus on enabled controls: use visible ring (`ring-ring` / `--ring`). Disabled controls: no hover chrome, reduced pointer interaction.
