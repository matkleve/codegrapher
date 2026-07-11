# Execution simulator (static walk)

## What It Is

**Design spec — not yet implemented.** Opt-in step-through mode that walks a method body statement-by-statement, showing which variables are in scope, how values change, and how data flows along existing preview-edge paths. MVP uses **Option A: static walk** (AST traversal, no real code execution). Options B (sandboxed `vm`) and C (DAP debugger attach) are documented as deferred — see [Engine options supplement](execution-simulator.engine-options.supplement.md).

## What It Looks Like

User right-clicks a line in an expanded method → **Start trace here**. A pre-flight panel collects parameter/local initial values. Playback toolbar appears (step forward/back, play/pause, speed, scrub bar). Current line highlights; variable table in a right-side panel updates each step. Value pulses travel along preview-edge wires on argument/return steps. Mode chrome is visually distinct from calm-default hover trace (dedicated toolbar border, `graph-sim-active` on root).

## Where It Lives

- **Entry:** context menu on `CodeLine` and collapsed `CollapsibleMemberRow` header
- **Orchestration:** new `SimulationContext` (or extension of `GraphInteractionContext` — implementation TBD)
- **UI:** `SimulationPanel` (right rail), `SimulationToolbar` (bottom of graph pane), reuse `PreviewEdgeOverlay` for value-flow pulses
- **Engine:** `client/src/lib/staticWalk/` (new) — statement list + scope snapshots from method `code` string

## Actions

| # | User Action | System Response |
| --- | ----------- | --------------- |
| 1 | Right-click line → **Start trace here** | Open pre-flight inputs for vars in scope at that line; set start anchor |
| 2 | Right-click line → **Set as end point** | Set end anchor (default: method close brace if unset) |
| 3 | Right-click → **Run start → end** | Pre-flight if needed, then enter sim mode at start line |
| 4 | **Step forward** | Advance one statement; update variable panel + line highlight |
| 5 | **Step back** | Rewind one statement from recorded history (no re-execution) |
| 6 | **Play / pause** | Auto-advance at selected speed (0.5× / 1× / 2× / 4×) |
| 7 | Scrub bar drag | Jump to step index in recorded history |
| 8 | **Step into** call | Descend into callee body if on canvas; else pause + Load prompt |
| 9 | **Step over** call | Treat call as one step; show return placeholder if static |
| 10 | **Exit simulation** (Esc / toolbar X) | Return to calm-default; clear sim state; preview hover works again |

## Component Hierarchy

```text
App
└── GraphFlowInner
    ├── GraphInteractionProvider (existing trace)
    ├── [SimulationProvider] (new)
    ├── GraphFlowCanvas
    │   ├── PreviewEdgeOverlay (+ value-flow pulse layer)
    │   ├── TokenContextBar (existing — hidden or dimmed during sim)
    │   └── SimulationToolbar (new, bottom)
    └── SimulationPanel (new, right rail — variables + call stack)
```

## Data

| Concept | Shape |
| ------- | ----- |
| `SimSession` | `{ startLine, endLine?, steps: SimStep[], currentIndex, inputs: Record<name, string> }` |
| `SimStep` | `{ lineNumber, statementKind, scopeSnapshot: Map<name, SimValue>, edgePulse?: EdgePulseSpec }` |
| `SimValue` | `{ display: string, kind: 'literal' \| 'unevaluated' \| 'unknown' }` |
| Static walk scope | Params + locals declared above current line + `this.*` properties with known initializers |

Off-graph callee policy: **pause and prompt** — offer Load via existing `useLoadTargetAction`; no auto-load on step-into.

## State

| State | Default | Effect |
| ----- | ------- | ------ |
| `simActive` | false | When true, hover preview traces suppressed; sim chrome visible |
| `simSession` | null | Current walk state |
| `playbackSpeed` | 1 | Multiplier for play mode |
| `panelOpen` | true when sim starts | Right variable panel visibility |

## File Map

| File | Purpose |
| ---- | ------- |
| `client/src/lib/staticWalk/buildStepList.ts` | Parse method body → ordered statements |
| `client/src/lib/staticWalk/scopeAtStep.ts` | Scope snapshot per step index |
| `client/src/context/SimulationContext.tsx` | Session + playback orchestration |
| `client/src/components/simulation/SimulationPanel.tsx` | Variable table + call stack |
| `client/src/components/simulation/SimulationToolbar.tsx` | Transport controls |
| `docs/specs/system/execution-simulator.engine-options.supplement.md` | Options B/C trade-offs |

## Acceptance Criteria (Option A — static walk only)

- [ ] Right-click **Start trace here** on an expanded method line opens pre-flight form for in-scope variables at that line
- [ ] Step forward advances exactly one statement; current line visually highlighted
- [ ] Step back rewinds without re-running forward pass (history is an array)
- [ ] Play/pause auto-advances at configurable speed; scrub bar jumps to any prior step
- [ ] Variable panel lists name → display value; changed names visually marked per step
- [ ] Step-into on call to on-canvas method moves highlight into callee; step-over skips callee body
- [ ] Step-into on off-canvas callee pauses with Load prompt (no silent skip)
- [ ] Argument/return steps trigger a visible pulse along the matching preview-edge path
- [ ] Esc or Exit clears sim mode; plain hover trace works again
- [ ] `graph-sim-active` distinguishes sim from `graph-trace-pinned` / `graph-ctrl-preview`
- [ ] Loops: play mode stops after **100 iterations** per loop body with "cap reached" notice
- [ ] `await` / async calls: step shows `await …` as unevaluated; does not hang play mode

## Open questions

- Right rail vs bottom drawer for variable panel on narrow viewports?
- Should sim panel replace `TokenContextBar` or coexist (spec: coexist — bar hidden while sim active)?

## Child specs

- Engine options B/C: [execution-simulator.engine-options.supplement.md](execution-simulator.engine-options.supplement.md)

## References

- Connection kinds (value-flow pulses): [connection-taxonomy.md](connection-taxonomy.md)
- Preview edge overlay: [../component/preview-edge-overlay.md](../component/preview-edge-overlay.md)
- Ego-graph load semantics: [ego-graph-model.md](ego-graph-model.md)
