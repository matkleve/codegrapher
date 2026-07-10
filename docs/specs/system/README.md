# System Specs

Cross-cutting orchestration and multi-surface behavior. System specs reference component/service specs but MUST NOT duplicate local ownership detail.

## Contracts

- [ego-graph-model](ego-graph-model.md) — incremental graph philosophy and loading semantics
- [preview-edges](preview-edges.md) — token hover, Ctrl reveal, pinning, timing
- [preview-edges.interactions.supplement](preview-edges.interactions.supplement.md) — **mermaid:** state machine, anchors, pin lock, live retarget
- [interaction-emphasis](interaction-emphasis.md) — brand gold hover + trace dim modes
- [token-interactions](token-interactions.md) — keyword gesture vocabulary (hover, Ctrl reveal, pin, jump, load) + use-case map

## Rules

- Preview connections are **on-demand only** — never a persistent edge layer.
- Edge direction is always **definition → usage**.
- Preview rendering is **overlay-only** (`PreviewEdgeOverlay`), not React Flow edges.
