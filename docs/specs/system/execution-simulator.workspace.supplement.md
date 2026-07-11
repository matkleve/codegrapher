# Execution simulator — workspace & gutter (supplement)

Supplement to [execution-simulator.md](execution-simulator.md). Normative for the next simulator UX increment (gutter anchors, tabbed right rail, step ledger, saved trace paths). Engine remains **Option A static walk** unless amended via [engine options supplement](execution-simulator.engine-options.supplement.md).

---

## What it is

Extends the simulator from a single variable table into a **debugger workspace**: gutter anchors for trace bounds, a **tabbed right rail** for the active run / upfront inputs / saved paths, and a **step ledger** — one expandable row per major statement with reads, writes, calculated values, and diagnostics.

Gutter = *where* on source. Toolbar = *how* time advances. Panel = *what happened* and *saved setups*.

---

## What it looks like

### Gutter (left of line number)

```text
[●]  42 │  const order = await this.repo.find(id);
[ ]  43 │  if (!order) return null;
[■]  44 │  return this.gateway.charge(order);
```

| Marker | Meaning | Count |
| ------ | ------- | ----- |
| *(empty; faint ○ on row hover)* | No anchor | — |
| **▶** (green) | Trace **start** | One per armed trace (clears previous) |
| **■** (red) | **Stop here** (end anchor) | One per armed trace (default: last statement) |
| **→** (brand) | **Current step** (program counter) | One during active sim |

Faint brand wash between start and end lines in the same member body.

**Interaction** (follows VS Code / IntelliJ split: line markers ≠ transport):

| Gesture | Effect |
| ------- | ------ |
| Plain click gutter | Toggle **stop here** on this line; if another line had end, move it here |
| Alt/Option+click | Set **start** here (clear previous start) |
| Shift+click (start set) | `runStartToEnd` → preflight if needed |
| During `simActive` | Gutter clicks disabled; show **→** on current step only |
| Right-click line | Keep existing context menu (`Start trace here`, `Set as end point`, `Run start → end`) |

Play, pause, step, scrub, and **exit session** stay in `SimulationToolbar` only — not in the gutter.

### Right rail — tabbed workspace

Three tabs in `SimulationPanel`:

```text
┌ Simulation ──────────────────────── [×] ┐
│ [ Run ] [ Inputs ] [ Paths ]            │
├─────────────────────────────────────────┤
│  (tab content)                          │
└─────────────────────────────────────────┘
```

| Tab | Purpose |
| --- | ------- |
| **Run** | Active session: step ledger + compact “at step” scope summary |
| **Inputs** | Upfront variable presets for the armed or running trace |
| **Paths** | Saved trace configurations (start/end + inputs + method identity) |

Panel opens when user arms a trace (gutter or context menu). `TokenContextBar` stays hidden while `simActive` (parent spec).

### Run tab — step ledger

Vertical list of **major steps** (one row per `SimStep` in the session). Current step row is brand-highlighted; clicking a row scrubs the session (`scrubTo`) and syncs canvas line highlight.

**Collapsed row** (always visible):

```text
▸ 3  L43  if     if (!order) return null;
```

| Column | Content |
| ------ | ------- |
| Chevron | Expand/collapse detail |
| Index | 1-based step number |
| Line | File-absolute `lineNumber` |
| Kind | Icon from `SimStatementKind` (`declare`, `assign`, `call`, `return`, `if`, `await`, `other`) |
| Snippet | Trimmed `text` |

**Expanded row** (accordion; one or many open):

| Section | Content |
| ------- | ------- |
| **Source** | Full statement line (monospace, same as canvas) |
| **Reads** | Identifiers / sub-expressions consulted this step (see Data) |
| **Writes** | Names whose scope entries changed after this step |
| **Calculated** | Binding name → result display for declarations/assignments |
| **Flow** | Optional: callee target, edge pulse summary (`call` / `return`) |
| **Notes** | Diagnostics: unevaluated expressions, static-walk limits, future errors |

Empty sections are omitted (no “Reads: —” placeholders).

### Inputs tab

Form for **trace inputs** — parameters (and later locals-at-start) used by `scopeAtStep`:

- Editable while **armed** (start set, sim not running) or during **preflight**
- **Apply** re-runs `buildSession` if a session exists; otherwise updates `preflightInputs`
- **Save as preset** → names the current input map and stores under Paths (or a linked preset id)
- Field hints from signature param names; optional type hint from parser index when available

Inputs are the “upfront” contract: every ledger row’s reads/writes/calculated are interpreted against this map in Option A.

### Paths tab

**Saved trace paths** (`SimTracePath`) — reproducible setups, not full execution recordings.

Each card:

```text
processOrder  L42→L78
OrderService · amount=99.5, discount=0
[Run] [Edit inputs] [Duplicate] [Delete]
```

