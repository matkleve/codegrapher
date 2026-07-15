# Trace runtime — interaction model, function catalog & quality audit

Runtime/lifecycle contract for the hover→trace→wire interaction. Companion to the
**visual** contracts in [`token-hover.atlas.supplement.md`](../specs/system/token-hover.atlas.supplement.md)
(what it looks like) and [`preview-edges.trace-strength.supplement.md`](../specs/system/preview-edges.trace-strength.supplement.md)
(how bright). This doc owns **how it runs**: the pipeline, the state ownership, and
a per-function catalog (definition + who calls it). Ends with a code-quality audit.

**Status:** Written 2026-07-15 as the missing runtime spec from
[`trace-engine-consolidation-plan.md`](trace-engine-consolidation-plan.md)
(step 5). Reflects code after the TraceEngine consolidation.

---

## 1. The pipeline (who owns what)

```
 pointer/keyboard          discrete gesture state         imperative runtime state
 ───────────────►  ┌─────────────────────────┐   writes   ┌──────────────────────┐
  onEnter/onLeave  │  traceMachine (xstate)   │──────────► │  TraceEngine         │
  onFocus/onPin    │  via useTraceSession     │            │  (lib/trace/…)       │
                   └───────────┬─────────────┘            └───────┬──────────────┘
                               │ snapshot                          │ read (no React)
                     React context (split)                        ▼
                   ┌─────────────────────────┐          ┌──────────────────────┐
                   │ useGraphInteraction-     │          │ DOM paint layer      │
                   │ Controller → Actions +   │          │ wireEngine (rAF) →   │
                   │ TraceState contexts      │          │ wireDomSync/Reveal,  │
                   └───────────┬─────────────┘          │ traceLitController   │
                       React components                  └──────────────────────┘
```

**Three owners, one direction of flow:**

1. **`traceMachine`** owns *discrete gesture state* (idle → pending → active →
   leaving; pinned traces; hover edges). Pure xstate; the only thing that decides
   "are we tracing, and of what."
2. **`TraceEngine`** owns *imperative runtime state* the DOM paint needs every
   frame without a React render: the signal clock, pointer/emphasis, arrival
   progress, pane mood. Written only by `useTraceSession` (mirroring the machine);
   read by the rAF paint loop and by React selectors.
3. **React context** re-exposes the machine snapshot to components, split into
   **Actions** (identity-stable callbacks) and **TraceState** (volatile) so hot
   components don't re-render on hover (see atlas § render isolation).

The **DOM paint layer never re-renders React** — it mutates SVG/CSS directly off
the engine + registry, driven by `wireEngine`'s rAF ticks.

---

## 2. Lifecycle (one hover, end to end)

| Phase | Trigger | Machine | Engine | Paint |
| ----- | ------- | ------- | ------ | ----- |
| **Enter/pending** | pointer on chip | `POINTER_ENTER` → `pending` | `setWireHoveredTokenKey`, `setPendingTraceHost` | pending wash on chip |
| **Signal prime** | instant (pre-dwell) | — | `emitWireSignal`→`startWireSignalEpoch`+`armSourceArrival`+`primeTraceSignal` | ghost wires seeded |
| **Commit** | dwell elapsed (`fireDelayMs`) | `DWELL_FIRE`+`TRACE_COMMIT` → `active` | `beginTrace` sets `hoverPreviewEdges` | `syncWireDom` builds groups; `playWireReveal` draws |
| **Cascade** | rAF ticks | — | `setWireEndpointArrival(progress)` | stroke dash reveals **from core**; chips light on arrival |
| **Leave** | pointer off | `POINTER_LEAVE` → `leaving` | `keepWireSignalAlive(cascadeMs)`, `stopWireSignalEmitting` | in-flight draws finish |
| **Drain** | `max(grace, cascadeMs)` | — | — | edges persist so cascade completes |
| **Grace expire** | timer | `GRACE_EXPIRE` → `idle` | `endTrace`→`resetWireSignal`+`clearWireArrivals` | `retireWireGroup` fades out |
| **Pin** | click | `PIN` | `lockTraceAnchorPreference` | trace persists past leave |

---

## 3. Function catalog (definition + used by)

Grouped by pipeline stage. "used by" is the caller role; counts are non-test
importing files.

### 3.1 Gesture intent — `hoverIntent.ts`, `traceSession.ts`

