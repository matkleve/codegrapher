# Ego-graph model

## What It Is

The incremental subgraph on the canvas: built file-by-file, never the full project. Loading gestures replace or merge nodes according to user intent.

## What It Looks Like

One or more class nodes (compound cards) with import edges between files already loaded. Empty canvas shows placeholder copy. History stack supports undo via Back control.

## Where It Lives

- **Client:** `GraphFlowInner`, `graphMerge.ts`, `GraphCanvas` / `App.tsx`
- **Server:** `/api/file-graph`, `/api/focus`

## Actions

| # | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1 | Clicks `.ts`/`.tsx` in tree | **Replace** graph with single-file parse | `GET /api/file-graph` |
| 2 | Drags file onto `.graph-pane` | **Merge** import neighborhood depth 1 | `GET /api/focus?depth=1` |
| 3 | Clicks "load into graph" on reference card | **Merge** focus neighborhood | `GET /api/focus` |
| 4 | Clicks Back | Pop graph history stack | client undo |
| 5 | Right-click node → path to second node | Highlight shortest path | `graphPathHighlight.ts` |

## Component Hierarchy

```text
App
├── FileExplorer (tree, drag source)
└── GraphFlowInner
    ├── ReactFlow canvas (.graph-pane drop target)
    └── PreviewEdgeOverlay
```

## Data

| Endpoint | When |
| -------- | ---- |
| `/api/file-graph?path=` | Tree click — new graph |
| `/api/focus?path=&depth=` | Drag / reference card — merge |
| `/api/tree?path=` | Explorer folder listing |

## State

| State | Owner | Effect |
| ----- | ----- | ------ |
| `graphData` | Graph flow inner | Nodes + edges |
| History stack | graph snapshot | Back button |

## Acceptance Criteria

- [ ] Tree click clears existing graph before loading new file
- [ ] Canvas drop merges without clearing unrelated nodes when possible
- [ ] Drag uses `filepath` key on DataTransfer (`lib/drag.ts`)
- [ ] Preview edges only connect symbols visible in current ego-graph
- [ ] Empty canvas shows instructional placeholder

## Child specs

- [app-shell.md](../page/app-shell.md) — shell wiring
- [parser-index.md](../service/parser-index.md) — what parser emits
- [preview-edges.md](preview-edges.md) — on-graph connections
