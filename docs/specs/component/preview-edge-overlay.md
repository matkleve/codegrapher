# Preview edge overlay

## What It Is

DOM/SVG layer above the React Flow canvas that measures anchor elements each frame, refines live anchor hints, and draws preview connection paths — the **sole** preview-edge pipeline.

## What It Looks Like

Full-pane SVG with dashed paths, glowing endpoint sockets, jump tooltip on wire hit-zones. Paths use overlay-local coordinates (client rect minus SVG origin). No React Flow `<Edge>` elements for preview.

## Where It Lives

- **Component:** `PreviewEdgeOverlay.tsx`
- **Styles:** `connectors.css`
- **Parent:** `GraphFlowCanvas` inside graph pane

## Render loop

```mermaid
flowchart LR
  subgraph rAF [Each animation frame]
    A[previewEdges from context] --> R[refinePreviewEdge live hints]
    R --> M[resolvePreviewAnchor DOM rects]
    M --> P[cubicPath + glow path]
    P --> SVG[setState rendered edges]
  end
  Expand[Member expand / node resize] --> rAF
```

```mermaid
sequenceDiagram
  participant C as GraphInteractionContext
  participant O as PreviewEdgeOverlay
  participant L as resolveLiveAnchor
  participant D as DOM anchors

  C->>O: previewEdges updated
  loop requestAnimationFrame
    O->>L: refinePreviewEdge per spec
    L->>D: query chips / FlowAnchor handles
    O->>O: cubicPath + hit segments
  end
```

## Actions

| # | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1 | Trace active | rAF measure + draw | `previewEdges.length > 0` |
| 2 | Member expands | Live hint upgrades handle → chip | `liveTo` refine |
| 3 | Hovers path hit-zone | Jump tooltip | `JumpTooltip` |
| 4 | Clicks path hit-zone | `pinTrace` + scroll + flash | overlay handler |
| 5 | Trace cleared | Cancel rAF; empty SVG | `previewEdges = []` |

## Component Hierarchy

```text
GraphFlowCanvas
├── graph-ctrl-preview | graph-trace-active | graph-trace-pinned
├── ReactFlow
└── PreviewEdgeOverlay
    ├── <svg> paths + arrow marker
    ├── JumpTooltip
    └── TokenContextBar (sibling, pinned)
```

## Data

| Input | From |
| ----- | ---- |
| `PreviewEdgeSpec[]` | `buildPreviewEdges`, `linksForElement` |
| `liveFrom` / `liveTo` | `previewEdgeTypes.ts` |
| Anchor geometry | `resolvePreviewAnchor` |
| Stroke | `TOKEN_EDGE_STROKE` CSS variables via `style` |

## Wiring

**Blocker:** Handle ids MUST be per-node (`previewMemberHandle(memberId)`, `previewTargetTop(flowNodeId)`). Shared ids attach wires to the wrong node.

Path coordinates are local to the overlay SVG — not flow-space only.

## Acceptance Criteria

- [ ] No preview edges in React Flow `edges` prop
- [ ] rAF loop runs only while `previewEdges.length > 0`
- [ ] `refinePreviewEdge` called before every `resolvePreviewAnchor`
- [ ] Stroke uses CSS variables, not hex in SVG attributes
- [ ] Node resize / member expand updates wire endpoints same frame
- [ ] Hit-zones ~46px along wire ends for jump interaction

## References

- System: [preview-edges.md](../system/preview-edges.md)
- Interactions: [preview-edges.interactions.supplement.md](../system/preview-edges.interactions.supplement.md)
- Handles: [ctrlPreviewHandles.ts](../../../client/src/lib/ctrlPreviewHandles.ts)
