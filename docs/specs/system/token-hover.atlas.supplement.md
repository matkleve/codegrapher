# Token hover — atlas (start here)

**Agents:** one lifecycle table below; detail in linked specs. Do not restate in chat ([working-with-agents.md](../../agent-playbook/core/working-with-agents.md)).

**Implement:** [trace-emphasis-implementation-plan.md](../../project/trace-emphasis-implementation-plan.md) · **Verify:** [interaction-emphasis.acceptance-criteria.md](interaction-emphasis.acceptance-criteria.md)

---

## Full lifecycle (normative summary)

One clock for surround + lit on **enter**: **`--motion-trace` (120ms)** + **`--ease`**; pending dim **`--motion-trace-pending` (80ms)**. **Fade-out:** **`--motion-trace-out` (80ms)** + **`--ease-trace-out`**. Wire: ghost at commit + stroke draw (WAAPI) that **grows outward from the hovered core token** (`wireReveal.ts` reverses the dash when the core is the wire's `to` end). Orchestration: `traceMotion.ts`.

**Hop-sequential cascade (normative):** the reveal steps outward one hop at a time — a hop's wire only starts once the previous hop's wire has finished and its endpoint chip has lit (`wireHopStaggerMs` = `wireRevealMs`; fan legs within a hop stagger by `wireFanStaggerMs`). The signal is **fire-and-forget**: a short hover still completes the full cascade to the outermost hop — on pointer leave the signal is kept alive and the edge-retire drain is sized to `wireCascadeDurationMs` (the remaining hop schedule), so leaving early never truncates the wave.

| When | Pane mood | Class card | Member rows | Syntax / chrome | Indexed chips | Wires |
| ---- | --------- | ---------- | ----------- | --------------- | ------------- | ----- |
| **Idle** | — | white; title normal | `bg-muted` | full color | resting ink | hidden |
| **Enter / pending** (instant signal) | `graph-trace-pending` | white; title → `--faint` | non-lit → `--trace-dim-surface` | `--faint-*` | ink **unchanged**; focal pending strength (0.52) | **signal starts** — hop-1 draws from core |
| **Commit / active** (dwell) | `graph-trace-active` | white; title faint | lit path → blue wash; others dim | `--faint-*` on non-lit lines | path: lit + fill; off-path: resting ink | wave continues outward by hop |
| **Ctrl held** (stacks) | `+ graph-ctrl-preview` | unchanged | dim surface | **`--faint-ctrl`** (wins) | shimmer + resting ink | instant commit if hover |
| **Pointer on path** (active) | active | — | — | — | hover strength bump | touched wires emphasize |
| **Pin** | `+ graph-trace-pinned` | — | per merged lit | per merged lit | `token-chip-source` | persist |
| **Leave** (unhover) | `graph-trace-leaving` → idle | title eases back | dim eases back | eases back | lit unwinds | emitter **off**; in-flight signals finish, then 80ms retire |
| **Leave timing** | `onVisualLeave` immediate; no leave grace | | | | | cancel WAAPI reveal on retire |

**Invariants:** chip emphasis only goes **up** (never `--faint` then relight). Dwell gates **commit** (wires, row blue, lit DOM) — not chip ink. Row blue on **commit only**, not pending.

---

## Layers (where detail lives)

| Layer | Spec | Code |
| ----- | ---- | ---- |
| Gestures | [token-interactions.md](token-interactions.md) | `useTokenTraceState` |
| Clock / state machine | [preview-edges.interactions.supplement.md](preview-edges.interactions.supplement.md) | `hoverIntent.ts`, `traceMotion.ts`, `traceWireSignal.ts`, `beginTrace` |
| Pixels | [interaction-emphasis.md](interaction-emphasis.md) | [implementation supplement](interaction-emphasis.implementation.supplement.md) |
| Brightness | [preview-edges.trace-strength.supplement.md](preview-edges.trace-strength.supplement.md) | `traceDepth.ts`, `traceLitApply.ts` |
| Wire kind + geometry | [connection-taxonomy.md](connection-taxonomy.md) · [wayfinding supplement](preview-edges.wayfinding.supplement.md) | edge builders, `wireDomSync.ts` |

---

## Render isolation (why the interaction context is split) — normative

The trace visuals are applied to the **DOM directly** (`traceLitApply.ts`, `wireDomSync.ts`), so a
hover must cause **zero React re-renders** of the graph body. To keep that true, the interaction
context is **two contexts, one provider** (`GraphInteractionContext.tsx`):

- **`useGraphActions()`** — identity-stable callbacks/lookups (`beginTrace`, `scheduleHoverFire`,
  `graphData`, the `lookup*` fns, …). Never changes on hover. **Hot, multiplied components
  (code lines, member rows, class nodes, and every `useCodeLine*`/`useToken*`/`useDefinitionTrace`
  hook) MUST read only this.**
- **`useGraphTraceState()`** — volatile per-hover state (`isHandleActive`, `hoveredTokenKey`,
  `previewEdges`, `tokenInfo`, …). Reading it subscribes to per-pointer-move re-renders, so read it
  **only in the small leaf anchor dots** (`ClassTargetAnchors`, `LineTargetAnchor`,
  `MemberTargetAnchor`) — never in a component that renders code/members.
- `useGraphInteraction()` is the merged back-compat view; it re-renders on hover, so it is for
  **cool, single-instance** consumers only (overlays, legend, toolbar).

**Agent pitfall:** a hook consumed per-row/per-line that reaches the volatile slice — directly, or
transitively (e.g. `useSimulationOptional` when `SimulationProvider` itself reads volatile state) —
silently re-renders the whole graph on every pointer move. Verify with a render counter on
`CodeLine`/`CollapsibleMemberRow`: a full hover in→dwell→out cycle must stay at **0**.

---

## CSS ownership

| Owns | Files |
| ---- | ----- |
| Surround dim (syntax, titles, carets) | `trace-syntax.css` |
| Member row shells | `trace-member.css` |
| Chip ink / fill / pending | `tokens-chips*.css`, `trace-chip-lit.css` |
| Ctrl explore | `trace-ctrl.css` |
| Wire draw / retire / march | `preview-edge.css`, `wireReveal.ts`, `wireDomSync.ts` |
| Pane mood classes | `GraphPane.tsx` |
| Trace session FSM | `traceMachine.ts` (XState statechart), `traceSession.ts` (types + pure selectors), `useTraceSession.ts`, `traceSessionMood.ts` |

**Never:** `.token-chip` color rules in `trace-syntax.css`.

---

## Trace session FSM (pane mood + hover)

Single reducer owns pane mood and token pointer/committed keys. **Do not** add parallel `setState` / module singletons for hover mood.

| Mood | Meaning | Pane class |
| ---- | ------- | ---------- |
| `idle` | No trace | — |
| `pending` | Dwell before commit | `graph-trace-pending` |
| `active` | Committed trace | `graph-trace-active` |
| `leaving` | Grace / DOM fade | `graph-trace-leaving` |

Events: `POINTER_ENTER`, `POINTER_LEAVE`, `DWELL_FIRE`, `GRACE_EXPIRE`, `TRACE_COMMIT`, `PIN`, `FADE_COMPLETE`. Timers dispatch events — they do not mutate mood directly.

**Debug:** `?trace-debug=1` → `TraceSessionDebugOverlay` on the graph pane.

---

## Agent pitfall — wire hover vs focus+hover

**Not a hop-2 math cap.** Two edge lists: `hoverPreviewEdges` (from `beginTrace`) vs `previewEdges` (drawn, + transitive hop 2+). Wire hover used to sync IDs from the **short** list only → hop 1 looked hover, hop 2+ stayed focus.

**Rule:** pointer on trace → register **all** `previewEdges` in `syncHoverPreviewEdgeIds` (`emphasisTokenKey ?? hoveredTokenKey`). Chips use `emphasisTokenKey` on enter; wires must use the same pointer + full edge list.

**Hover-only “works”** because both lists are the same. **Focus+hover** broke when they diverged.

---

## Not token hover

- App chrome: [graph-chrome.md](../component/graph-chrome.md)
- Simulation: [execution-simulator.atlas.supplement.md](execution-simulator.atlas.supplement.md)
