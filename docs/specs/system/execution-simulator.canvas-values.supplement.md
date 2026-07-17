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
topology. Instead, **points of light travel between the tokens**, following evaluation order. Paths
curve in a **slight arc** (not a straight line), so points converging on the same operator from
different operands don't overlap en route.

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

**Call substeps + step-into (scope note):** the call substep above only drives the existing **transport
pulse** (see the pulse cross-link in Data model additions) — it does not itself decide what happens if
the user tries to step into the callee mid-substep. Interactive step-into/step-over is **deferred to,
and owned by, the parent spec**: [execution-simulator.md](execution-simulator.md) (Actions #8–#9, and its
still-unchecked step-into/step-over acceptance criteria) plus the engine's call behavior in
[engine options](execution-simulator.engine-options.supplement.md) (Option A: "step-into descends if
callee on canvas"). It is **not** owned by [modes](execution-simulator.modes.supplement.md) — that
supplement covers the trace-armed/active mode FSM and anchor lifecycle, not call-substep interaction.

**Granularity toggle:** the transport toolbar steps by **statement** by default; a **"substep"** toggle
(or `.`/`,` while `simActive`) advances one flow substep at a time. Substeps render as nested rows under
their statement in the Run-tab ledger (reuses the accordion). **Default behavior (normative):**
statement stepping **auto-plays all substeps in sequence, then settles** at the statement's end; substep-
by-substep stepping is an opt-in toggle, not the default (see Phasing C3/C4 and States below).

---

## Expression flow graph — deriving substeps

Per-statement structure that drives flow points and substep stepping (see Data model additions for its
place in the session). Genuinely new: today `buildStepDetail` extracts reads/writes/calculated with
**regex matching**, not an expression tree — it does not decompose a RHS into an operator graph at all,
so this is new decomposition logic layered on top, not an extension of existing precedence handling.

| Aspect | Detail |
| ------ | ------ |
| Input | The statement's `text` (already split into `tokenizeLine` tokens) + the RHS expression string `buildStepDetail` already isolates for `calculated` entries |
| Output | An ordered `FlowSubstep[]` per statement (see shape below) |
| Anchors | **Line + token-index** (`{ line, tokenIndex }`), the same `${line}:${tokenIndex}` keying `localSymbolLinks.ts` already uses — never a bare name, since names aren't unique/stable anchors (shadowing, re-declaration, repeated identifiers on one line) |

```typescript
type FlowSubstep = {
  kind: "fetch" | "combine" | "assign" | "bind";
  source: { line: number; tokenIndex: number }[];
  target: { line: number; tokenIndex: number };
  value?: SimValue;
};
```

**Precedence for nested expressions** (parens, calls, member access): decompose innermost-first, matching
normal evaluation order — a parenthesized sub-expression's operator combines before the outer operator
that consumes its result; a call's argument list is fetched before the call site. Worked example,
`A = (B + C) * D`: **fetch** `B`,`C`,`D` together → **combine** `+` at the `+` token (consumes `B`,`C`,
produces result `R1`) → **combine** `*` at the `*` token (consumes `R1`,`D`, produces `R2`) → **assign**
`R2` → `=` → **bind** `R2` → `A`.

**Undecomposable RHS (normative trigger):** a statement's RHS is undecomposable — and automatically
falls back to the shimmer-while-computing model (see Alternative, below) — when
it contains any of: a call whose argument list isn't fully resolvable to identifiers/literals already in
scope; a template literal with `${…}` interpolation; a conditional (ternary) expression; or nesting depth
(parens/calls) greater than 2. These are the cases a light regex-based RHS parse (see Input above) can't
safely turn into a precedence-correct operator tree. Trigger is **automatic per line**, with a **global
manual override** to force shimmer mode on any line regardless of decomposability.

---

## Anchor contract (prerequisite for C3)

Today, **only identifier `TokenChip`s are addressable anchors** — they alone render a `data-flow-anchor`
socket (via `FlowAnchor`/`ConnectorChip`), and C2's read/write lighting only ever targets these chips.
Operators, keywords, and literals render as plain `<span>`s in `CodeLine.tsx` with **no anchor of any
kind** (no `data-flow-anchor`, no other addressable attribute).

Flow points (C3) move between *every* token participating in a substep, including operator symbols
(`+`, `*`, `=`) and the LHS target — so **every such token must expose a stable anchor**, e.g. a
`data-sim-anchor="{line}:{tokenIndex}"` attribute (or equivalent), keyed the same way as `FlowSubstep`
anchors above. This is a **prerequisite piece of groundwork for C3**, not something the existing chip
infrastructure already covers — plain-span operator/keyword/literal tokens need new markup before flow
points can measure them.

**Resolved (normative):**

| Question | Decision |
| -------- | -------- |
| Primitive | New **anchor span**, not `TokenChip`. `<span data-sim-anchor="{line}:{tokenIndex}" class="code-pn">…</span>` — same `code-pn` ink as today, zero behavior added |
| Key scheme | Literal `{line}:{tokenIndex}` string (same single-colon format `localSymbolLinks.ts`/`defSites`/`usageTargets` already use) — **not** a `traceKeys.ts` variant |
| Registration | None. No registry, no Map, no mount/unmount effect. The flow-point overlay resolves anchors by live `document.querySelector` each rAF tick, scoped under `.graph-pane` |
| Scoping | Only the operator tokens that are a `source`/`target.tokenIndex` in the **current statement's** `FlowSubstep[]` — never parens, commas, brackets, keywords, or any operator on an undecomposable/shimmer-fallback line |
| Multi-char operators | `tokenizeLine.ts` has **no multi-char operator merge** — confirmed by reading its fallthrough (`tokens.push({ text: ch, kind: "operator" }); i += 1;`). `===`, `=>`, `+=`, `&&`, etc. already tokenize as 2–3 separate single-char tokens today. Not a blocker for C3's initial scope (`+ - * / % =`, all single-char), but a **named prerequisite** before compound/comparison operators can be flow-point targets |
| CSS | New `.sim-flow-anchor-lit` in `simulation.css` (not `trace-modes.css`) — same `color-mix(... var(--edge-binding) ..., transparent)` + `var(--token-chip-radius)` idiom as `.sim-token-write`, applied transiently when a point lands |

**1 · Primitive — anchor span, not `TokenChip`.** `TokenChip` is not just markup: it registers into
`elementRegistry` on mount (`useTraceHostRegistration`, bumping the shared revision counter every
member expand/collapse), and `CodeLine.tsx` wires every identifier chip's hover-intent scheduling
(`scheduleHoverFire`/`scheduleHoverClear`), focus/blur, click-to-pin (`commitTokenPin`), and context
menu — none of which an operator needs. It also changes the **visual contract**: chips render through
`ConnectorChip`'s pill shell, while operators today are plain `code-pn` text (`--muted-foreground`,
no chip background) per `trace-modes.css`/`CodeLine.tsx`'s token-kind switch. Wrapping `*`/`=` in a
`TokenChip` would silently turn every operator into a hoverable, pinnable, chip-styled element —
scope creep this doc explicitly rules out (flow points "don't need hover semantics"). The anchor span
carries **only** `data-sim-anchor` and keeps the existing `code-pn` class — no `cursor-pointer`, no
`role="button"`, no handlers.

