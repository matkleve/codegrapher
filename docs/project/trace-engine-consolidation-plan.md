# Trace engine consolidation plan

Ordered refactor to give the hover/trace/wire **interaction runtime** a single
source of truth. Companion to the visual contract in
[`token-hover.atlas.supplement.md`](../specs/system/token-hover.atlas.supplement.md)
and [`preview-edges.trace-strength.supplement.md`](../specs/system/preview-edges.trace-strength.supplement.md);
this doc owns the **runtime/lifecycle** side those specs under-specify.

**Status:** Proposed (2026-07-14). Not started. Motivated by a run of desync bugs
(hover re-render storm, member rows re-rendering through `SimulationContext`, the
signal "just fading in" on short hover) — each was a *synchronization* failure
between the systems below, not a logic bug in any one of them.

---

## Problem — the current state is smeared across five systems

"What is the current trace?" has no owner. It lives, simultaneously, in:

| System | Holds | Where |
| ------ | ----- | ----- |
| xstate machine | committed key, pointer key, pinned traces, mood, hover edges | `traceMachine.ts` (407 lines) → `useTraceSession` |
| React context | the machine snapshot re-exposed to components | `GraphInteractionContext` (now split: actions vs trace-state) |
| **17 module globals** | propagation clock, pointer mirror, arrivals, mood mirror, fading flags, pending host | `traceWireSignal`, `wireHoverBoost`, `wireSignalArrival`, `traceSessionMood`, `traceLitFading`, `pendingTraceChip`, `memberDefAnchor` |
| 8 pub/sub channels | change notifications for the imperative layer | `subscribeTraceStrength`, `subscribeWireArrival`, `subscribeTraceSignalPrime`, `subscribeTraceSessionMood`, `subscribeTraceLitFading`, `subscribeWireTicks`, `subscribeRegistry`, `subscribeTracePending` |
| DOM | the actually-painted lit/strength state | `traceLitApply{,Dom,Host,Session,Wire}`, `wireDomSync`, `wireReveal` |

They are kept in step by hand: `syncWireMirror`, `primeTraceSignal`,
`keepWireSignalAlive`, `setWireHoveredTokenKey`, `setTraceSessionMood`, … Every
manual mirror is a place two systems can disagree — and empirically that is
exactly where the bugs have been.

Scale for context: **~67 non-test files / ~8,500 lines** implement this one
feature; **~21** carry `traceLit*` / `signal` / `wire*` names that overlap
semantically (signal / arrival / prime / epoch / boost / mood / lit / strength).

### Non-problems (leave alone)

- `traceMachine.ts` — the xstate machine is a *fine* owner for the discrete
  gesture state (enter/dwell/commit/leave/pin). Keep it. The goal is to stop
  *mirroring* it into globals, not to replace it.
- The **DOM-imperative paint** (`traceLitApply*`, `wireReveal`) — this is the
  right performance call. Keep it. It should read from **one** engine, not seven
  globals.
- `elementRegistry`, `wireFanLayout` counter, `registerVscodeIcons`,
  `recentFiles` — unrelated module state; out of scope.

---

## Goal / non-goals

**Goal:** one framework-agnostic `TraceEngine` object that owns the imperative
runtime state, exposes a small documented API, and publishes changes through
**one** subscription. React reads it via `useSyncExternalStore` with selectors;
the DOM-paint layer reads it directly. The xstate machine drives it.

**Non-goals:** no visual change, no new features, no rewrite of the machine or
the paint layer, no change to the strength curves. This is a *plumbing*
consolidation — the render output must be byte-identical.

---

## Target architecture

```
                    ┌────────────────────────────┐
  gesture events →  │  traceMachine (xstate)      │  discrete state (unchanged)
                    └──────────────┬─────────────┘
                                   │ single writer
                                   ▼
                    ┌────────────────────────────┐
                    │        TraceEngine           │  one mutable store:
                    │  (traceEngine.ts)            │   core key, pointer key,
                    │  getSnapshot() / subscribe() │   emitting+epoch+keepAlive,
                    │  + typed mutators            │   arrivals, mood, fading,
                    └───────┬───────────────┬─────┘   pending host, edge ids
                            │               │
             useSyncExternalStore      direct read (rAF)
                            │               │
                     React (selectors)   DOM paint (traceLitApply*, wireReveal)
```

- **One store, one `subscribe`.** Replace the 6 trace-related channels with
  `traceEngine.subscribe(listener)` + selector helpers. (`subscribeRegistry`
  stays — different concern.)
- **Typed mutators, no free-floating setters.** `engine.beginSignal(...)`,
  `engine.setPointer(key)`, `engine.setArrival(key, depth, progress)`,
  `engine.keepAlive(ms)`, `engine.reset()`. The current `setWireHoveredTokenKey`
  / `startWireSignalEpoch` / `armSourceArrival` become methods.
- **Selectors for React** so a component only re-renders when *its* slice
  changes — via `useSyncExternalStore(subscribe, () => selector(snapshot))`.
  (This is the same pattern the leaf anchor optimization already wants.)
- **The machine is the single writer.** `useTraceSession` translates machine
  transitions into engine mutations in one place — no component pokes the engine.

### State → engine slice mapping

