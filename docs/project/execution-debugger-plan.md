# Execution debugger plan

A real, interactive step-debugger for code loaded on the graph: run a method with
values you supply, step tick by tick, edit variables mid-run, and mock/"lock" what
a function call returns instead of executing it. Companion to the wire/signal work
in [`signal-wire-port-plan.md`](./signal-wire-port-plan.md) (visual playback layer)
but this doc owns the **execution** side — an actual interpreter, not a stylized
animation.

**Status:** Design only (2026-07-17). No code written yet. This is the point where
we agree the architecture before anything lands.

---

## The fork this plan resolves

Two fundamentally different ways to build "watch the code run":

1. **Real interpreter** — code is actually executed, with real values, real
   mutation, real control flow. This is what lets you supply inputs, edit
   variables mid-run, and mock a call's return value — none of that means
   anything without real execution semantics behind it.
2. **Stylized walk** — no real values; just replay the static call/reference
   graph in program order. Cheap, but can't support "set a variable" or "mock a
   return value" because there's no real state to set or return.

The requirements (feed input, edit variables live, mock function returns) only
make sense under **(1)**. This plan commits to building a real interpreter.
That is a materially bigger scope than the wire-signal work — this doc says so
plainly rather than underselling it.

---

## Architecture

```
                    ┌─────────────────────────────┐
  server (existing) │ TypeScript compiler API      │  unchanged: still the
                     │ indexer.ts, /api/file        │  source of parsed structure
                     └──────────────┬──────────────┘
                                    │ source text + symbol index
                                    ▼
                     ┌─────────────────────────────┐
  client (new)       │ ts.transpileModule           │  strips types only —
                     │ (reuse existing TS dep)      │  no new type-stripper
                     └──────────────┬──────────────┘
                                    │ plain JS AST
                                    ▼
                     ┌─────────────────────────────┐
                     │ Tree-walking interpreter      │  new: client/src/lib/exec/
                     │ (runs IN the browser tab)     │  own Environment/Scope chain,
                     └───────┬──────────┬───────────┘  own call stack, own tick clock
                             │          │
                    pauses at        intercepts every
                    every AST node   function call
                             │          │
                             ▼          ▼
                   ┌─────────────┐  ┌──────────────────┐
                   │ Locals panel │  │ Mock table         │
                   │ (live-edit   │  │ (per-symbol locked │
                   │  scope)      │  │  return value)      │
                   └─────────────┘  └──────────────────┘
```

- **Runs client-side, never on the server.** Executing arbitrary code in a
  process that could be shared across users/requests is a real security
  liability. In a browser tab it's isolated to the person who opened it, same
  trust boundary as running code in a `<script>` tag you wrote yourself.
- **Tree-walking, not transpile-and-`eval`/`vm`.** A tree-walker gives a real
  pause point at *every* AST node natively — required for arbitrary
  breakpoints and for "edit this variable right now." A source-to-source
  instrumentation approach (inserting `await tick()` calls via a Babel plugin,
  for example) only gets pause points where instrumentation was inserted, and
  makes live variable edits far more awkward (you're patching a transpiled
  copy, not the running frame).
- **Type-stripping reuses `ts.transpileModule`** — already a dependency
  (`server` uses the TS compiler API). No hand-rolled parser. Types don't
  affect runtime semantics, so the interpreter only ever sees valid, plain JS.

---

## The tick model

**One tick per statement**, not per sub-expression. `const total = a * b;` is
one tick, not "multiply" + "store" as two. Reasoning:
- Matches the UI's existing code granularity — `CollapsibleMemberRow` already
  renders per-line (`code-line-gutter`, `code-line-body`); a tick-per-line
  highlight is a direct, obvious mapping onto UI that exists today.
- Sub-expression ticks require decomposing every expression into an
  evaluation-order IR (three-address-code style) — real added complexity for
  a granularity nothing in the UI currently visualizes anyway. Can revisit
  later if a concrete need shows up; not default scope.

**Function calls — step over vs. step into**, exactly the VS Code/Chrome
DevTools model (F10 vs. F11):
- Default is **step over**: the call is one tick at the call site (a brief
  flash on the edge to the callee), the callee's body does not execute
  tick-by-tick, execution resumes at the next statement of the caller.
  Internally the callee *does* still need to actually run (to produce a
  correct return value) — it just runs to completion in one step rather than
  being played out.
- **Step into** expands the callee inline and it starts stepping through its
  own body, tick by tick, with its own step-over/into choice per call inside
  it (recursive). This directly answers "100 lines inside, some need several
  ticks, watching it all would take forever" — you only pay that cost when you
  deliberately choose to.

**Calls to code not yet on the canvas** — step-into on an unloaded symbol
triggers the *same* `/api/focus?depth=1` merge the app already uses for
drag-to-canvas (`docs/specs/system/ego-graph-model.md`). No new loading path;
reuse the existing one.

**Calls to genuinely external code** (node_modules, `Array.prototype.map`,
anything the indexer never parsed) — step-into is impossible, there is no
source. These render as an explicit "external — can't step into" state, one
opaque tick, real return value still computed (see mocking below) or left as
the actual native call result if unmocked and the operation is safe to run for
real (pure built-ins like `Array.prototype.map`, `Math.*`, `String.prototype.*`
— see Language scope below).

---

## Interactive state — the three features