**2 · Key scheme — literal `{line}:{tokenIndex}`, not a `traceKeys.ts` variant.** `traceKeys.ts`'s keys
(`makeUsageTokenKey`, etc.) are namespaced by `sourceFlowId::memberId::…` because hover-trace can have
**multiple lit chains active across different flow nodes/members at once** and must disambiguate
globally. Flow points have no such requirement: `graph-sim-active` gates rendering to **one** running
member (`sim.session.memberId`) and **one** current statement at a time (`isSimCurrent` in
`CodeLine.tsx` today), so `{line}:{tokenIndex}` is already unambiguous within the DOM subtree that's
ever mounted with sim anchors — exactly the format `FlowSubstep`'s `source`/`target` anchors use natively,
so the overlay can build the query string directly off substep data with no translation layer.

**3 · Registration — direct DOM query, no registry.** `elementRegistry.ts`'s Map + revision-bump
machinery exists to let hover-trace **react** to the mounted-chip set changing while a trace is held
open indefinitely (expand a member mid-trace, existing chips must re-resolve). Flow points have the
opposite lifetime: they exist only for `SUBSTEP_MS` while one substep animates, driven by the same rAF
loop that already measures preview-edge anchors. Piping operator-anchor mount/unmount through
`registerTraceHost`/`unregisterElement` would fire `scheduleRegistryNotify()` on every substep's mount
churn, bumping the hover-trace revision and re-triggering **every** `useElementRegistryRevision()`
subscriber for a change hover-trace doesn't care about — coupling a C3-only, ephemeral concern into a
persistent, unrelated subsystem's hot path. Instead the flow-point overlay resolves each anchor with
`document.querySelector('[data-sim-anchor="${line}:${tokenIndex}"]')` scoped under `.graph-pane`,
mirroring `resolvePreviewAnchor`'s existing handle-fallback query (`findTargetAnchor`) — same pattern,
zero new lifecycle code.

