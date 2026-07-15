# Interaction emphasis

## What It Is

Cross-app contract for pointer hover: **brand gold** on app chrome (`.hoverable`). **Indexed token chips** keep semantic ink — emphasis **only increases** (fill, `--trace-strength`, wires, row wash), never `--faint` then relight. Trace dims **surroundings** only; chips stay navigable unless on the lit path.

**Start here for hover:** [token-hover.atlas.supplement.md](token-hover.atlas.supplement.md)

## What It Looks Like

Idle: muted/card foreground. `.hoverable` → brand ink + surface. Trace: syntax/chrome → `--faint-*` / `--trace-dim-surface`; indexed chips → resting ink; lit path → fill, row wash, sockets, wires. Pin persists; foreign hover → ephemeral preview.

## Emphasis model (normative)

| Axis | Trigger | Effect |
| ---- | ------- | ------ |
| **Explore** | Ctrl | `--faint-ctrl` syntax + chip shimmer |
| **Trace** | Dwell on chip | Surround dims; path elevates |

| Phase | Surround | Indexed chip ink | Lit path |
| ----- | -------- | ---------------- | -------- |
| Idle | normal | resting `--token-edge-*` | — |
| Pending | dim | **unchanged** | focal: pending `--trace-strength` |
| Active | dim | resting off-path | lit + fill + wires |
| Pin | per merged lit | pin locked | `token-chip-source` |

**Invariants:** (1) chip emphasis only goes **up**; (2) dwell gates **commit**, not ink; (3) `trace-syntax.css` dims syntax/chrome **only** — never `.token-chip` / `.cursor-pointer` def labels. Detail: [implementation supplement](interaction-emphasis.implementation.supplement.md).

## Where It Lives

- **CSS:** `index.css`, `trace-modes.css`, `tokens-chips.css` — ownership table in [implementation supplement](interaction-emphasis.implementation.supplement.md)
- **JS:** `controlTokens.ts`, `pendingTraceChip.ts`, `traceLitApply.ts`
- **Pane classes:** `graph-ctrl-preview`, `graph-trace-pending`, `graph-trace-active`, `graph-trace-pinned`, `graph-trace-warm`

## Actions

| # | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1 | Hovers `.hoverable` | Brand surface + ink | CSS `:hover` |
| 2 | Hovers explorer row | `variant="explorer*"` | `InteractiveListRow` |
| 3 | Ctrl on graph | Dim syntax; shimmer chips | `graph-ctrl-preview` |
| 3b | Pointer on chip (pre-dwell) | Surround dim; focal pending strength | `graph-trace-pending` |
| 4 | Active trace | Lit path elevated | `graph-trace-active` |
| 5 | Pinned trace | Pin lit; foreign preview on dwell | `graph-trace-pinned` |
| 6 | Member header hover | Brand bg on `:hover` only | `.member-row-header.hoverable` |

Gesture vocabulary: [token-interactions.md](token-interactions.md). Timing: [preview-edges.interactions.supplement.md](preview-edges.interactions.supplement.md).

## Trace vs brand (normative)

| Surface | Off path | Lit endpoint |
| ------- | -------- | ------------ |
| Indexed chip text | resting `--token-edge-*` | `--trace-strength` focus curve |
| Plain syntax / comments | `--faint-*` | muted on `trace-lit-line` |
| Chip background | transparent / idle hover | `token-chip-on` fill |
| Member row | `--trace-dim-surface` | `trace-member-lit` blue wash |
| Node header | card white | card white |
| Socket | hidden | semantic ring |

Ctrl: shimmer wins on chips; `--faint-ctrl` wins syntax over trace faint.

## Chip hover preview

`token-chip-hover-preview` → hover curve on `--trace-strength` (chip + touched wires). Session focus curve holds when pointer leaves card. `graph-trace-warm` shortens socket transition after first dwell.

Strength math: [preview-edges.trace-strength.supplement.md](preview-edges.trace-strength.supplement.md).

## Motion

Importance changes: **`--motion-trace` (120ms)**. Wire stroke draw: `wireRevealMs` RAF in `wireReveal.ts` (see `traceMotion.ts`). Ctrl shimmer / node breathe: `animation`.

## Component Hierarchy

```text
index.css (.hoverable) → controlTokens.ts
tokens-chips.css · trace-modes.css · preview-wires.css
GraphPane (mood classes) → useTraceLitState → traceLitController
```

## Acceptance Criteria

See [interaction-emphasis.acceptance-criteria.md](interaction-emphasis.acceptance-criteria.md).

- [ ] All items in the linked acceptance-criteria file pass on `fixtures/demo`

## References

- Atlas: [token-hover.atlas.supplement.md](token-hover.atlas.supplement.md)
- Implementation: [interaction-emphasis.implementation.supplement.md](interaction-emphasis.implementation.supplement.md)
- Preview trace: [preview-edges.interactions.supplement.md](preview-edges.interactions.supplement.md)
- Refactor: [trace-strength-refactor-plan.md](../../project/trace-strength-refactor-plan.md) PR 10
- Design: [state-visuals.md](../../design/state-visuals.md) · [tokens.md](../../design/tokens.md)
