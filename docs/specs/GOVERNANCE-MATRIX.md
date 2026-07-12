# Master Ownership Matrix

Last updated: 2026-07-12

## Scope matrix

| Scope | Owns | Spec folder |
| ----- | ---- | ----------- |
| `client/src/components/graph/` | Canvas, overlay, pinch zoom, path highlight | `component/`, `system/` |
| `client/src/components/nodes/` | Class/file nodes, member rows, resize | `component/` |
| `client/src/components/code/` | Token chips, source lines, context bar | `component/`, `system/` |
| `client/src/components/explorer/` | File tree, recent files/folders | `component/`, `page/` |
| `client/src/components/simulation/` | Sim panel, gutter, ledger, transport | `system/` |
| `client/src/components/ui/` | Cross-domain primitives (button, Container, …) | `design/` |
| `client/src/hooks/` | Shared UI hooks (≥2 domains) | `system/` |
| `client/src/context/` | Graph interaction, index, Ctrl key | `system/` |
| `client/src/lib/` | Anchors, hover intent, layout, merge | `system/`, `service/` |
| `server/src/` | Parser, symbol index, HTTP API | `service/` |
| `client/src/App.tsx` | Shell layout, providers | `page/` |

## Layer rules

- **System specs** define cross-surface behavior (preview timing, ego-graph rules). They MUST NOT duplicate component geometry owned by `component/` specs.
- **Component specs** own FSM, hierarchy, and local visual contracts.
- **Service specs** own parser output and API shapes; UI specs reference them, not vice versa.
- **Page specs** own composition and which API calls happen on which user gestures.

## When to add a new spec

| Situation | Action |
| --------- | ------ |
| New interactive component | Add `docs/specs/component/<name>.md` |
| Behavior spans overlay + context + CSS | Extend `system/` spec; link from component |
| Parser/index change | Update `service/parser-index.md` + affected system spec |
| Parent spec > 150 lines | Split to `*.supplement.md` or `*.acceptance-criteria.md` |

## Traceability

Implementation MUST match specs. If code diverges, either fix code or update spec in the same change — never leave silent drift. Unresolved mismatches are listed in [SPEC-DRIFT.md](SPEC-DRIFT.md).