**4 · Scoping — substep targets only, never over-anchor.** Confirmed against the S1–S4 table and the
`(B + C) * D` walk-through (Expression flow graph, above): flow points only ever land on **(a)** operand
identifiers (already anchored — `TokenChip`), **(b)** the combining operator token(s) (`+`, then `*`),
and **(c)** the assignment `=` token; the LHS (`A`) is again an identifier. Parens never receive a point
— combine steps target the operator directly, skipping the grouping punctuation; keywords (`private`,
`const`, …) and non-participating operators (e.g. a `.` in an unrelated member-access expression on the
same line, or any operator on a line that hit the undecomposable-RHS fallback and never got a
`FlowSubstep[]` at all) get no anchor and stay bare `code-pn`/`code-kw` spans exactly as today. Concretely:
render `data-sim-anchor` on token index `i` **iff** `i` appears as some substep's `target.tokenIndex` (or
a `source[].tokenIndex` pointing at an operator, for chained combines) in the current statement's
`FlowSubstep[]` — computed once per statement, not per token scan.

**5 · Multi-char operators — tokenizer gap, not a blocker for arithmetic.** Reading `tokenizeLine.ts`
confirms the catch-all branch emits exactly one character per unmatched symbol
(`tokens.push({ text: ch, kind: "operator" }); i += 1;`) with no lookahead — there is no regex or table
for `===`, `!==`, `=>`, `+=`, `&&`, `||`, `??`, `**`, `++`, `--`, etc. anywhere in the file. Each becomes
2–3 adjacent single-char `operator` tokens today. This doesn't block C3's stated scope (`B * C`,
`(B + C) * D`, `A = …` — all single-char `+ - * / % =`), so no tokenizer change is required to ship the
Expression flow graph as specified. It **does** block compound-assignment statements (`A += B`) and any
future comparison/arrow decomposition: a `FlowSubstep` targeting `+=` as one semantic operator would
otherwise resolve to two adjacent anchors (`+` then `=`) with no way to pick one. Flagged here as a
**named prerequisite** for whenever compound/comparison operators enter scope — not built in this pass.

**6 · CSS — new `simulation.css` class, reusing existing tokens.** `trace-modes.css`'s lit vocabulary
(`token-chip-lit`, `token-chip-on`, …) is owned by the hover-trace/Ctrl-preview system and means "this
token is part of the currently traced chain" — semantically wrong for "a flow point just arrived here,"
and reusing it would blur the CSS-file ownership boundary the tailwind-tokens-only rule sets (`nodes.css`
member rows, `trace-modes.css` trace/Ctrl, `simulation.css` sim-only). `simulation.css` already has the
right idiom for a sim-scoped, brief-highlight state — `.sim-token-write` (`color-mix(in oklch,
var(--edge-binding) 28%, transparent)` + `var(--token-chip-radius)`). Add a sibling `.sim-flow-anchor-lit`
in `simulation.css` using the same `--edge-binding` mix (the doc's own **result hue**, per Colours,
above) and `--token-chip-radius` — no new custom properties, applied/removed transiently as points
arrive/depart (imperative class toggle on the anchor span, same style as `applyTraceLit`/`traceLitController.ts`'s
approach, but scoped to its own sim-only apply/clear pair rather than routed through that controller).