| Field | Meaning |
| ----- | ------- |
| Label | User name (default: `{methodName} L{start}→L{end}`) |
| Anchor | `flowNodeId`, `memberId`, `methodName`, `startLine`, `endLine?` |
| Inputs | `Record<string, string>` |
| `savedAt` | ISO timestamp |

**Actions:**

| Action | Response |
| ------ | -------- |
| **Save current** | Persist armed anchors + inputs from Inputs tab |
| **Run** | Restore anchors + inputs → preflight skip if inputs complete → `activateSession` |
| **Edit inputs** | Switch to Inputs tab with path loaded |
| **Duplicate** | Copy with “(copy)” suffix |
| **Delete** | Remove from storage |

**Storage (MVP):** `localStorage["codegrapher:sim-paths"]` as JSON array. No server persistence in v1.

**Compare (deferred):** run two paths with same anchors, diff ledger summaries side-by-side.

---

## Where it lives

```text
GraphFlowInner
└── SimulationProvider
    ├── SimulationPanel
    │   ├── SimPanelTabs (Run | Inputs | Paths)
    │   ├── SimStepLedger        (Run tab)
    │   ├── SimInputsForm        (Inputs tab)
    │   └── SimPathsList         (Paths tab)
    ├── SimulationToolbar        (transport — unchanged ownership)
    ├── SimulationPreflight      (modal; may merge into Inputs tab later)
    └── CodeLine
        └── SimGutterControl     (marker column)
```

---

## Actions (supplement)

| # | User action | System response |
| - | ----------- | --------------- |
| G1 | Gutter: set start / end | Update `startAnchor` / `endAnchor`; shade range |
| G2 | Gutter: Shift+run | Open preflight or start session |
| P1 | Switch to **Run** tab | Show step ledger for `session` |
| P2 | Expand ledger row | Show reads / writes / calculated / notes |
| P3 | Click ledger row | `scrubTo(index)`; highlight line on canvas |
| P4 | **Inputs** tab: edit + Apply | Rebuild `session.steps` with new inputs |
| P5 | **Inputs** tab: Save as preset | Create `SimTracePath` entry |
| P6 | **Paths** tab: Run saved path | Load anchors + inputs; enter sim |
| P7 | **Paths** tab: Save current | Serialize current anchors + inputs |

Parent actions (step, play, exit, context menu) unchanged — see [execution-simulator.md](execution-simulator.md).

---

## Data

### `SimTracePath` (persisted)

```typescript
type SimTracePath = {
  id: string;
  label: string;
  flowNodeId: string;
  memberId: string;
  methodName: string;
  filePath: string;
  startLine: number;
  endLine?: number;
  inputs: Record<string, string>;
  savedAt: string;
};
```

### `SimStepDetail` (per step, derived at session build)

```typescript
type SimStepDetail = {
  reads: { name: string; value: SimValue }[];
  writes: { name: string; before: SimValue; after: SimValue }[];
  calculated: { name: string; expression: string; result: SimValue }[];
  flow?: { kind: "call" | "return"; targetLabel?: string; memberId?: string };
  notes: SimDiagnostic[];
};

type SimDiagnostic = {
  severity: "info" | "warn";
  code: string; // e.g. "static.unevaluated", "static.await", "static.condition"
  message: string;
};
```

### Extended `SimStep`

```typescript
type SimStep = {
  lineNumber: number;
  text: string;
  kind: SimStatementKind;
  scopeSnapshot: Map<string, SimValue>;
  detail: SimStepDetail;
  edgePulse?: { fromLine: number; token?: string };
};
```

### Option A derivation rules (`buildStepDetail`)

| `kind` | Reads | Writes | Calculated | Notes |
| ------ | ----- | ------ | ---------- | ----- |
| `declaration` | RHS identifiers ∩ scope | new binding | name ← parsed initializer | — |
| `assignment` | RHS identifiers ∩ scope | changed binding | name ← parsed initializer | — |
| `call` | arg identifiers | none (v1) | — | `flow.call`; unevaluated return |
| `return` | return expr identifiers | — | — | `flow.return` |
| `if` | condition identifiers | — | — | `static.condition` if not evaluable |
| `await` | inner identifiers | — | — | `static.await` |
| `other` | token scan ∩ scope | — | — | — |

**Writes** = keys in `scopeSnapshot` after step minus before step (or value `display` changed).

**Major step** = every entry in `buildStepList` output (same granularity as today). Sub-expressions inside one statement are not separate rows in v1.

### Line-base convention (normative)

Two coordinate systems meet in the simulator and MUST NOT be conflated:

- **Engine (code-relative):** `buildStepList` / `scopeAtStep` / `buildStepDetail` treat line
  numbers as 1-based indices into a method's `code` string (line 1 = first line of `code`).
- **UI (file-absolute):** the gutter, `CodeLine`, `previewLineHandle`, `startAnchor`/`endAnchor`,
  and `session.startLine`/`endLine`/`step.lineNumber` all use real file line numbers.

