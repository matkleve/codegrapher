# Graph chrome

## What It Is

Canvas-overlay controls beside the graph pane: connection-kind legend toggles, token connection menu (load/jump), and node path highlight entry. Complements `PreviewEdgeOverlay` wires — does not draw edges itself.

## What It Looks Like

**ConnectionLegend** — `Waypoints` icon in the **bottom-right map control stack** (same secondary icon button as grid/fit). **Hover label** appears in a compact popover chip to the left (shared `GraphMapControlSlot` with other map controls). Opens upward: compact kind list with large animated swatches; click toggles visibility. **Detail panel** (description + **mini graph mock** using real class-node / member-row / code-line chrome; wires measured from chip DOM via the same path builders as the map) is a **cursor-anchored floating popup**; dismiss with click outside or Escape. Module import off by default.

**GraphMapControlSlot** — `relative` wrapper around each map icon button: `GraphMapControlButton` + legend-style label chip (`graph-map-control-label`). Labels show on hover/focus only (`hidden` while legend panel is open).

**TokenConnectionMenu** — anchored dropdown below a token chip on hover (external/off-canvas targets) or on right-click (full Jump + Load + Open in editor). Shows **Load all · N** when ≥2 off-canvas rows.

**Path highlight** — right-click a node → "Find path to…" → click second node; rings nodes and thickens structural React Flow edges along shortest path.

## Where It Lives

- `ConnectionLegend.tsx` — bottom-right map control stack (`GraphFlowInner`), driven by `GraphInteractionContext`
- `TokenConnectionMenu.tsx` — portal menu, driven by `GraphInteractionContext`
- `connectionMenu.ts` — row builders (`buildHoverLoadMenu`, `buildContextMenu`)
- `graphPathHighlight.ts` — shortest path over React Flow `edges`
- Path UI — context menu in `GraphFlowInner.tsx`

## Actions

| # | User Action | System Response |
| --- | ----------- | --------------- |
| 1 | Opens **Legend** → toggles a kind | `visibleEdgeKinds` updates; preview + structural wires filter immediately |
| 2 | Hovers external token | Dashed Load stub (overlay) + hover **TokenConnectionMenu** with Load row(s) |
| 3 | Right-clicks indexed token | Context **TokenConnectionMenu**: Jump (on canvas) + Load (off) + editor footer |
| 4 | Clicks **Load all · N** | Parallel `/api/focus` merges per row |
| 5 | Right-click node → **Find path to…** | Awaits second node click; highlights structural path or shows "No path found" |

## Component Hierarchy

```text
GraphFlowCanvas
├── ConnectionLegend (top-right)
├── TokenConnectionMenu (portal)
├── TokenContextBar (pinned info — sibling)
└── GraphFlowInner context menu → path mode
```

## Data

| Input | Source |
| ----- | ------ |
| `visibleEdgeKinds` | `GraphInteractionContext` |
| Load targets | `resolveVisibleTarget` external cards, `lookupOffCanvasCallSiteFiles` |
| Path edges | React Flow `edges` prop (imports, extends, …) |

## Acceptance Criteria

- [x] Legend toggles are 1:1 with connection kinds in `connectionVisibility.ts`
- [x] Module import kind hidden by default
- [x] Hover menu shows for N=1 off-canvas target (no floating Load pill)
- [x] Load all fires parallel merges without clobbering graph state
- [x] Path highlight does not use preview overlay wires
- [ ] Per-wire hover tooltip identifying kind — legend only today

## References

- [connection-taxonomy.md](../system/connection-taxonomy.md)
- [accessibility.md](../../design/accessibility.md)
- [token-interactions.md](../system/token-interactions.md)
- [ego-graph-model.md](../system/ego-graph-model.md)
