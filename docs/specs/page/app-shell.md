# App shell

## What It Is

Root layout: resizable file explorer (left), graph canvas (right), theme toggle, and providers for index, graph interaction, and Ctrl key state.

## What It Looks Like

Split pane with folder path input, file tree, recent files, and the theme toggle pinned to the explorer footer. Right side is React Flow graph with header controls (Last graph, Next graph, simulation toggle); a Fit-to-screen control lives in the canvas graph controls. Empty graph shows hint text.

## Where It Lives

- **Entry:** `App.tsx`
- **Explorer:** `FileExplorer`, `FileTree`, `useFolderExplorer`
- **Canvas:** `GraphFlowInner`

## Actions

| # | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1 | Enters folder path + Open | Load tree at path | `/api/tree` |
| 2 | Clicks leaf file | Replace graph | `/api/file-graph` — see ego-graph-model |
| 3 | Drags file to canvas | Merge graph | `/api/focus` |
| 4 | Clicks Browse for folder | Native OS dialog | `POST /api/browse-folder` — **never headless** |
| 5 | Toggles theme (explorer footer) | Persist `localStorage["codegrapher:theme"]` | `ThemeToggle` |
| 6 | Resizes sidebar divider | Update sidebar width; below warn width shows collapse hint; release below threshold collapses | `useResizableSidebar` |
| 7 | Clicks node or member on canvas | Select reading-focus target (enables toolbar button) | `selectReadingFocus` — see graph-chrome |
| 7b | Double-clicks member row | Same as row click — select target only | `selectReadingFocus` — see class-node |
| 8 | Clicks **Focus selection for reading** (map controls) | Scroll-align selection; persist `?focus=`; no class width resize | `focusReadingView` |
| 8b | Jump menu → member on canvas | Select + scroll-align in one step | `focusReadingMember` |
| 9 | Clicks **Simulation** toggle (graph header) | Open or close simulation right rail; icon reflects state | `SimulationPanelToggle` |

## Component Hierarchy

```text
App
├── SidebarLayoutProvider
├── IndexProvider
├── CtrlKeyProvider
├── GraphInteractionProvider
├── ResizableSidebar
│   └── FileExplorer
│       ├── path input + Open
│       ├── FileTree
│       ├── RecentFilesSection
│       └── ThemeToggle (footer)
└── GraphFlowInner
    ├── header (Last graph, Next graph, SimulationPanelToggle)
    └── GraphFlowCanvas
```

## Data

| Provider | Loads |
| -------- | ----- |
| `IndexContext` | Symbol index for preview |
| Session | `lastSession.ts`, `recentFolders.ts` |

## State

| State | Storage |
| ----- | ------- |
| Theme | `localStorage` |
| Sidebar width / collapsed | layout context + `localStorage` |
| Open folder path | explorer state |

## File Map

| File | Purpose |
| ---- | ------- |
| `App.tsx` | Shell composition |
| `components/FileExplorer.tsx` | Left panel |
| `components/graph/GraphFlowInner.tsx` | Canvas shell composer |
| `components/graph/useGraphFlowController.ts` | Nodes/edges sync, history, drag-drop |
| `components/graph/useGraphPathMode.ts` | Shortest-path highlight mode |
| `components/graph/useGraphReadingFocus.ts` | Reading focus + URL `?focus=` |
| `components/graph/useGraphMapControls.ts` | Grid, fit/center, map control flash |
| `components/graph/GraphToolbar.tsx` | Graph header chrome |
| `components/graph/GraphMapControls.tsx` | Floating legend + view controls |
| `components/graph/GraphEmptyState.tsx` | Empty canvas overlay |
| `components/graph/GraphNodeContextMenu.tsx` | Node right-click menu |

## Acceptance Criteria

- [ ] Tree click and canvas drop follow different API contracts (replace vs merge)
- [ ] Providers wrap canvas so tokens share one interaction context
- [ ] Theme toggle applies `.dark` on root element
- [ ] Dragging sidebar narrower than warn width shows collapse overlay; release below threshold collapses to rail
- [ ] Browse-folder button is not auto-clicked in headless testing
- [ ] Empty canvas copy instructs click or drag to start
- [ ] Simulation panel opens/closes only via graph header **Simulation** toggle (no duplicate close control in panel chrome)

## References

- [ego-graph-model.md](../system/ego-graph-model.md)
