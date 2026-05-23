# codegrapher

Interactive graph visualizer for TypeScript codebases. Parses `.ts` / `.tsx` files with [ts-morph](https://ts-morph.com/) on the server and renders files, classes, functions, methods, and import relationships with [Cytoscape.js](https://js.cytoscape.org/) in the browser.

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

Or install each package separately if you prefer.

## Development

Start both the API server (port **3001**) and the Vite client (port **5173**):

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

1. Enter an **absolute path** to a TypeScript project (e.g. `/home/you/my-app`).
2. Click **Load**.
3. Click nodes in the graph to inspect code in the right sidebar.

The Vite dev server proxies `/api/*` to the Express backend.

## Scripts

| Location | Command | Description |
|----------|---------|-------------|
| Root | `npm run dev` | Run server + client concurrently |
| `server/` | `npm run dev` | API with hot reload (`ts-node-dev`) |
| `server/` | `npm run build` | Compile TypeScript to `dist/` |
| `client/` | `npm run dev` | Vite dev server |
| `client/` | `npm run build` | Production build |

## API

- `GET /api/parse?path=<absolute-directory>` — parse project, returns `{ nodes, edges }`
- `GET /api/file?path=<absolute-file>` — raw file contents

No authentication; intended for local use only.

## Node colors

| Type | Color |
|------|-------|
| file | blue `#4A90D9` |
| class | gold `#E8A838` |
| function | green `#5CB85C` |
| method | purple `#9B59B6` |
