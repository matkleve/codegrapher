# codegrapher

Ego-centric TypeScript graph explorer: left panel is a file tree (point it at any
absolute folder), right panel is a React Flow canvas that renders classes/modules as
compound containers with expandable member rows (inline source with clickable token
chips). Graphs are built incrementally — click a file to start a graph, drag files
onto the canvas to merge them in.

## Architecture

- `client/` — Vite + React 19 + `@xyflow/react` (React Flow) + dagre layout. Entry:
  `src/App.tsx`; canvas: `src/components/graph/GraphFlowInner.tsx`; class containers:
  `src/components/nodes/ClassNode.tsx`.
- `server/` — Express on port 3001, parses TS files with the TypeScript compiler API.
  All endpoints in `server/src/index.ts`: `GET /api/index`, `/api/tree`,
  `/api/file-graph`, `/api/focus?depth=`, `/api/file`, `/api/open`,
  `POST /api/browse-folder` (opens a **native OS folder dialog** — never call it
  headless, it hangs).
- Client proxies `/api/*` to 3001. `npm run dev` at the root starts both.
- Interaction semantics (README is partially stale here): **click** file =
  `/api/file-graph` (new graph, single file), **drag onto canvas** = `/api/file-graph`
  merged into the existing graph, **token-reference "load into graph"** =
  `/api/focus` (import neighborhood, brings cross-file `imports` edges).
- Ctrl+hover preview edges are drawn exclusively by `PreviewEdgeOverlay` (a DOM/SVG
  overlay measuring anchor elements each frame) — there is no React-Flow-edge-based
  preview pipeline. Target anchors are per-node (`previewTargetTop(flowNodeId)`,
  `previewMemberHandle`, `previewLineHandle` in `client/src/lib/ctrlPreviewHandles.ts`);
  never introduce a shared constant handle id, or `findTargetAnchor` connects to the
  wrong node. Path coordinates are local to the overlay svg (client rect minus svg
  origin).
- Theming: light is the `:root` default, dark is the `.dark` class; the toggle
  (`ThemeToggle` in the graph header) persists to `localStorage["codegrapher:theme"]`.
  Colors used from JS (e.g. `TOKEN_EDGE_STROKE`) must be CSS variables applied via
  `style`, not hex literals or SVG presentation attributes.
- Interactive hover uses a gold **brand** accent in BOTH themes (`--brand` /
  `--brand-surface` / `--brand-border`, gold-per-theme, registered as Tailwind
  `brand`/`brand-surface`/`brand-border`). Route any new clickable/draggable element's
  hover to these — not `--primary` (which is theme-split blue/gold). The raw hover
  rules live in `index.css` (`.hoverable:hover`, section headers, graph controls); the
  button variants share `CONTROL_INTERACTIVE_HOVER` in `lib/controlTokens.ts` (keep the
  two in sync).

## Conventions

- `npm run lint` at root = client lint + server lint. Rules are Feldpost-aligned and
  live in `eslint.shared.mjs` (`maintainabilityRules` + `codeQualityRules`, spread into
  both `client/eslint.config.js` and `server/eslint.config.mjs`). The key cap is
  `max-lines` warn at **200 code lines** — keep files small and single-purpose so an
  agent can load one file and edit it precisely; split rather than grow. Also enforced:
  no `any`, `consistent-type-imports`, no unused imports/vars (all error, autofixable
  except `any`); return types + magic numbers are warn-only. Warnings don't fail the
  build; there are currently ~10 files over 200 lines flagged for splitting.
- No test suite yet; verification is manual via the browser preview (see below).

## Driving the app headless (AI testing guide)

Start via `.claude/launch.json` (`codegrapher-dev`, port 5173). Class-heavy sample
files for graph testing live in `fixtures/demo/` (OrderService imports
PaymentGateway, so `/api/focus` yields an `imports` edge).

Pitfalls learned the hard way:

- The first `<button>` in the DOM is **"Browse for folder"** which POSTs
  `/api/browse-folder` and hangs headless. To open a folder: fill the one `input`,
  then click the button whose trimmed text is `Open`.
- Open a file: click the leaf element whose `textContent` equals the filename.
- Simulate drag-drop onto the canvas: dispatch `dragover` + `drop` on `.graph-pane`
  with a `DataTransfer` whose key is `filepath` (see `client/src/lib/drag.ts`) set to
  the absolute file path.
- Zoom: plain wheel **pans** (panOnScroll); `ctrlKey: true` wheel zooms. Zoom is
  clamped to ≈1.25× per wheel event (`graphPinchZoom.ts`). "Fit to screen" resets.
- Simulating a node resize drag: React Flow's resize control uses d3-drag, which
  listens for **mouse** events — dispatch `mousedown` on
  `.react-flow__resize-control`, then `mousemove`/`mouseup` on `window`
  (PointerEvents do nothing).
- Method rows expand on click (member row label inside `.react-flow__node`); node
  labels are camelCase-split for display ("mergeGraphData" renders as "merge Graph
  Data") — match accordingly.
- Class node logic is split out of `ClassNode.tsx` (thin render) into hooks:
  `useClassNodeCommit` (the single node writer), `useClassNodeMembers` (toggles),
  `useClassNodeResize` (snap resize), composed by `useClassNodeController`; the
  `MemberSection` sub-component is its own file. Keep ClassNode.tsx render-only.
- Class node resize is **live snap-to-content** (`useClassNodeResize.ts` +
  `classNodeLayout.ts`): the box height ALWAYS equals the open content, so content can
  never overflow the container and the handle can never be dragged into empty space.
  `onResize`/`onResizeEnd` (via `commitNode`) are the single writer of height — they map the drag distance to an
  open-set via `fitLayoutToHeight`, then commit `computeClassNodeHeight(fitted)` (this
  overrides React Flow's raw drag height every frame). Do NOT read the resizer's live
  `height` NodeProp into the card and do NOT put a CSS `height` transition on the card:
  either one feeds React Flow's ResizeObserver back into a commit and the resulting
  render loop trips "max update depth" and unmounts the graph. A `useLayoutEffect`
  refines the resting height to the measured DOM (guarded by `isDragging`, deps must
  exclude the `height` prop). Body is `flex-1 overflow-hidden` as a hard clip. Members
  open/close strictly top→bottom; shrinking closes eagerly so a row is never clipped.
- Ctrl-hover only lights up **indexed** tokens, i.e. class and method names, and only
  when a method body is expanded (collapsed rows have no code tokens). Variables and
  properties are not in the server symbol index, so they never light up — extending
  that requires indexing them in `server/src/parser.ts`.
- The server API is plain GET — `curl "http://localhost:3001/api/focus?path=<abs>&depth=1"`
  is the fastest way to assert parser output without touching the UI.