| Current global(s) | Engine slice | Notes |
| ----------------- | ------------ | ----- |
| `traceWireSignal`: `epochMs`, `emitting`, `keepAliveUntilMs` | `signal: { epoch, emitting, keepAliveUntil }` | `isEmitting()` derived |
| `wireHoverBoost`: `hoveredTokenKey`, `hoveredWireEdgeId`, `traceSessionActive`, `hoverPreviewEdgeIds` | `pointer: { tokenKey, wireEdgeId, sessionActive, hoverEdgeIds }` | powers `isWireEmphasized` |
| `wireSignalArrival`: `arrivals` map | `arrivals: Map<key,{progress,depth}>` | propagation progress |
| `traceSessionMood`: `sessionMood`, `domFading` | `mood`, `domFading` | mirror of machine value — could be a pure selector off the machine and dropped entirely |
| `traceLitFading`: fading flag | `litFading` | |
| `pendingTraceChip` / `memberDefAnchor` | `anchor: { pendingHost, host, preferenceLocked }` | |
| `traceSignalPrime` pub/sub | one-shot event on `subscribe` | fold into the single channel |

---

## File layout (before → after)

```
before                              after
lib/traceWireSignal.ts        ┐
lib/wireHoverBoost.ts         │
lib/wireSignalArrival.ts      ├──►  lib/trace/traceEngine.ts        (the store + API)
lib/traceSessionMood.ts       │     lib/trace/traceEngineSelectors.ts (React/DOM read helpers)
lib/traceLitFading.ts         │     lib/trace/useTraceEngine.ts     (useSyncExternalStore hooks)
lib/traceSignalPrime.ts       ┘
lib/pendingTraceChip.ts  ──────────► folded into traceEngine (anchor slice)
lib/memberDefAnchor.ts   ──────────► folded into traceEngine (anchor slice)
```

`wireHoverBoost`'s *pure* predicates (`isWireEmphasized`, `traceKeysFromWire`,
`mergePreviewEdgesByStrength`) move to a `wireEmphasis.ts` — they are functions,
not state, and shouldn't sit next to the store.

> The **200-line cap should be relaxed to ~350 for `traceEngine.ts`** (add an
> override in `eslint.shared.mjs` or an inline disable with a comment). One
> cohesive store beats five files you have to cross-reference — see the
> "cap backfired" note in the review. This is a deliberate, documented exception.

---

## Migration — ordered, each PR ships green

1. **Introduce `traceEngine.ts` as a façade over today's globals.** Its methods
   delegate to the existing `setWireHoveredTokenKey` etc. No behavior change;
   just a new front door. Add `traceEngine.subscribe` that fans the existing
   channels into one. **Ship.**
2. **Move the state *into* the engine, one slice at a time** (signal → pointer →
   arrivals → mood → fading → anchor). After each slice, delete the old module
   and repoint imports. Each slice is independently green + testable. **Ship per
   slice.**
3. **Add `useTraceEngine(selector)`** (`useSyncExternalStore`) and migrate the
   leaf anchors (`LineTargetAnchor`, `MemberTargetAnchor`, `ClassTargetAnchors`)
   off the volatile context onto per-handle engine selectors — so an anchor
   re-renders only when *its* handle flips (finishes the perf work started this
   session). **Ship.**
4. **Collapse `traceSessionMood` into a machine selector** if it proves to be a
   pure mirror (likely). Drop the module. **Ship.**
5. **Write the runtime-lifecycle spec** (`docs/specs/system/trace-runtime.md`):
   states, events, the signal clock (epoch / emit window / `keepAlive` / drain /
   `wireCascadeDurationMs`), and the React↔DOM boundary. Register it in
   `docs/specs/README.md` + governance matrix. **Ship.**

Rollback is per-slice: each PR is a mechanical move guarded by tests.

---

## Testing — close the integration gap

There are **zero** interaction-level tests today ("verified manually via
browser"). The bugs this session would each have been caught by a cheap
assertion. Promote the throwaway Playwright probes into a permanent suite:

| Test | Asserts | Catches |
| ---- | ------- | ------- |
| render-count on hover | one hover in→out cycle = **0** `CodeLine`/`ClassNode` re-renders | the re-render storm regressing |
| cascade schedule | hop reveal delays are `0, 120, 240…` (sequential) | stagger collapsing to all-at-once |
| short-hover completion | 40ms hover → every hop reaches `revealed` | signal truncation |
| strength falloff | wire `--trace-strength` strictly decreases by hop; hover > focus | curve regressions vs the spec table |

Engine-level unit tests (pure, no DOM): signal lifecycle (emit → keepAlive →
reset), arrival monotonicity, selector identity stability.

---

## Risks & guardrails

- **Behavior drift.** Mitigate with the render-output invariant: the paint layer
  must produce identical DOM. Land step 1 (façade only) first to prove the seam.
- **Perf regression from `useSyncExternalStore` selectors.** Keep selectors
  returning primitives/stable refs so `Object.is` bailout holds; measure with the
  render-count test before/after.
- **Scope creep into the machine or paint layer.** Explicitly out of scope; if a
  slice "needs" a machine change, stop and split it out.

---

## Acceptance criteria

- [ ] One `traceEngine` owns the runtime state; the 6 trace pub/sub channels are
  gone (folded into `traceEngine.subscribe`).
- [ ] No component imports a `set*`/`get*` trace global directly; the machine is
  the single writer.
- [ ] Leaf anchors re-render only when their own handle's active state changes
  (per-handle selector), verified by a render-count test.
- [ ] `trace-runtime.md` spec exists and is governance-registered.
- [ ] Integration suite (render-count, cascade, short-hover, falloff) runs in CI
  and is green.
- [ ] Visual output unchanged — the four integration probes match pre-refactor
  baselines.

## References

- Visual contract: [`token-hover.atlas.supplement.md`](../specs/system/token-hover.atlas.supplement.md)
- Strength: [`preview-edges.trace-strength.supplement.md`](../specs/system/preview-edges.trace-strength.supplement.md)
- Prior refactor (strength curves): [`trace-strength-refactor-plan.md`](trace-strength-refactor-plan.md)
- Restructure backlog: [`restructure-plan.md`](restructure-plan.md)