| Function | Definition | Used by |
| -------- | ---------- | ------- |
| `fireDelayMs(session,key,instant)` | dwell before a hover commits (0 if warm/instant) | `useTraceSession` scheduleHoverFire |
| `leaveGraceMs(session)` | grace before a leave clears | `useTraceSession` |
| `pointerEnterDelayMs` / `dwellDelayMs` / `graceDelayMs` | ⚠ **duplicate** of the `hoverIntent` trio on `traceSession` | `useTraceSession` |
| `isStalePointerLeave(session,key)` | true if a leave event is for a token no longer hovered | scheduleHoverClear |
| `traceTokenKey(session)` | the key the trace is *about* (pointer > committed > pin); **9 callers** — central | edges, lit, emphasis |
| `isTraceSessionActive` / `isTracePendingMood` / `isTraceLeavingMood` | ⚠ **name-collide** with `TraceEngine` globals; these are pure predicates over a `session` arg | session consumers |
| `emptyHoverTimers` / `clearHoverTimers` / `shouldCommitHoverClear` | timer-bag helpers — **1 caller (near-dead; superseded by `useTraceSession` timers)** | — |

### 3.2 State machine — `traceMachine.ts` (407 LOC)

| Function | Definition | Used by |
| -------- | ---------- | ------- |
| `traceMachine` | the xstate machine (states idle/pending/active/leaving; context: keys, pins, edges) | `useTraceSession` |
| `snapshotToSession(value,ctx)` | project a machine snapshot into the `TraceSession` view components read | `useTraceSession` |

### 3.3 Machine↔engine bridge — `hooks/useTraceSession.ts` (498 LOC ⚠)

Single React hook translating machine transitions into engine mutations. Exposes
~30 callbacks (`scheduleHoverFire/Clear`, `beginTrace`, `emitWireSignal`,
`endTrace`, `pinTrace`, `showTokenInfo`, …). **The only writer of `TraceEngine`.**
See § quality — this file is the biggest hotspot.

### 3.4 Runtime state — `lib/trace/traceEngine.ts` (207 LOC)

Single owner; 31 exports across four slices + one event.

| Group | Functions | Definition | Used by |
| ----- | --------- | ---------- | ------- |
| **Signal clock** | `startWireSignalEpoch`, `stopWireSignalEmitting`, `keepWireSignalAlive`, `resetWireSignal`, `isWireSignalEmitting` (**7**), `getWireSignalEpoch`, `wireSignalElapsedDelay` | epoch/emit window driving the cascade; `keepWireSignalAlive` lets a short hover finish | `useTraceSession`, `wireReveal`, `wireDomCreate`, `wireSignalArrival` |
| **Pointer/emphasis** | `setWireHoveredTokenKey`(**5**), `getWireHoveredTokenKey`, `setHoverPreviewEdgeIds`, `isHoverPreviewEdge`, `setTraceSessionActive`, `isTraceSessionActive`(**7**), `setWireHoveredEdgeId`, `getWireHoveredEdgeId`, `subscribeTraceStrength` | which token/wire the pointer emphasizes; strength channel | `useTraceSession`, `wireHoverBoost`, `useTraceLitState`, paint |
| **Arrivals** | `armSourceArrival`, `setWireEndpointArrival`, `getWireArrival`, `hasWireArrivals`, `clearWireArrivals`, `subscribeWireArrival` | per-endpoint 0–1 propagation progress; arrival channel | `wireReveal`, `wireSignalArrival` |
| **Mood** | `setTraceSessionMood`, `getTraceSessionMood`, `setTraceDomFading`, `isTraceDomFading`, `isTracePendingMood`, `isTraceLeavingMood`, `subscribeTraceSessionMood`(**6**) | pane-wide mood mirror for CSS scoping | `GraphPane`, debug overlay, lit |
| **Prime event** | `subscribeTraceSignalPrime`, `primeTraceSignal` | one-shot synchronous hover-prime (light before React) | controller, overlay |

### 3.5 React exposure — `useGraphInteractionController.ts` (294 LOC ⚠), `GraphInteractionContext.tsx`

| Function | Definition | Used by |
| -------- | ---------- | ------- |
| `useGraphInteractionController` | builds the two context slices (actions + traceState) from machine + edges + lookups | provider |
| `useGraphActions()` | identity-stable actions/lookups — hot components read only this | ~20 hooks/components |
| `useGraphTraceState()` | volatile hover state — leaf anchors only | 3 anchor leaves |
| `useGraphInteraction()` | merged back-compat view (re-renders on hover) | cool single-instance consumers |

