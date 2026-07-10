# App shell

## What It Is

Root layout: resizable file explorer (left), graph canvas (right), theme toggle, and providers for index, graph interaction, and Ctrl key state.

## What It Looks Like

Split pane with folder path input, file tree, recent files. Right side is React Flow graph with header controls (Back, fit, theme). Empty graph shows hint text.

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
| 5 | Toggles theme | Persist `localStorage["codegrapher:theme"]` | `ThemeToggle` |
| 6 | Resizes sidebar divider | Update sidebar width; below warn width shows collapse hint; release below threshold collapses | `useResizableSidebar` |

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
│       └── RecentFilesSection
└── GraphFlowInner
    ├── header (Back, ThemeToggle, …)
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
| `components/graph/GraphFlowInner.tsx` | Canvas host |

## Acceptance Criteria

- [ ] Tree click and canvas drop follow different API contracts (replace vs merge)
- [ ] Providers wrap canvas so tokens share one interaction context
- [ ] Theme toggle applies `.dark` on root element
- [ ] Dragging sidebar narrower than warn width shows collapse overlay; release below threshold collapses to rail
- [ ] Browse-folder button is not auto-clicked in headless testing
- [ ] Empty canvas copy instructs click or drag to start

## References

- [ego-graph-model.md](../system/ego-graph-model.md)
