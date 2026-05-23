# codegrapher

Ego-centric graph visualizer for TypeScript codebases. Start from a single file and expand the graph by clicking nodes — each click loads that file’s import neighborhood (configurable depth) and merges it into the view.

## Prerequisites

- Node.js 18+
- npm

## Setup

From the project root:

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

1. Enter an **absolute path** to a `.ts` or `.tsx` file (e.g. `/home/you/project/src/app/app.component.ts`).
2. Set **Depth** (1–3): how many import hops to follow from the focus file.
3. Click **Load**.
4. Click any node to expand that file’s neighborhood into the graph (merged, not replaced).

**Visual cues**

- **Solid white border** — fully loaded node
- **Dashed border, `+` label** — known import target not yet expanded (click to load)

## Scripts

| Location | Command | Description |
|----------|---------|-------------|
| Root | `npm run dev` | Run server + client concurrently |
| `server/` | `npm run dev` | API with hot reload |
| `server/` | `npm run build` | Compile TypeScript |
| `client/` | `npm run dev` | Vite dev server |
| `client/` | `npm run build` | Production build |

## API

- `GET /api/focus?path=<absolute-file>&depth=1|2|3` — parse focus file + import neighborhood (max 50 nodes)
- `GET /api/file?path=<absolute-file>` — raw file contents

No authentication; intended for local use only.

## Node colors

| Type | Color |
|------|-------|
| file | blue `#4A90D9` |
| class | gold `#E8A838` |
| function | green `#5CB85C` |
| method | purple `#9B59B6` |
