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
  A class or method name in the server symbol index (`server/src/parser.ts`). Only indexed tokens participate in Ctrl-hover and preview edges.

- **Token chip**  
  Clickable/hoverable span inside `CodeLine` for an indexed identifier.

- **Preview edge**  
  Transient dashed SVG edge summoned on token hover (or Ctrl reveal). Always **definition → usage**. Spec: [preview-edges.md](specs/system/preview-edges.md).

- **Anchor**  
  DOM target for an edge endpoint. Resolved per node expansion level: class header → member row → exact source line. IDs from `client/src/lib/ctrlPreviewHandles.ts`.

- **Reference card**  
  UI shown when a hovered symbol's definition is outside the current graph; offers "load into graph" via `/api/focus`.

---

## Interaction modifiers

- **Plain hover**  
  Mouse over an indexed token without Ctrl. Preview edge fires after cold/warm dwell (see `hoverIntent.ts`).

- **Ctrl reveal**  
  Holding Ctrl: instant preview, dims syntax/keywords (`graph-ctrl-preview`), shimmers indexed tokens. Does not pin. Release Ctrl returns to calm default.

- **Pin**  
  Click an interactive token or wire hit-zone to lock one trace (replaces any existing pins) and open the token info box. Clear via click-away on empty canvas or Esc when the context bar is focused.

- **Shift+accumulate pin**  
  Shift+click adds another pinned trace without clearing earlier pins. Plain click replaces the pin set. Shift+click an already-pinned token toggles it off.

---

## Layout & chrome

- **Brand accent**  
  Gold interactive hover in both themes (`--brand`, `--brand-surface`, `--brand-border`). Not `--primary`. See [interaction-emphasis.md](specs/system/interaction-emphasis.md).

- **Preview edge overlay**  
  DOM/SVG layer (`PreviewEdgeOverlay`) that measures anchors each frame — not React Flow edges. Spec: [preview-edge-overlay.md](specs/component/preview-edge-overlay.md).
