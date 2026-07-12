# Component Specs

Reusable UI behavior contracts. Check here before adding net-new interaction patterns.

**Folder layout & split rules:** [agent-playbook/frameworks/react.md](../../agent-playbook/frameworks/react.md)  
**Restructure backlog:** [project/restructure-plan.md](../../project/restructure-plan.md)

## `components/` domains

| Folder | Owns |
| ------ | ---- |
| `graph/` | Canvas, overlay, legend, map controls |
| `nodes/` | Class/file nodes, member rows, headers |
| `code/` | Token chips, source lines, context bar |
| `explorer/` | File tree, recent files |
| `simulation/` | Sim panel, gutter, ledger |
| `ui/` | Shared primitives |

Root-level shells (`FileExplorer.tsx`, `GraphCanvas.tsx`) compose subfolders only.

## graph/

- [class-node](class-node.md) — compound container, member expand, live resize
- [preview-edge-overlay](preview-edge-overlay.md) — SVG overlay, jump tooltip
- [graph-chrome](graph-chrome.md) — connection legend, token connection menu, path highlight

## explorer/

_Specs pending: file-tree, recent-files — add when those surfaces gain non-trivial behavior._

## Shared primitives

- Hover tokens: [interaction-emphasis.md](../system/interaction-emphasis.md)
- Design tokens: [docs/design/tokens.md](../../design/tokens.md)
