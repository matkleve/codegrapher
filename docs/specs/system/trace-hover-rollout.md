# Trace hover — rollout tracker

**Canonical contract:** [token-hover.atlas.supplement.md](token-hover.atlas.supplement.md)  
**Timing SSOT:** `client/src/lib/traceMotion.ts`  
**Interactions:** [preview-edges.interactions.supplement.md](preview-edges.interactions.supplement.md)

When a trace-related file is next edited, update status here or document an exception.

## Status legend

| Status | Meaning |
| ------ | ------- |
| **done** | Implements contract or documented exception |
| **pending** | Not yet aligned; apply on next touch |
| **partial** | Core path done; gaps remain |

## Families

| Family | Owner / entry | Status | Notes |
| ------ | ------------- | ------ | ----- |
| Pending dim + chip strength | `pendingTraceChip.ts`, `traceMotion.ts` | **done** | `dwellColdMs` 20ms |
| Signal on all hover paths | `useTraceSession.ts`, entry hooks | **done** | import + CF `onSignal` |
| Wire stroke draw (no opacity fade) | `wireReveal.ts`, `preview-edge.css`, `wireDomCreate.ts` | **done** | strength after `revealed=1` |
| Lit commit gated by dwell | `traceLitController.ts`, `traceLitApplySession.ts` | **done** | skip apply when `pending` |
| Spec ↔ code timing sync | `traceMotion.ts`, `lint-trace-motion-sync.mjs` | **done** | CI guard |
| Wire jump hover signal | `useJumpClick.ts` | **pending** | deferred — click-only path |

## Grep hygiene

```bash
# Stale timing literals in specs (should be empty after reconcile)
rg 'FIRE_COLD_MS.*40|240ms|WAAPI|100ms/hop' docs/specs/system/

# Dual wire emission (drawing + trace-strength)
rg 'preview-edge-drawing' client/src --glob '*.ts' -l | xargs rg 'preview-edge-trace-strength'

# scheduleHoverFire without onSignal
rg 'scheduleHoverFire' client/src -l | xargs rg -L 'onSignal'

# Chip color in trace-syntax (guard should catch)
rg 'color:' client/src/styles/trace-syntax.css | rg 'token-chip'

# hover:bg-primary on graph chrome (banned)
rg 'hover:bg-primary' client/src/components/graph client/src/components/nodes client/src/components/code
```

## Changelog

- **2026-07-13** — Created tracker; atlas signal model reconciled with interactions supplement.
