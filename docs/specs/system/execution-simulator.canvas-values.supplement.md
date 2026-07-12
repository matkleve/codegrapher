# Execution simulator — on-canvas values, flow points & substeps (supplement)

Supplement to [execution-simulator.md](execution-simulator.md). The panel/ledger specs
([workspace](execution-simulator.workspace.supplement.md), [transport-panel](execution-simulator.transport-panel.supplement.md))
put values in the **right rail**. This owns the complementary **on-canvas** layer: values, data
flow, and read/write activity shown *on the code itself* while stepping, so the graph — not a side
pane — is the debug surface. Engine stays **Option A static walk**.

---

## Two kinds of motion (core concept)

Data moves in two visually distinct ways. Keeping them separate is the whole idea:

| | **Transport lines** | **Flow points** |
| --- | ------------------- | --------------- |
| What | Values moving **between tokens across the graph** | Values moving **within one line, between its tokens** |
| Form | On a **wire** (existing preview edge) | **Free-floating points of light** — no wire |
| Scope | inter-member / inter-node (into `B`/`C`, out of `A`) | intra-line expression evaluation (`B`,`C` → `*` → `=` → `A`) |
| Colour | semantic token-kind hue of the wire | hue of the value being carried (see Colours) |

A line is not drawn between the operands of one expression — that would clutter and imply the wrong
topology. Instead, **points of light travel between the tokens**, following evaluation order.

---

## Substep model — a line evaluates in debuggable steps

Take `private A = B * C`. Its right side is an expression tree; evaluation is bottom-up. Each move of
a flow point is one **substep**, and each substep is individually **steppable** in the debugger:

| Substep | Motion | Meaning |
| ------- | ------ | ------- |
| **S1 · fetch** | transport wires bring `B` and `C`'s values in; the two points **arrive at the `B`/`C` chips simultaneously** | operands resolve their current values |
| **S2 · combine** | points leave `B` and `C`, converge free-floating on `*`; a **result point is born** at the operator | the operator computes |
| **S3 · assign** | result point moves `*` → `=` | |
| **S4 · bind** | result point moves `=` → `A`; `A` now holds it and may send out along its wire | the binding is written |

General decomposition (any statement): **fetch** all leaf operands → one **combine** per operator in
precedence order (nested operators chain upward) → **assign** to `=` → **bind** to the LHS. A **call**
`A = foo(B, C)` fetches `B`,`C`, moves them to `foo`, then the value leaves along the **transport wire**
to the callee (step-into or return placeholder), the return point comes back to `foo`, then assign/bind.

**Granularity toggle:** the transport toolbar steps by **statement** by default; a **"substep"** toggle
(or `.`/`,` while `simActive`) advances one flow substep at a time. Substeps render as nested rows under
their statement in the Run-tab ledger (reuses the accordion).

---

## Synchronized arrival (timing, normative)

Within a substep, **every point departs together and arrives together at the end of the substep**,
regardless of distance — because `B` and `C` (and their incoming wires) sit at different positions and
lengths. So a substep has a **fixed duration `SUBSTEP_MS`**; each point's *speed* = its path length ÷
`SUBSTEP_MS`. Never fixed-speed (that desyncs arrivals). Play speed (0.5×/1×/2×/4×) scales `SUBSTEP_MS`.
`prefers-reduced-motion` collapses motion to an instant fade at each substep boundary.

---

## Colours

