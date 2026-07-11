# Glossary

**Who this is for:** anyone reading or writing codegrapher code or specs.  
**What you'll get:** canonical names for graph, token, and interaction concepts.

---

## Product

- **codegrapher**  
  Ego-centric TypeScript graph explorer: file tree + React Flow canvas with compound class containers and on-demand connection previews.

- **Ego-graph**  
  The subgraph currently visible on the canvas — built incrementally from one or more files, never the whole codebase at once. See [ego-graph-model.md](specs/system/ego-graph-model.md).

---

## Graph & nodes

- **Class node**  
  React Flow compound container for one parsed class or module. Renders header, property/method member rows, and inline source when expanded. Spec: [class-node.md](specs/component/class-node.md).

- **Member row**  
  One property or method entry inside a class node. Collapsed by default; click expands inline source (`CodeLine` tokens).

- **File node**  
  Lightweight node for a non-class file entry in the graph (when present).

- **Graph merge**  
  Adding nodes/edges from a second file into the existing canvas graph (drag-drop). Distinct from **replace** (tree click clears and loads one file).

- **Focus / import neighborhood**  
  Server response from `GET /api/focus` — parses a file plus its import graph to depth N. Used for drag-merge and "load into graph" from token references.

---

## Tokens & connections

- **Indexed token**  
  A symbol in the server index (`server/src/parser.ts`) with scoped identity `(filePath, enclosingSymbol?, name)` — classes, methods, properties, params, locals, types, etc. Indexed tokens in an **expanded** method body render as interactive chips and participate in Ctrl-hover, preview edges, and pin. Member row headers and class titles are interactive when indexed even if the body is collapsed. See [parser-index.md](specs/service/parser-index.md).

- **Interactive token**  
  Any chip that can summon a trace — indexed symbols, client-local param/local defs (`localSymbolLinks.ts`), control-flow keywords, or member-access cascade receivers. Broader than "indexed" alone.

- **Token chip**  
  Clickable/hoverable span inside `CodeLine` (or signature tags) for an interactive identifier.

- **Preview edge**  
  Transient SVG edge summoned on token hover (or Ctrl reveal). Usage direction is **definition → usage**; binding and control-flow kinds have their own directions. Spec: [preview-edges.md](specs/system/preview-edges.md).

- **Load stub wire**  
  Dashed preview overlay segment shown when one end of a trace is off-canvas — signals "elsewhere, must load." Coexists with `TokenConnectionMenu` load rows; the floating Load pill was removed. Built by `buildLoadPreviewEdge` / `buildCallSiteLoadPreviewEdge`.

- **Connection kind**  
  One of the distinct relationship types two graph elements can have (usage, **binding**, **control flow**, inheritance, composition, transitive reach, …), each with its own line style/color/arrowhead. Spec: [connection-taxonomy.md](specs/system/connection-taxonomy.md).

- **Binding edge**  
  On-demand dotted preview wire from an initializer expression to the param/local it binds (e.g. `result.address` → `addr`). Direction is **value source → binding**, unlike usage (def → later reference). Summoned on the same hover/Ctrl/pin path as usage wires.

- **Control-flow edge (branch)**  
  On-demand dash-dot preview wire from a `switch`/`if` keyword (or its condition/discriminant identifier) to every `case`/`default`/`else`/`else if` branch of that statement. Direction is **condition/keyword → branch**. Hovering one branch instead draws a single wire back to the head. Answers "which branch does this decision lead to?" — distinct from usage and binding. See [connection-taxonomy.md](specs/system/connection-taxonomy.md) § Control flow.

- **Member-access cascade**  
  Hovering a property in a chain (`country` in `context.country`) also resolves and wires its receiver(s) (`context`), so the whole access path lights up together — not just the tail property. The receiver alone does **not** cascade forward: hovering `context` by itself only wires `context`. Not a new connection kind — it merges whichever wires the receiver would have drawn on its own (Usage, or nothing if the receiver doesn't resolve) into the same trace. See [preview-edges.interactions.supplement.md](specs/system/preview-edges.interactions.supplement.md) § Member-access cascade.

- **Structural edge**  
  A connection kind (inheritance, implementation, composition/DI, module import) that renders **persistently** once both endpoints are loaded (import wires are legend-toggle-gated), unlike preview edges — a deliberate, named exception to the on-demand rule. Rendered in `PreviewEdgeOverlay`'s structural layer. Spec: [connection-taxonomy.md](specs/system/connection-taxonomy.md).

- **Trace session / static walk**  
  Opt-in step-through simulation of a method body (gutter anchors, statement highlight, tabbed simulation panel, playback toolbar). **Option A static walk** is implemented — AST/lexical stepping without running user code. Step-into/out is spec'd but not yet built. Spec: [execution-simulator.md](specs/system/execution-simulator.md) · interactions: [index](specs/system/execution-simulator.interactions.supplement.md) · [modes](specs/system/execution-simulator.modes.supplement.md) · workspace: [execution-simulator.workspace.supplement.md](specs/system/execution-simulator.workspace.supplement.md).

- **Sim trace path**  
  A saved, named setup: method identity, start/end line anchors, and upfront input values. Runnable from the Simulation panel **Paths** tab without re-arming the gutter. Persisted in `localStorage` for MVP. **v2:** superseded by **Sim scenario** (Start/Stop nodes, mocks) — see [execution-simulator.vision.supplement.md](specs/system/execution-simulator.vision.supplement.md).

- **Sim scenario** *(vision — not implemented)*  
  BPMN-like simulation graph on the ego-canvas: **Start** node (inputs), **Stop** node (expected result), optional **Mock** nodes that stub callee responses for class isolation. Spec: [execution-simulator.vision.supplement.md](specs/system/execution-simulator.vision.supplement.md).

- **Anchor**  
  DOM target for an edge endpoint. Resolved per node expansion level: class header → member row → exact source line. IDs from `client/src/lib/ctrlPreviewHandles.ts`.

- **TokenConnectionMenu**  
  Hover or right-click dropdown for Jump / Load / Load all / Open in editor. Sole load **action** surface (no floating Load pill). Spec: [graph-chrome.md](specs/component/graph-chrome.md).

---

## Interaction modifiers

- **Plain hover**  
  Mouse over an interactive token without Ctrl. Preview edge fires after cold/warm dwell (see `hoverIntent.ts`).

- **Ctrl reveal**  
  Holding Ctrl: instant preview, dims syntax/keywords (`graph-ctrl-preview`), shimmers indexed/interactive tokens. Does not pin. Release Ctrl returns to calm default.

- **Pin**  
  Click an interactive token or wire hit-zone to lock one trace (replaces any existing pins) and open the token info box. Clear via click-away on empty canvas or Esc when the context bar is focused.

- **Shift+accumulate pin**  
  Shift+click adds another pinned trace without clearing earlier pins. Plain click replaces the pin set. Shift+click an already-pinned token toggles it off. Breadcrumb chips in `TokenContextBar` when N>1.

---

## Layout & chrome

- **Brand accent**  
  Gold interactive hover in both themes (`--brand`, `--brand-surface`, `--brand-border`). Not `--primary`. See [interaction-emphasis.md](specs/system/interaction-emphasis.md).

- **Preview edge overlay**  
  DOM/SVG layer (`PreviewEdgeOverlay`) that measures anchors each frame — not React Flow edges. Spec: [preview-edge-overlay.md](specs/component/preview-edge-overlay.md).

- **Connection legend**  
  Canvas overlay control (`ConnectionLegend`) toggling visibility per connection kind. Default on for usage/binding/control-flow/structural; module import off.
