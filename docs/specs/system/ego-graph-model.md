# Ego-graph model

## What It Is

The incremental subgraph on the canvas: built file-by-file, never the full project. Loading gestures replace or merge nodes according to user intent.

## What It Looks Like

One or more class nodes (compound cards) with import edges between files already loaded. Empty canvas shows placeholder copy. **Last graph / Next graph** buttons navigate a client-side snapshot history (distinct from browser back).

## Where It Lives

- **Client:** `GraphFlowInner`, `graphMerge.ts`, `GraphFlowCanvas` / `App.tsx`
- **Server:** `/api/file-graph`, `/api/focus`

## Actions

| # | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1 | Clicks `.ts`/`.tsx` in tree | **Replace** graph with single-file parse | `GET /api/file-graph` |
| 2 | Drags file onto `.graph-pane` | **Merge** import neighborhood depth 1 | `GET /api/focus?depth=1` |
| 3 | Clicks Load in **TokenConnectionMenu** / context bar | **Merge** focus neighborhood | `GET /api/focus` |
| 4 | Clicks **Last graph** / **Next graph** | Navigate snapshot history stack | `GraphFlowInner` history refs |
| 5 | Right-click node → **Find path to…** → click second node | Highlight shortest path over **React Flow structural edges** (imports, extends, …) | `graphPathHighlight.ts` |

Path highlight follows persisted React Flow edges only — not preview/usage wires.

## Component Hierarchy

```text
App
├── FileExplorer (tree, drag source)
└── GraphFlowInner
    ├── GraphFlowCanvas (.graph-pane drop target)
    │   ├── PreviewEdgeOverlay
    │   └── ConnectionLegend
    └── SimulationPanel / SimulationToolbar (when sim active)
```

## Data

| Endpoint | When |
| -------- | ---- |
| `/api/file-graph?path=` | Tree click — new graph |
| `/api/focus?path=&depth=` | Drag / Load menu — merge |
| `/api/tree?path=` | Explorer folder listing |

## State

| State | Owner | Effect |
| ----- | ----- | ------- |
| `graphData` | Graph flow inner | Nodes + edges |
| History stack | `historyBackRef` / `historyForwardRef` | Last/Next graph buttons |

## Acceptance Criteria

- [x] Tree click clears existing graph before loading new file
- [x] Canvas drop merges without clearing unrelated nodes when possible
- [x] Drag uses `filepath` key on DataTransfer (`lib/drag.ts`)
- [x] Preview edges only connect symbols visible in current ego-graph
- [x] Empty canvas shows instructional placeholder
- [x] Path highlight uses structural React Flow edges, not preview overlay wires

## Child specs

- [app-shell.md](../page/app-shell.md) — shell wiring
- [parser-index.md](../service/parser-index.md) — what parser emits
- [preview-edges.md](preview-edges.md) — on-graph connections
- [graph-chrome.md](../component/graph-chrome.md) — legend, connection menu