Flow points are colour-coded so you can tell values apart mid-flight:
- Point carrying a **literal** value → the source token's semantic hue (variable indigo, etc.).
- Point carrying an **unevaluated** expression (Option A can't compute it) → **muted** point + a `~` on
  any value pill it lands in.
- The **result** point born at an operator → a distinct **result hue** (`--edge-binding` family) so the
  computed value reads differently from its operands.

---

## Alternative — shimmer while computing (fallback)

When the choreography is too much (deeply nested expressions, performance, or user preference), degrade
to a **line-level** model: operands still "call for" their values, but no per-token points animate.
Instead the **whole line shimmers slowly while unresolved** and **lights solid when the value resolves**.
If resolution waits on something longer (a call that must step into), the shimmer **slows further** to
signal "still computing." Selectable via a sim setting; also the automatic mode for lines whose RHS
can't be decomposed into a clean tree.

---

## Reveal waterfall (shared invariant)

Everything obeys the hover-trace rule (see [interaction-emphasis.md](interaction-emphasis.md),
`resolveUsageSiteAnchor`): **collapsed → container, expanded → smallest unit.** Flow points and value
pills only render inside an **expanded** member. A collapsed member shows the line-level state
(shimmer/lit) on its row and an aggregate value chip; expanding refines to per-token points and pills.
Collapsing mid-run re-collapses. No flow point or pill is ever drawn against a token that isn't rendered.

---

## What's visible (per element)

Only while `graph-sim-active`. Data from `session.steps[currentIndex]` (+ its substep decomposition).

| Element | Trigger | Data source | Collapsed | Expanded |
| ------- | ------- | ----------- | --------- | -------- |
| **Program counter** `→` + current line | current step | `step.lineNumber` | row marked "running" | `.sim-gutter-marker--current` + `.code-line--sim-current` |
| **Flow points** | current substep | expression flow graph (new) | — (line shimmer/lit) | points of light between tokens |
| **Value pill** | current step | `step.scopeSnapshot.get(name)` | aggregate chip on row | pill trailing each in-scope identifier; changed (∈ `detail.writes`) emphasized |
| **Read / write lighting** | current step | `detail.reads` / `detail.writes` | container lit | chip lighting (write hue stronger than read) |
| **Transport pulse** | `call`/`return` step | `step.edgePulse` + `detail.flow` | line→member→callee | line-chip → callee, value-labelled |
| **Watch pill** | user pins a value | `scopeSnapshot` across steps | floats at node edge | persistent trailing pill |
| **Line state (fallback)** | current step | resolution state | shimmer / lit on row | shimmer / lit on line |

**Value display** mirrors `SimValue.kind`: `literal` as-is (`500`, `"o1"`); `unevaluated` muted with `~`;
`unknown` `?`.

---

## States (canvas)

| State | On canvas |
| ----- | --------- |
| **Idle** | nothing sim-specific |
| **Armed** | gutter markers + range shade; no points/pills |
| **Running — statement** | PC + current-line highlight, pills, read/write lighting, non-current lines dim |
| **Running — substep** | one flow substep animating (points in motion), synchronized arrival |
| **Paused at end** | last step's pills persist; return value emphasized |

---

## Interactions (exact)

| Gesture | Response |
| ------- | -------- |
| **Step / scrub** (statement mode) | advance one statement; substeps auto-play in sequence, then settle |
| **Substep step** (`.`/`,` or toggle) | advance exactly one flow substep; PC + ledger sub-row sync |
| **Hover a value pill** | tooltip: full value + `kind`; `unevaluated` notes "not computed (static walk)" |
| **Click a value pill** | toggle **Watch** (`watchedBindings`); watched pill persists across steps/members |
| **Hover a flow point / lit variable** | light that value's read/write sites in scope (U3 preview) |
| **Alt/long-hover a variable** (running) | backward **binding slice**: light the chain that produced it |
| **Expand / collapse a member** (running) | points/pills refine ↔ collapse to row state (waterfall) |
| **Exit** (Esc / ✕) | clears all canvas value chrome; hover preview trace works again |

Gutter, transport, and tab gestures unchanged — owned by [surfaces](execution-simulator.surfaces.supplement.md).

---

## Data model additions

| Add | Where | Purpose |
| --- | ----- | ------- |
| **Expression flow graph** per statement: ordered `FlowSubstep[]` (fetch/combine/assign/bind + source/target token anchors) | `buildStepDetail` (or new `buildStepFlow`) | drives flow points + substep stepping |
| `substepIndex` alongside `currentIndex` | `SimSession` | substep cursor within a statement |
| `simScope: Map<bindingDefId, SimValue>` | `SimulationContext` | pills + lighting resolve by binding, obey waterfall |
| `value?: { display; changed? }` | pulse edge spec | value-labelled transport pulse |
| `watchedBindings: Set<bindingDefId>` | `SimulationContext` | persistent pills (mirrors `pinnedTraces`) |

Flow points are drawn by a **new overlay layer** measuring token-chip anchors each frame (same pattern
as `PreviewEdgeOverlay`), not React nodes. Reuse the existing chip-lighting path for read/write lighting.

---

## Acceptance criteria

- [ ] While `graph-sim-active` on an expanded line, each in-scope identifier shows a value pill from `scopeSnapshot`; `detail.writes` names emphasized.
- [ ] Stepping a statement animates its substeps in order; flow points **arrive synchronized** at each substep boundary regardless of token distance.
- [ ] Substep mode advances one substep per step; the Run-tab ledger shows the substep sub-rows.
- [ ] A `combine` substep spawns a result point at the operator; it carries to `=` then to the LHS.
- [ ] A value in a **collapsed** member shows line/row state (shimmer/lit + aggregate), never a point/pill against an unrendered token; collapsing mid-run re-collapses.
- [ ] Fallback mode: a line **shimmers while unresolved, lights when resolved**, shimmers slower while waiting on a step-into.
- [ ] `unevaluated` points/pills are visually muted (`~`) vs `literal`.
- [ ] Exit clears all canvas value chrome; plain hover trace works again.
- [ ] `prefers-reduced-motion` replaces point motion with instant per-substep fades.

---

## Phasing (continues the workspace W-phases)

| Phase | Deliverable |
| ----- | ----------- |
| **C1** ✅ shipped | End-of-line value pills on the current step (`inlineValuesForStep` ← `detail.calculated`/`writes`); `unevaluated` marked `~`. `styles/simulation.css`. |
| **C2** ✅ shipped | Read/write token lighting on the current line (`detail.reads`/`writes` → `.sim-token-read`/`.sim-token-write`). |
| **C3** | Expression flow graph + **flow points** with synchronized arrival (statement auto-play). |
| **C4** | **Substep stepping** + ledger sub-rows. |
| **C5** | Value-labelled transport pulse; Watch; backward slice. |
| **C-alt** | Shimmer-while-computing fallback (also the auto-mode for undecomposable lines). |

C1–C2 need no engine change. C3+ add the expression flow graph (a light RHS parse over data
`buildStepDetail` already extracts).

---

## Decisions (2026-07-12)

- **Substep default:** statement stepping stays default; substeps **auto-play then settle** at the statement's end. Substep-by-substep is an opt-in toggle (`.`/`,`).
- **Result point value:** show the computed value **inline at the operator when it's a `literal`**; otherwise show only the flow (Option A leaves most as `~unevaluated`).
- **Fallback trigger:** **automatic per line** by expression complexity (undecomposable → shimmer), with a global manual override.
- **Flow-point path:** **slight arc** so converging points don't overlap en route to the operator.

---

## References

- Panel value display: [transport-panel](execution-simulator.transport-panel.supplement.md) · [workspace](execution-simulator.workspace.supplement.md)
- Reveal waterfall: [interaction-emphasis.md](interaction-emphasis.md) · [preview-edges.interactions.supplement.md](preview-edges.interactions.supplement.md)
- Overlay pattern for flow points: [../component/preview-edge-overlay.md](../component/preview-edge-overlay.md)
- Value model / step detail: `client/src/lib/staticWalk/types.ts` (`SimValue`, `SimStepDetail`)
- Binding graph (lighting / slice): `client/src/lib/localSymbolLinks.ts`