| Ask | Mechanism |
| --- | --------- |
| "reinspielen" (feed input) | Before a run starts, an editable Locals panel seeds the interpreter's root scope with user-chosen values. |
| "variablen festlegen" (set variables live) | The same panel stays live-editable at any paused tick — writes go directly into the interpreter's active scope frame; the next tick evaluates against the edited value. |
| "funktionswerte locken" (mock return values) | A per-symbol mock table (`Map<symbolId, MockEntry>`). When the interpreter is about to call a mocked symbol, it skips real evaluation of the body entirely and substitutes the locked value — this is the *same* mechanism as step-over-with-external-code, generalized: user-chosen value instead of "whatever it actually returns." |

Mock table entries need at minimum: `{ symbolId, value }` for a static locked
return, and probably `{ symbolId, fn: (args) => value }` for a value that
depends on the call's arguments — scope that second form as a fast-follow, not
MVP, once the static case is proven.

---

## Reverse / step-back

Only tractable because ticks are deterministic given the state they started
from. Approach: **checkpoint the full scope-chain state every N ticks**
(interval TBD by measuring real memory cost — start with N=1, i.e. every tick,
and only introduce sparser checkpoints + replay-between-checkpoints if memory
becomes a real problem on a long run). Stepping back = restore the nearest
checkpoint, replay forward to the target tick if the checkpoint isn't exact.

True operation-level inversion (compute the literal inverse of each tick) is
**not** in scope — it's undecidable for arbitrary code (`console.log`,
destructive array mutation, anything with a side effect can't be inverted).
Snapshot + replay is the only sound approach here and it's sufficient.

---

## Language scope — MVP, not full coverage

Promising full arbitrary TypeScript/JavaScript execution on day one is not
credible. MVP subset, matching what the indexer/hover system already
understands (classes, methods, properties — see `indexer.ts`):

**In scope for MVP:** classes, methods (incl. `this` binding), properties,
constructors, arrow functions + closures, template literals, destructuring,
`if`/`else`, `for`/`while`, `try`/`catch`, array/object literals, common
built-ins (`Array.prototype.{map,filter,reduce,forEach,push,...}`,
`String.prototype.*`, `Math.*`, `console.*`).

**Explicitly out of MVP** (real, will surface as "not yet supported" rather
than silently misbehaving): `async`/`await`, generators, `Proxy`/`Reflect`,
dynamic `import()`, decorators' runtime behavior (their *type* annotations are
already stripped and irrelevant — but decorator *functions* actually running
is a separate, later concern).

---

## Safety

- **Tick budget per run.** A `while (true)` in the simulated code must not
  hang the tab. Hard cap (e.g. 50k ticks), abort with a clear "hit the tick
  limit" state, not a frozen UI.
- **No privileged host APIs exposed into the sandbox.** The interpreter's
  global scope only ever contains the safe built-ins listed above — never
  `fetch`, `fs`, `require`, or anything that reaches outside the tab. The
  browser's own JS sandbox is the outer boundary; the interpreter itself
  should not punch a hole in it.

---

## File layout (new)

```
client/src/lib/exec/
  interpreter.ts       — the tree-walker: statement/expression evaluation
  environment.ts        — scope chain: create/lookup/assign, closures
  callStack.ts           — frames, step-over/into bookkeeping
  mockTable.ts            — per-symbol locked return values
  snapshot.ts              — checkpoint capture/restore for reverse stepping
  execEngine.ts             — public API: run/pause/step/stepInto/stepBack/setVar
client/src/components/exec/
  LocalsPanel.tsx        — live variable editor
  MockPanel.tsx           — per-symbol mock editor
  ExecTransport.tsx        — play/pause/step/step-into/step-back/speed controls
```

---

## Migration — ordered, each phase demoable on its own

1. **Interpreter core, headless, no UI.** Statement-level tree-walker over one
   hand-picked `fixtures/demo/` file, covering the MVP language subset. Prove
   it runs correctly against a couple of known-output cases (unit tests, no
   graph integration yet).
2. **Step over/into + call resolution**, wired to the existing symbol index
   and `/api/focus` for auto-load-on-step-into. Still headless — assert
   behavior via tests, not UI.
3. **Locals panel + live variable edit**, wired to the graph so the currently
   executing statement highlights on the real canvas.
4. **Mock table + UI.**
5. **Snapshot/step-back.**
6. **Transport controls** (speed presets, pause) — last, since it's the
   thinnest layer once the engine underneath is real.

Each phase ships independently; nothing here blocks on the wire/signal work in
the companion doc.

---

## Risks

- **Scope creep on language coverage.** Mitigate by keeping the MVP list
  explicit and visible in the UI (unsupported construct → named error, not
  silent wrong behavior).
- **Interpreter correctness bugs read as "the tool is lying to me."** Needs a
  real test suite of known-input/known-output cases from day one of phase 1,
  not added later.
- **Perf on large methods.** A tree-walker is slower than native execution;
  for MVP that's fine (nobody's simulating a hot loop of 10M iterations) but
  worth a tick-count sanity check before assuming any method is instantly
  steppable.

## References

- Trace/signal runtime (companion, different concern): `trace-engine-consolidation-plan.md`
- Wire/signal visual layer (companion): `signal-wire-port-plan.md`
- Existing symbol index: `server/src/indexer.ts`
- Existing load-on-demand: `docs/specs/system/ego-graph-model.md`