### 3.6 Strength model — `traceDepth.ts` (197 LOC), `wireSignalArrival.ts`

| Function | Definition | Used by |
| -------- | ---------- | ------- |
| `traceStrength(situation,surface,depth)` | **the** brightness API — focus/hover × wire/glow/chip × hop | **6 callers**; wires, chips, anchors |
| `depthFromHop` / `previewHopFromDepth` / `clampTraceDepth` | hop↔depth mapping | strength + reveal scheduling |
| `traceWireOpacity` / `traceChipColorStrength` / `traceGlowOpacity` / `tracePathOpacity` / `traceEmphasisPathOpacity` / `traceChipOpacity` | thin wrappers over `traceStrength` — **each 1 caller (near-dead; inline `traceStrength` instead)** | — |
| `getArrivalMultiplier(key,depth)` | 0–1 multiplier while the signal propagates (else null) | `resolveChipStrength`, lit |
| `resolveChipStrength(key,depth,hover)` | final chip brightness = curve × arrival | chip paint |
| `traceKeyFromWireEnd(spec,end)` | trace key at a wire endpoint | reveal direction, arrival |
| `wireEndpointDepth(spec)` | depth of a wire's far endpoint | reveal |

### 3.7 Lit paint (chips/lines) — `computeTraceLit.ts`, `traceLitController.ts`, `pendingTraceChip.ts`, `memberDefAnchor.ts`

| Function | Definition | Used by |
| -------- | ---------- | ------- |
| `computeTraceLit(key,edges,getNode,cache)` | resolve which DOM handles/chips are lit at what depth | **7 callers**; controller, lit state |
| `mergeTraceLit(a,b)` | merge two lit sets (pin + hover) | lit state |
| `applyTraceLit(lit,ctx)` / `clearTraceLit` / `unwindTraceLit` | write/clear `--trace-strength` + lit classes on the DOM | controller |
| `setPendingTraceHost` / `clearPendingTraceHost` / `subscribeTracePending` / `isTracePending` | pending (pre-dwell) chip wash | useTraceSession, lit |
| `resolveMemberDefEndpoint(key)` (**5**) / `memberDefSiblingHosts` / `areMemberDefSiblingHosts` | resolve the live DOM endpoint for a member def (title vs signature line) | reveal, lit |
| `setTraceAnchorHost` / `lock`/`unlockTraceAnchorPreference` / `traceAnchorState` | body-vs-title anchor preference for member endpoints | useTraceSession |

### 3.8 Wire paint — `wireEngine.ts`, `wireDomSync.ts` (150), `wireDomCreate.ts` (250 ⚠), `wireDomLayout.ts` (213 ⚠), `wireReveal.ts` (224 ⚠)

| Function | Definition | Used by |
| -------- | ---------- | ------- |
| `createWireEngine` / `registerWireEngine` / `subscribeWireTicks` / `notifyWireTransform`(**5**) | the rAF loop that re-measures anchors and repaints wires each frame | overlay, load stubs |
| `syncWireDom(container,specs,wires,warm,getNode)` | reconcile the SVG group set to the current edge specs | overlay |
| `createWireGroup` / `setWireWarm` / `applyWireDepthOpacity` / `applyWireMarkers` / `setWireJunction` | build & style one wire's DOM (path/glow/hit/junction) | sync, layout |
| `updateWireGeometry` / `applyFanWireLayout` | set path `d` from live anchor rects each frame | sync |
| `hideWireUntilReveal` / `revealWireIfReady` | gate a wire's first paint on the reveal schedule + signal | layout |
| `buildRevealSchedule` / `wireRevealDelayMs` / `orderSpecsForReveal` | **hop-time** stagger schedule (`(depth-1)·hopStagger + tie·fanStagger`) | sync |
| `playWireReveal(wire,delayMs)` | stroke-dash draw **outward from core** (reverses when core is the `to` end) | wireDomCreate |
| `isWireRevealing` / `cancelWireDraw` / `stripWireRevealStroke` | reveal lifecycle guards | sync, retire |
| `retireWireGroup` | fade + remove a wire that left the spec set | sync |
| `isWireEmphasized` / `isWireHovered` / `edgeTouchesHoveredToken` / `traceKeysFromWire` / `mergePreviewEdgesByStrength` | pointer-emphasis predicates (read engine pointer state) | paint |

---

## 4. Known runtime gaps (behavioral)

