# Token interactions

## What It Is

The contract for what a coder can do with an **indexed token** (a class,
function/method, or variable/property name) rendered in a class node — the
gesture vocabulary that turns each keyword into a one-move answer about the code.
Use cases: [design/token-interaction-use-cases.md](../../design/token-interaction-use-cases.md).

## What It Looks Like

An indexed token is a **token chip** in its kind color (class blue, function
blue, variable indigo). Pointer gestures summon a **preview edge** (definition →
usage), an **info box**, a **jump tip**, or a **Load connector**; the surrounding
code **dims** so the answer stands alone. Nothing is a standing layer — release
the gesture and the node returns to its calm resting state. This spec catalogs
the gestures; edge mechanism lives in [preview-edges.md](preview-edges.md), dim/lit
in [interaction-emphasis.md](interaction-emphasis.md).

## Where It Lives

Every indexed token in a class node body (`CodeLine`), member row header
(`CollapsibleMemberRow`), and class title (`NodeCardHeader`), scoped to the
`.graph-pane`. Gesture routing: `useTokenTrace` (hover/pin), `hoverIntent.ts`
(dwell), `linksForElement.ts` (endpoints), `PreviewEdgeOverlay` (draw).

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
| 10 | Hover an **external** token (indexed, def not in graph) | Dashed **Load** pill (N=1) or **TokenConnectionMenu** (N>1 off-canvas load rows) + footer hint; right-click opens full menu | `mode:"external"` |
| 11 | Click the **Load** pill | N=1: load immediately; N>1: open picker (same rows as hover menu) | load |
| 12 | Click a row in **TokenConnectionMenu** | Jump (on canvas), Load (off canvas), or Open in editor (context footer) | `onLoadFile` / `focusFlowNode` |
| 13 | **Right-click** indexed token | **TokenConnectionMenu** (context variant): On canvas (Jump) + Off canvas (Load) + Open in editor footer — **does not pin** | context menu |
| 14 | **Click** token | Pin trace + **TokenContextBar** (unchanged; coexists with right-click menu) | `pinnedTraces` |

## Interaction by keyword kind

| Kind | Chip color | Definition target | Usage target | Body cascade |
| ---- | ---------- | ----------------- | ------------ | ------------ |
| **Class** | blue | class header anchor | usage site line | node lights; no member spread |
| **Function / method** | blue | member row / expanded line | call site line | lights **its own body** (top→bottom) |
| **Variable / property** | indigo | property row | read/write site | does **not** light enclosing functions |

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
├── TokenConnectionMenu        (hover external token → loadable classes)
├── JumpTooltip                (wire "Jump to")
└── LoadConnector              (external symbol → load)
    └── LoadTargetPicker       (multi-file pick + filter)
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
  hovered with **one** off-canvas target, then only the **Load** pill appears (no hover dropdown).
- [ ] Given **two or more** off-canvas load targets, when hovered, then
  **TokenConnectionMenu** (hover variant) lists load rows and shows a right-click hint footer.
- [ ] Given an indexed token, when **right-clicked**, then the context
  **TokenConnectionMenu** shows on-canvas Jump rows and off-canvas Load rows without pinning.
- [ ] Given a token, when **left-clicked**, then pin behavior is unchanged (coexists with right-click menu).
- [ ] Given multiple off-graph definitions, when Load is clicked, then
  **LoadTargetPicker** opens (search when >6 files); N=1 loads immediately.
- [ ] After load, the stub upgrades to an in-graph preview wire when the
  definition is on the canvas.
- [ ] Given a variable endpoint, when traced, then enclosing functions stay dim
  (no upward cascade); a function endpoint lights its own body.
- [ ] Plain hover never fires without a dwell; Ctrl fires instantly.

## Interaction emphasis

- Canonical: [docs/design/state-visuals.md](../../design/state-visuals.md)
- [ ] Trace dim/lit per [interaction-emphasis.md](interaction-emphasis.md); hover
  brand-gold on controls, semantic color on lit tokens.

## References

- [preview-edges.md](preview-edges.md) — edge timing, anchors, overlay
- [ego-graph-model.md](ego-graph-model.md) — on-demand philosophy, loading