`SimAnchor.methodStartLine` (the file line of `code`'s first line — the parser's method start)
is the bridge. `buildSession` converts **file → code-relative** when calling the engine and
**code-relative → file** when emitting `step.lineNumber` / `edgePulse.fromLine`:
`file = rel + methodStartLine - 1`. Any anchor built for the simulator (gutter, context menu)
MUST populate `methodStartLine`, or the walk produces zero/misaligned steps.

> The parser may prefix a method's `code` with blank/trivia lines and set `startLine` on the
> first of them, so `signatureLine` is the first **non-blank** line, not `code[0]`.

---

## State

| State | Default | Effect |
| ----- | ------- | ------ |
| `panelTab` | `"run"` | Active tab in SimulationPanel |
| `startAnchor` / `endAnchor` | null | Gutter markers + range shade |
| `ledgerExpanded` | `Set<number>` | Open accordion rows (step indices) |
| `savedPaths` | `[]` from localStorage | Paths tab list |
| `inputsDraft` | sync with `preflightInputs` | Inputs tab form |

When `simActive` becomes true, switch to **Run** tab and scroll ledger to `currentIndex`.

---

## File map (planned)

| File | Purpose |
| ---- | ------- |
| `client/src/components/simulation/SimGutterControl.tsx` | Gutter marker column |
| `client/src/components/simulation/SimPanelTabs.tsx` | Tab chrome |
| `client/src/components/simulation/SimStepLedger.tsx` | Expandable step list |
| `client/src/components/simulation/SimStepLedgerRow.tsx` | Single row + accordion |
| `client/src/components/simulation/SimInputsForm.tsx` | Inputs tab |
| `client/src/components/simulation/SimPathsList.tsx` | Saved paths CRUD |
| `client/src/lib/staticWalk/buildStepDetail.ts` | Reads/writes/calculated/notes |
| `client/src/lib/simTracePaths.ts` | localStorage load/save |
| `client/src/context/SimulationContext.tsx` | Extend with tab, paths, gutter state |

---

## Acceptance criteria

### Gutter

- [ ] Given an expanded method, when the user Alt+clicks the gutter, then that line shows **▶** and any previous start clears
- [ ] Given an expanded method, when the user clicks the gutter, then that line toggles **■** end anchor (one global end)
- [ ] Given start and end on the same member, when both are set, then lines between them show range shading
- [ ] Given `simActive`, when stepping, then the current line shows **→** and gutter anchor clicks are disabled
- [ ] Given gutter start set, when the user Shift+clicks end gutter, then preflight or session start matches context menu **Run start → end**

### Step ledger

- [ ] Given an active session, when the Run tab is visible, then one ledger row exists per `session.steps` entry
- [ ] Given a declaration/assignment step, when the row is expanded, then **Calculated** shows the binding and `parseInitializer` display
- [ ] Given a step that changes scope, when expanded, then **Writes** lists names whose values changed
- [ ] Given an `await` step, when expanded, then **Notes** includes `static.await`
- [ ] Given the user clicks a ledger row, when `currentIndex` updates, then the canvas line highlight and scrub bar sync

### Inputs tab

- [ ] Given armed anchors, when the user edits inputs and clicks Apply, then `buildSession` runs with new values and ledger rows update
- [ ] Given preflight open, when the user confirms, then inputs match Inputs tab draft

### Paths tab

- [ ] Given armed anchors + inputs, when **Save current** is clicked, then a path appears in Paths and survives page reload
- [ ] Given a saved path, when **Run** is clicked, then sim starts at the saved start/end with saved inputs
- [ ] Given a saved path whose member is not on canvas, when **Run** is clicked, then show clear error (no silent fail)

### Regression

- [ ] Esc / toolbar exit still clears `simActive` and restores hover preview
- [ ] Existing context menu sim actions remain functional

---

## Phasing

| Phase | Deliverable |
| ----- | ----------- |
| **W1** | Gutter markers + range shade + `SimGutterControl` |
| **W2** | Panel tabs shell; Run tab replaces flat variable table with step ledger |
| **W3** | `buildStepDetail` + expandable reads/writes/calculated/notes |
| **W4** | Inputs tab + Apply rebuild |
| **W5** | Paths tab + localStorage persistence |

---

## Open questions

- Merge preflight modal into Inputs tab (single surface) or keep modal for first-run only?
- Cap saved paths count (e.g. 50) and LRU eviction?
- Export ledger as JSON/CSV for notebook use (data-science follow-on)?

---

## References

- **Interactions:** [index](execution-simulator.interactions.supplement.md) · [modes](execution-simulator.modes.supplement.md) · [surfaces](execution-simulator.surfaces.supplement.md)
- Debugger gutter patterns: VS Code (breakpoint vs toolbar), IntelliJ (Alt+click temporary, click line run-to-cursor), Chrome DevTools (breakpoint types pane)
- Parent: [execution-simulator.md](execution-simulator.md)
- Glossary: **Trace session** in [glossary.md](../../glossary.md)