**7 · Control-flow keywords — out of scope, already covered elsewhere.** `switch`/`if`/`else`/`case`/
`default` are **not** flow-point anchor candidates (bullet 4's "keywords…get no anchor" already excludes
them). Branch-taken visualization is a **PC/line-level** concern, not intra-expression: the Program
Counter (`step.lineNumber`) already jumps into/out of whichever branch executed, and `ControlFlowChip`'s
existing hover/pin fan-out (`controlFlowLinks.ts` → `controlFlowPreviewEdges.ts`) already wires
condition/keyword → every branch. Nothing here needs a new sim-specific anchor. *Pre-existing gap, not
owned by this doc:* `ControlFlowChip` only covers `switch`/`if`/`else`/`case`/`default` today — `for`,
`while`, `do`, `break`, `continue`, `try`/`catch` render as plain inert spans (no chip, no trace key, no
preview edge) in both hover-trace and sim. That gap is [connection-taxonomy.md](connection-taxonomy.md)'s
"Control flow" edge kind, not this doc's.

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
- The **result** point born at an operator → a distinct **result hue** (`--edge-binding` family, already
  defined in `index.css`/`tokens.md` for the binding-preview wire) so the computed value reads
  differently from its operands. The computed value itself renders **inline at the operator only when
  it's a `literal`** (e.g. `7`); otherwise the point shows flow only, with no inline value (Option A
  leaves most intermediate results `~unevaluated`).

---

## Alternative — shimmer while computing (fallback)

