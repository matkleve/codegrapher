# Token interactions

## What It Is

The contract for what a coder can do with an **indexed token** (a class,
function/method, or variable/property name) rendered in a class node — the
gesture vocabulary that turns each keyword into a one-move answer about the code.
Use cases: [design/token-interaction-use-cases.md](../../design/token-interaction-use-cases.md).

## What It Looks Like

An indexed token is a **token chip** in its kind color (class periwinkle, function
blue, type teal, variable indigo). Pointer gestures summon a **preview edge** (definition →
usage), an **info box**, a **jump tip**, or a **Load connector**; the surrounding
code **dims** so the answer stands alone. Nothing is a standing layer — release
the gesture and the node returns to its calm resting state. This spec catalogs
the gestures; edge mechanism lives in [preview-edges.md](preview-edges.md), dim/lit
in [interaction-emphasis.md](interaction-emphasis.md).

## Where It Lives

Every indexed token in a class node body (`CodeLine`), member row header
(`CollapsibleMemberRow`), method signature tags (`MemberSignatureTags` — param
name chips and indexed type chips), and class title (`NodeCardHeader`), scoped
to the `.graph-pane`. Gesture routing: `useTokenTrace` (hover/pin),
`hoverIntent.ts` (dwell), `linksForElement.ts` (endpoints), `PreviewEdgeOverlay`
(draw).

## Actions

| # | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1 | Plain **hover** an indexed token (dwell) | Trace: edge **def → usage**, endpoints lit, rest dim | `hoverIntent` cold/warm |
| 2 | Hover a **definition** (member/class name) | Fan-out edges to in-graph usages; dashed **Load** for off-canvas caller files; counts show **on canvas · in project** | `linksForElement` + reference index |
| 3 | Hover a **usage** | Single edge from its definition to this site | `linksForElement` forward |
| 4 | Hold **Ctrl** (reveal, no pin) | Instant preview; all indexed tokens shimmer; syntax/keywords dampen | `graph-ctrl-preview` |
| 5 | **Click** a token or wire hit-zone | **Pin** one trace + open info box (plain click replaces pin set; Shift+click accumulates) | `pinnedTraces` |
| 6 | Click empty canvas / **Esc** | Clear pin + trace; return to calm | click-away |
| 7 | Hover a wire's **first ~cm** | "Jump to X" tip rides the cursor (overflow-aware) | `.preview-edge-hit` |
| 8 | Click a wire **hit-zone** | Focus the far endpoint (jump) + pin + context bar | hit click |
| 9 | **Long-hover** (extended dwell) | Info box opens transiently | `INFO_DELAY_MS` |
| 10 | Hover an **external** token (indexed, def not in graph) | **TokenConnectionMenu** (hover variant): off-canvas **Load** rows (one row for N=1, list for N≥2) + footer hint; right-click opens full menu. No floating Load pill or stub wire. | `mode:"external"` |
| 11 | Click **Load all · N** (menu, shown when ≥2 load rows) | Load every off-canvas row into the graph in one merge (parallel; merge is a functional update so loads don't race) | `onLoadFile` per row |
| 12 | Click a row in **TokenConnectionMenu** | Jump (on canvas), Load (off canvas), or Open in editor (context footer) | `onLoadFile` / `focusFlowNode` |
| 13 | **Right-click** indexed token | **TokenConnectionMenu** (context variant): On canvas (Jump) + Off canvas (Load) + Open in editor footer — **does not pin** | context menu |
| 14 | **Click** token | Pin trace + **TokenContextBar** (unchanged; coexists with right-click menu) | `pinnedTraces` |

## Interaction by keyword kind

| Kind | Chip color | Definition target | Usage target | Body cascade |
| ---- | ---------- | ----------------- | ------------ | ------------ |
| **Class** | periwinkle | class header anchor | usage site line | node lights; no member spread |
| **Function / method** | blue | member row / expanded line | call site line | lights **its own body** (top→bottom) |
| **Type** (annotation / import / signature tag) | teal | type reference | usage site line or `sig-type` chip | same as class (no body spread) |
| **Variable / property** | indigo | property row | read/write site | does **not** light enclosing functions |
| **Param** (signature tag) | indigo | param chip in signature | in-body read sites | owner row lit; function name dims |

Direction is always **definition → usage**, independent of which end is hovered
(the source feeds its readers). Cascade rule U9: a function endpoint keeps its
body lit; a variable endpoint lights only itself and its wired site.

## Component Hierarchy

```text
graph-pane
├── CodeLine token chip        (usage keywords)
├── CollapsibleMemberRow name  (member definition)
├── NodeCardHeader title       (class definition)
├── PreviewEdgeOverlay         (wires + hit-zones + sockets)
├── TokenContextBar / info box (pinned + transient long-hover)
├── TokenConnectionMenu        (hover/right-click → load rows + Load all + jump)
└── JumpTooltip                (wire "Jump to")

LoadTargetPicker (multi-file pick + filter) is retained for TokenContextBar's
pinned-token load flow; the hover Load pill / LoadConnector was removed.
```

## Data

- Indexed tokens: `GET /api/index` symbol map (`server/src/parser.ts`).
- Load connector: `GET /api/focus?path=&depth=1` via `onLoadFile`.
- Kind → color: `symbolKindToSemantic` + `--token-edge-*`.

## State

| State | Entered by | Effect |
| ----- | ---------- | ------ |
| `idle` | resting / clear | calm; chips at rest color |
| `hover-intent` | pointer on token | timer running, no visual yet |
| `traced` | dwell elapsed / Ctrl | edge drawn, dim + lit |
| `ctrl-reveal` | Ctrl held | shimmer all indexed, dampen syntax; **no** pin |
| `pinned` | plain **click** (replace) / Shift+**click** (accumulate) | trace + info bar locked; breadcrumb when N>1 |

## Acceptance Criteria

- [ ] Given a usage token, when hovered past the dwell, then one edge is drawn
  **from its definition to the token** and both endpoints light.
- [ ] Given a definition, when hovered, then edges fan out to **every in-graph
  usage** with arrowheads on the usages; off-canvas caller files show a dashed
  **Load** stub; the context bar reports **on canvas · in project** counts.
- [ ] Given Ctrl held, when the pointer is idle, then all indexed tokens shimmer
  and non-token syntax dampens, with **no** pin created.
- [ ] Given a token, when **clicked**, then the trace pins and the info box opens
  (replacing any prior pin); click-away on empty canvas or Esc closes it.
- [ ] Given an active wire, when the pointer enters its first ~cm, then a
  cursor-following "Jump to X" tip appears and repositions to stay on screen.
- [ ] Given an indexed token whose definition is **not** in the graph, when
  hovered with **one** off-canvas target, then **TokenConnectionMenu** (hover variant)
  shows a single Load row (no floating Load pill or stub wire).
- [ ] Given **two or more** off-canvas load targets, when hovered, then
  **TokenConnectionMenu** (hover variant) lists load rows, a **Load all · N** action
  above them, and a right-click hint footer.
- [ ] Given an indexed token, when **right-clicked**, then the context
  **TokenConnectionMenu** shows on-canvas Jump rows and off-canvas Load rows (with **Load all** when ≥2) without pinning.
- [ ] Given a token, when **left-clicked**, then pin behavior is unchanged (coexists with right-click menu).
- [ ] Given **Load all** is clicked, then every off-canvas row loads into the graph
  (parallel; the merge is a functional update, so concurrent loads do not clobber).
- [ ] After load, the row's target upgrades to an in-graph preview wire when the
  definition is on the canvas.
- [ ] Given a variable endpoint, when traced, then enclosing functions stay dim
  (no upward cascade); a function endpoint lights its own body.
- [ ] Given an indexed type name in a method signature tag (e.g. `AddressFieldKind`
  after `:`), when hovered past dwell, then `graph-trace-active` dims the member
  row label and non-lit signature text (including union/comment fragments like
  `e.g. "Vienna Austria"`), draws a preview edge when a definition resolves (on
  canvas or Load stub), and lights the hovered chip — same dwell/trace contract
  as a param chip (`field`), regardless of whether the definition is a graph
  node.
- [ ] Plain hover never fires without a dwell; Ctrl fires instantly.

## Interaction emphasis

- Canonical: [docs/design/state-visuals.md](../../design/state-visuals.md)
- [ ] Trace dim/lit per [interaction-emphasis.md](interaction-emphasis.md); hover
  brand-gold on controls, semantic color on lit tokens.

## References

- [preview-edges.md](preview-edges.md) — edge timing, anchors, overlay
- [ego-graph-model.md](ego-graph-model.md) — on-demand philosophy, loading