1. **Cascade is hop-time-staggered, not arrival-gated.** `buildRevealSchedule`
   assigns each wire a delay of `(depth−1)·wireHopStaggerMs + tie·wireFanStaggerMs`.
   Consequence: **every edge at the same hop starts together** — sibling fan spurs,
   multiple hop-1 wires, and `const`/binding-init wires that share depth 1 all fire
   at once rather than waiting for their *source* endpoint's incoming wire to
   arrive. To get true "node lights → its outgoing wires start" chaining, a wire's
   start must gate on `getWireArrival(sourceKey).progress >= 1`, not on a fixed
   time offset. *(Reported 2026-07-15; not yet implemented.)*
2. **Two `isTraceSessionActive` / `isTracePendingMood` / `isTraceLeavingMood`.**
   `traceSession.ts` (pure predicate over a session) and `traceEngine.ts` (global
   getter) export the same names — import-site ambiguity.
3. **`hoverIntent.ts` overlaps `traceSession.ts`** delay helpers (`dwellDelayMs`);
   several `hoverIntent` exports are single-caller (near-dead).
4. **`traceDepth` wrapper exports** (`traceWireOpacity`, `traceChipColorStrength`,
   …) are each 1-caller passthroughs over `traceStrength`.

---

## 5. Code-quality indicators

Scope: the interaction subsystem (~22 core modules; ~67 files / ~8.5k LOC total).

| Indicator | Value | Read |
| --------- | ----- | ---- |
| **Single source of truth** | ✅ post-consolidation | runtime state is 1 `const` in `traceEngine` (was 17 scattered `let`s) |
| **Files over the 200-line cap** | 7 core | `useTraceSession` 498, `traceMachine` 407, `useGraphInteractionController` 294, `wireDomCreate` 250, `wireReveal` 224, `wireDomLayout` 213, `traceEngine` 207 |
| **Pub/sub channels** | 8 | 3 owned by engine (strength/arrival/mood) + prime; registry/ticks/pending/litFading peripheral |
| **Unit test coverage (lib)** | 66/154 files (**43%**) | pure logic (strength, reveal schedule, machine, engine) covered |
| **Interaction *integration* tests** | **0** | React + DOM-paint layer verified only manually / by throwaway probes |
| **Duplicate exported names** | 3 | `isTraceSessionActive`, `isTracePendingMood`, `isTraceLeavingMood` |
| **Near-dead exports** | ~10 | 7 `traceDepth` wrappers + 3 `hoverIntent` helpers (1-caller) |
| **Lint** | 29 errors / 878 warnings | all **pre-existing**; errors are unused-var; warnings are magic-numbers + file-length |
| **Naming sprawl** | high | signal / arrival / prime / epoch / boost / mood / lit / strength / emphasis overlap |
| **Highest-fan-in functions** | `traceTokenKey`(9), `isWireSignalEmitting`(7), `isTraceSessionActive`(7), `computeTraceLit`(7), `traceStrength`(6) | the load-bearing API — keep stable & tested |

### Grades

| Dimension | Grade | Δ since audit | Note |
| --------- | ----- | ------------- | ---- |
| State architecture | **B** | ↑ from C | one owner now; shims still to delete |
| Runtime documentation | **B+** | ↑ from thin | this doc + atlas cover it |
| Code structure | **C+** | — | 7 over-cap files; naming sprawl |
| Test coverage | **C** | ↑ slightly | engine unit-tested; integration still zero |
| Correctness of cascade | **B−** | — | works by hop; not truly arrival-gated (gap #1) |

### Top recommendations (ordered)

1. **Arrival-gate the cascade** (gap #1) — the fix the user just asked for; also
   makes the animation spec-true ("next chip lights → next wire starts").
2. **Add the integration suite** — promote the render-count / cascade / short-hover
   / falloff probes to permanent tests (plan step 5).
3. **De-dupe the `isTrace*` names** and drop the near-dead exports.
4. **Split `useTraceSession` (498)** — extract the timer/scheduling half.
5. Finish the consolidation: delete adapter shims, add React selectors.

---

## References

- Visual: [`token-hover.atlas.supplement.md`](../specs/system/token-hover.atlas.supplement.md) · Strength: [`preview-edges.trace-strength.supplement.md`](../specs/system/preview-edges.trace-strength.supplement.md)
- Refactor: [`trace-engine-consolidation-plan.md`](trace-engine-consolidation-plan.md)
- Interactions: [`preview-edges.interactions.supplement.md`](../specs/system/preview-edges.interactions.supplement.md)