When the choreography is too much (deeply nested expressions, performance, or user preference), degrade
to a **line-level** model: operands still "call for" their values, but no per-token points animate.
Instead the **whole line shimmers slowly while unresolved** and **lights solid when the value resolves**.
If resolution waits on something longer (a call that must step into), the shimmer **slows further** to
signal "still computing." This is the **automatic** mode for any line matching the undecomposable-RHS
trigger (see Expression flow graph, above); a **global manual override** lets the user force shimmer mode
on any line regardless of decomposability.

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
| **Value pill** | current step | `step.scopeSnapshot.get(name)` | aggregate chip on row (**C1**, shipped) | pill trailing each in-scope identifier; changed (∈ `detail.writes`) emphasized (**C1b**, not yet shipped) |
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
| **Running — substep** | one flow substep animating (points in motion), synchronized arrival; entered automatically — statement stepping **auto-plays all substeps then settles**; substep-by-substep is opt-in (`.`/`,` toggle) |
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
| **Expression flow graph** per statement: ordered `FlowSubstep[]` (fetch/combine/assign/bind + line+token-index source/target anchors) | `buildStepDetail` (or new `buildStepFlow`) | drives flow points + substep stepping |
| `substepIndex` alongside `currentIndex` | `SimSession` | substep cursor within a statement |
| `simScope: Map<bindingDefId, SimValue>` | `SimulationContext` (derived, not a new engine field) | pills + lighting resolve by binding, obey waterfall, and **survive scope re-entry across steps** (a name-keyed map alone can't distinguish two bindings of the same name across loop iterations/nested scopes) — `scopeSnapshot` itself stays name-keyed; `bindingDefId` is looked up per name via `defSiteFor`/`usageTargetFor` in `localSymbolLinks.ts` |
| `value?: { display; changed? }` | pulse edge spec (`PreviewEdgeSpec.pulse`) | value-labelled transport pulse — an **unlabelled pulse already exists today** via `SimulationContext`'s `pulseEdges` wiring through `PreviewEdgeOverlay`; C5 adds a value label to that existing mechanism, it does not introduce a new pulse pipeline |
| `watchedBindings: Set<bindingDefId>` | `SimulationContext` | persistent pills — **same UX pattern as `pinnedTraces`** (click-to-pin, persists until cleared), but a structurally separate, sim-local set: `pinnedTraces` lives in `GraphInteractionContext` and stores preview-trace edges + `tokenKey`, `watchedBindings` would be a plain `Set<bindingDefId>` in `SimulationContext` — no shared state or store |

Flow points are drawn by a **new overlay layer** measuring token anchors each frame (same pattern as
`PreviewEdgeOverlay`/`resolvePreviewAnchor`), not React nodes — see the Anchor contract above for why
today's identifier-only chip anchors aren't sufficient on their own. Reuse the existing chip-lighting path
for read/write lighting.

---

## Acceptance criteria

> **Status:** these criteria are written against the full on-canvas vision. None are expected to pass
> until **C1b or later** ships (C1b = per-identifier pills, C3 = flow points, C4 = substep stepping,
> C5 = pulse label/watch/slice — see Phasing below). #7 and #8 are annotated inline as already partially
> satisfied by shipped C1/C2 work.

- [ ] **(C1b)** While `graph-sim-active` on an expanded line, each in-scope identifier shows a value pill from `scopeSnapshot`; `detail.writes` names emphasized.
- [ ] **(C3)** Stepping a statement animates its substeps in order; flow points **arrive synchronized** at each substep boundary regardless of token distance.
- [ ] **(C4)** Substep mode advances one substep per step; the Run-tab ledger shows the substep sub-rows.
- [ ] **(C3)** A `combine` substep spawns a result point at the operator; it carries to `=` then to the LHS.
- [ ] **(C3)** A value in a **collapsed** member shows line/row state (shimmer/lit + aggregate), never a point/pill against an unrendered token; collapsing mid-run re-collapses.
- [ ] **(C-alt)** Fallback mode: a line **shimmers while unresolved, lights when resolved**, shimmers slower while waiting on a step-into.
- [ ] `unevaluated` points/pills are visually muted (`~`) vs `literal`. *(partially satisfied by C1 today — the shipped end-of-line aggregate pill already marks `~unevaluated`; per-token flow points don't exist yet)*
- [ ] Exit clears all canvas value chrome; plain hover trace works again. *(partially satisfied today — `exitSimulation` already clears sim state and C1/C2 chrome disappears on exit)*
- [ ] **(C3)** `prefers-reduced-motion` replaces point motion with instant per-substep fades.

---

## Phasing (continues the workspace W-phases)

| Phase | Deliverable |
| ----- | ----------- |
| **C1** ✅ shipped | End-of-line **aggregate** value pill on the current step (`inlineValuesForStep` ← `detail.calculated`/`writes`); `unevaluated` marked `~`. `styles/simulation.css`. |
| **C1b** | **Per-identifier trailing value pills** from `scopeSnapshot` (one pill per in-scope identifier, not just the C1 end-of-line aggregate); `detail.writes` names emphasized. This is what AC #1 (Value pill row, "Expanded" column) actually maps to — not C1. |
| **C2** ✅ shipped | Read/write token lighting on the current line (`detail.reads`/`writes` → `.sim-token-read`/`.sim-token-write`). |
| **C3** | Expression flow graph + **flow points** with synchronized arrival. Default entry is **statement auto-play** (substeps auto-play in sequence, then settle at the statement boundary) — see Substep model. Requires the Anchor contract groundwork (operator/keyword tokens gain stable anchors). |
| **C4** | **Substep stepping**: opt-in `.`/`,` toggle to advance exactly one substep at a time (default stays C3's auto-play-then-settle) + ledger sub-rows. |
| **C5** | Value-labelled transport pulse (extends the pulse mechanism that already exists via `pulseEdges`/`PreviewEdgeOverlay`, not a new one); Watch (`watchedBindings`); backward slice. |
| **C-alt** | Shimmer-while-computing fallback. **Trigger:** automatic per line per the undecomposable-RHS definition (Expression flow graph, above), plus a global manual override to force it on any line. |

C1, C1b, and C2 need no engine change (`scopeSnapshot`/`detail` already carry the data). C3+ add the
expression flow graph — new decomposition logic, not an extension of `buildStepDetail`'s regex extraction
(see Expression flow graph, above).

---

## Decisions log (2026-07-12)

Provenance only — each decision below is now normative in the table/section named, not just here:

- **Substep default** (auto-play then settle) → Substep model + Phasing C3/C4 + States "Running — substep".
- **Result point value** (literal inline, else flow-only) → Colours, result-point bullet.
- **Fallback trigger** (automatic per line + global override) → Expression flow graph "Undecomposable RHS" + Alternative (fallback) + Phasing C-alt.
- **Flow-point path** (slight arc) → Two kinds of motion.
- **Anchor primitive** (new anchor span, not `TokenChip`; direct DOM query, not `elementRegistry`; scoped to substep targets only) → Anchor contract, "Resolved (normative)" table + Q1–Q6.

---

## References

- Panel value display: [transport-panel](execution-simulator.transport-panel.supplement.md) · [workspace](execution-simulator.workspace.supplement.md)
- Reveal waterfall: [interaction-emphasis.md](interaction-emphasis.md) · [preview-edges.anchoring.supplement.md](preview-edges.anchoring.supplement.md)
- Overlay pattern for flow points: [../component/preview-edge-overlay.md](../component/preview-edge-overlay.md)
- Value model / step detail: `client/src/lib/staticWalk/types.ts` (`SimValue`, `SimStepDetail`)
- Binding graph (lighting / slice): `client/src/lib/localSymbolLinks.ts`
- Step-into ownership (deferred, not owned here): [execution-simulator.md](execution-simulator.md) (Actions #8–#9) · [engine options](execution-simulator.engine-options.supplement.md) — not [modes](execution-simulator.modes.supplement.md), which owns mode FSM/anchors only
