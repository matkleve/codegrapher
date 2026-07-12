# Interaction emphasis — implementation supplement

Parent: [interaction-emphasis.md](interaction-emphasis.md). **Agents:** implement presentation here + atlas [token-hover.atlas.supplement.md](token-hover.atlas.supplement.md) — not `trace-syntax.css` chip overrides.

## CSS ownership (normative)

| Owns | Files | MUST NOT |
| ---- | ----- | -------- |
| Syntax + chrome dim | `trace-syntax.css` | Set `color` on `.token-chip`, `.token-def-label.cursor-pointer` |
| Chip ink / fill / pending | `tokens-chips-base.css`, `tokens-chips-trace.css` | `--faint` on indexed chips during trace |
| Lit strength | `trace-chip-lit.css`, `traceLitApply.ts` | Element `opacity` for distance |
| Member row wash | `trace-member.css` | Brand gold on rows |
| Ctrl explore | `trace-ctrl.css` | Replace trace faint on syntax when Ctrl held |

## Imperative DOM classes

`trace-member-lit` · `trace-member-owner-lit` · `trace-lit-line` · `token-chip-lit` · `token-chip-on` · `token-chip-source` · `token-chip-hover-preview` · `token-chip-pending-trace`

Pane moods on `.graph-pane`: `graph-ctrl-preview` · `graph-trace-pending` · `graph-trace-active` · `graph-trace-pinned` · `graph-trace-warm`

## Member container & signature fills

| # | Mode | Member row | Signature pills | Body code | Chips in row |
| --- | ---- | ---------- | ----------------- | --------- | ------------ |
| 1 | Idle | `bg-muted` | `--member-sig-bg-in` / neutral | transparent | semantic ink |
| 2 | Header hover | brand surface | unchanged | muted code wash | unchanged |
| 3 | Title trace | trace-lit row bg | unchanged | — | semantic + fill |
| 4 | Ctrl | dim surface | dim pills; indexed types semantic | `--faint-ctrl` | shimmer |
| 5 | Trace, row not lit | dim surface | non-chip sig → faint | `--faint-*` syntax | **indexed: resting ink** |
| 6 | Trace, row lit | trace-lit bg | transparent pills; lit chips on | `trace-lit-line` | lit + on |
| 8 | Pinned | per merged lit | pin source semantic | — | `token-chip-source` |

**Cascade:** function endpoint → `trace-member-lit` on whole body ([token-interactions.md](token-interactions.md)).

**Regression:** rows rest `bg-muted` — never `--primary` mix. Chips never brand gold. Primitives (`string`, `void`) not chips. Comments + non-chip sig text MUST dim under trace.

## File map

| File | Purpose |
| ---- | ------- |
| `index.css` | `.hoverable` |
| `controlTokens.ts` | Tailwind bundles — sync with CSS |
| `tokens-chips.css` | Barrel |
| `trace-syntax.css` | Surround dim only |
| `trace-modes.css` | Barrel |
| `pendingTraceChip.ts` | Pending host + `graph-trace-pending` |
| `hoverIntent.ts` | Dwell / leave grace |
| `useTokenTraceState.ts` | Hover / pin state |
| `useTraceLitState.ts` | Lit apply hook |
| `traceLitController.ts` | DOM lit writer |
| `traceLitApply.ts` | `--trace-strength` emission |
| `wireHoverBoost.ts` | Pointer emphasis for wires |
| `PreviewEdgeOverlay` | Wire draw |
