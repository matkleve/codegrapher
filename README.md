# codegrapher

Ego-centric TypeScript graph explorer with a file tree, compound class containers, and incremental graph building.

## Specs

Behavior and interaction contracts live in **[docs/specs/](docs/specs/README.md)** (glossary, design tokens, lint via `npm run lint:specs`).

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

## Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Left panel — File explorer

1. Enter an absolute **folder** path and click **Open**.
2. Expand folders in the tree.
3. **Click** a `.ts` / `.tsx` file → clears the graph and loads that file’s classes (compound containers with methods).
4. **Drag** a file onto the graph → merges that file’s import neighborhood (`/api/focus`, depth 1).

### Right panel — Graph canvas

- **← Back** — undo the last graph change (Cytoscape JSON history stack).
- **Click a method** — expand/collapse its source inline in the node.
- **Right-click a node → Find path to…** — click a second node to highlight the shortest path.
- Empty canvas shows: `← Click or drag a file to start`.

## API (port 3001)

| Endpoint | Description |
|----------|-------------|
| `GET /api/tree?path=<dir>` | List child folders/files |
| `GET /api/file-graph?path=<file>` | Parse one file (classes + methods) |
| `GET /api/focus?path=<file>&depth=1-3` | Parse file + import neighborhood (merge on drag) |
| `GET /api/file?path=<file>` | Raw file text |

## Scripts

| Location | Command |
|----------|---------|
| Root | `npm run dev` |
| `server/` | `npm run dev` / `npm run build` |
| `client/` | `npm run dev` / `npm run build` |
