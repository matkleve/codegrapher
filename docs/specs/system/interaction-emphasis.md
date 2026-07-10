# Interaction emphasis

## What It Is

Cross-app contract for pointer hover on clickable surfaces: **brand gold** in both themes, shared between CSS and `controlTokens.ts`. Preview-trace mode adds dim/lit rules that override pass-over hover on non-lit tokens.

## What It Looks Like

Idle controls use muted or card foreground. Hover adds gold ink, gold-tinted surface, and gold border via `.hoverable`. During **trace**, dim indexed tokens stay `--faint` on pass-over; only **lit** endpoints get semantic color + socket glow. Pinned trace blocks foreign token hover entirely.

## Where It Lives

- **CSS:** `client/src/index.css` (`.hoverable`), `connectors.css` (trace modes)
- **JS:** `client/src/lib/controlTokens.ts`
- **Canvas classes:** `graph-ctrl-preview`, `graph-trace-active`, `graph-trace-pinned`

## Emphasis stack

```mermaid
flowchart TB
  Base[Resting UI] --> Hover[.hoverable brand hover]
  Base --> Ctrl[graph-ctrl-preview shimmer on indexed tokens]
  Base --> Trace[graph-trace-active dim + lit endpoints]
  Trace --> Pin[graph-trace-pinned lock foreign hover]
  Hover -.->|suppressed on dim tokens during trace| Trace
```

## Actions

| # | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1 | Hovers `.hoverable` control | Brand surface + border + ink | CSS `:hover` |
| 2 | Hovers explorer row | `INTERACTIVE_ROW` | class on row |
| 3 | Ctrl held on graph | Shimmer on indexed chips | `graph-ctrl-preview` |
| 4 | Active trace | Dim non-lit; lit = semantic color | `graph-trace-active` |
| 5 | Pinned trace | Foreign tokens: no brand pass-over | `graph-trace-pinned` |
| 6 | Member row header hover | Brand bg **hover only** (not `aria-expanded`) | `INTERACTIVE_SURFACE` |

## Trace vs brand (normative)

| Surface | Trace active, not lit | Trace lit endpoint | Pinned + foreign token |
| ------- | --------------------- | ------------------ | ---------------------- |
| Token chip text | `--faint` | semantic `--token-edge-*` | `--faint`, no hover lift |
| Token background | transparent | `token-chip-on` tint, **no inset border** | transparent |
| Node card header | card white | card white | card white |
| Member row (lit) | subtle function tint | `trace-member-lit` | per trace lit set |
| FlowAnchor socket | hidden | soft glow `currentColor` | hidden unless endpoint |

Ctrl + trace: trace wins — no shimmer on tokens (`connectors.css`).

## Component Hierarchy

```text
index.css (.hoverable)
├── controlTokens.ts
├── connectors.css (trace / ctrl / pinned)
└── GraphFlowCanvas (mode classes)
```

## File Map

| File | Purpose |
| ---- | ------- |
| `index.css` | Global `.hoverable`; header no trace tint |
| `controlTokens.ts` | Tailwind bundles — sync with CSS |
| `connectors.css` | Dim, lit, sockets, pinned lock |

## Acceptance Criteria

- [ ] New clickables use `.hoverable` or `controlTokens` — not `hover:bg-primary`
- [ ] JS/SVG colors via CSS variables in `style`
- [ ] Trace dim is color-only — no container opacity / bg wash on code
- [ ] Pinned trace: non-lit tokens do not show brand hover
- [ ] Brand hover on member header is `:hover` only, not expanded state
- [ ] `controlTokens.ts` and `index.css` stay in sync

## References

- Preview trace: [preview-edges.interactions.supplement.md](preview-edges.interactions.supplement.md)
- Design: [docs/design/state-visuals.md](../../design/state-visuals.md)
- Tokens: [docs/design/tokens.md](../../design/tokens.md)
