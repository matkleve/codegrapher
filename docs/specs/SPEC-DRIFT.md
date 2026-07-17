# Known spec ↔ code drift

**Status:** Doc sync PR 2026-07-11 — see "Recently resolved". **Open product decisions** below need your call.

Per [GOVERNANCE-MATRIX.md](GOVERNANCE-MATRIX.md), implementation and specs must not diverge silently. Flag mismatches here until resolved in the same PR as the doc or code change.

---

## Open questions (needs product decision)

| # | Question | Current state | Options |
| --- | -------- | ------------- | ------- |
| 1 | **Simulation step-into / step-over** | Spec'd in `execution-simulator.md` AC; not implemented | **A)** Build next · **B)** Demote AC to deferred |
| 2 | **Path highlight scope** | Shortest path over React Flow structural edges only | **A)** Keep · **B)** Extend to usage preview |
| 3 | **Scenario node placement (S2)** | **Decided: canvas overlay** — `execution-simulator.vision.supplement.md` | — |
| 4 | **Anchor UX (S1.5)** | Two-click line numbers; cross-class end → reachability warning | **A)** Replace modifiers · unreachable end prompts scenario |
| 5 | **Off-canvas callee** | **Decided: suggest Mock** + Load fallback | — |
| 6 | **S1 transport** | **Implemented** — discrete tick strip (`SimStepTickStrip`), Start/Δ/End panel | — |

## Simulation interaction UX (spec'd 2026-07-11)

| Item | Status |
| ---- | ------ |
| Disarm / Clear setup / Stop and clear / Esc when armed | **Implemented** — `disarmTrace`, `SimTraceBanner`, Esc handler |
| Implicit end range shade + panel label | **Implemented** — `simTraceBounds.ts`, `traceRangeLabel` |
| Context menu `methodStartLine` | **Implemented** — `CodeLine.tsx` |
| Saved paths `methodStartLine` | **Implemented** — new saves; legacy paths alert on Run |
| Gutter ▶/■ hidden during active run | **Implemented** — `lineGutterRole` |
| Hover trace during sim | **Coexists** (by design) — see interactions index |

**Resolved in this pass (no further action):** Load stub wires **stay** alongside `TokenConnectionMenu` (dashed = elsewhere; menu = load action). Floating Load pill stays removed.

---

## Recently resolved

| Item | Resolution |
| ---- | ---------- |
| On-canvas value layer (C1/C2) shipped | New spec [execution-simulator.canvas-values.supplement.md](system/execution-simulator.canvas-values.supplement.md) designs the on-canvas debugger (flow points, substeps, synchronized arrival, shimmer fallback). **C1** (inline value pills — `inlineValuesForStep`, `styles/simulation.css`) and **C2** (read/write token lighting) implemented + verified live: stepping `checkout` shows `amount = ~this.orders.get(id)` on the current line, `id` lit read / `amount` lit write. C3+ (flow points, substeps, watch) specced, not yet built. |
| Def fan-out did not light usage chips (sig-types stayed faint; expanded body chips missed) | Tracing a type/class lit the source + wire but left usage chips faint. Two gaps in `resolveDefinitionUsageSites`: (1) **signature-type usages** render as `…::sig-type::<token>` chips, not body-line chips, so the line scan never reached them — added a DOM pass that emits a site with `liveTo.traceKey = sig-type key` (resolveHint keys off it). (2) both the graph scan **and** `usageSiteIndex` used code-relative `i+1` line numbers, which never match the file-absolute chip keys — now `fileLineFromSnippetIndex(method.startLine, i)`. Verified live: pinning `Address` lights the def + both sig-type usage chips (`token-chip-lit`+`-on`). Honours the reveal waterfall (collapsed → container, expanded → smallest unit). |
| Debugger gutter never rendered; sim produced 0 steps | Two bugs made the simulator workspace non-functional. (1) `signatureLine = code.split("\n")[0]` was blank (the parser prefixes method `code` with trivia lines), gating out `SimGutterControl` and breaking `extractParamNames` — now the first **non-blank** line. (2) The static-walk engine is **code-relative** but the gutter/anchors are **file-absolute**, so `buildStepList` received file lines as indices → empty walk — `buildSession` now converts via a new `SimAnchor.methodStartLine`. Verified live: 3-step walk, PC on the correct file lines (27→28→29), ledger reads/writes/calculated correct. Convention recorded in `execution-simulator.workspace.supplement.md`. |
| Glossary stale (indexed = class/method only; structural/sim "not implemented") | Updated `docs/glossary.md` — scoped index, structural edges, static walk, Load stub, TokenConnectionMenu |
| `system/README.md` stale ("not yet implemented", structural rendering undecided) | Updated to reflect shipped taxonomy + static walk; structural layer in `PreviewEdgeOverlay` |
| `preview-edges.philosophy.supplement.md` "properties/locals inert" | Rewrote indexed vs interactive table; moved variables/properties to shipped |
| Use-cases U12/U13 Load pill | Updated `token-interaction-use-cases.md` — menu + stub wire; added U16/U17 |
| Shift+pin marked *(planned)* in preview-edges / interaction-emphasis / supplement | Removed planned markers; `pinnedTraces[]` is normative |
| `linksForElement.ts` file map references | Point to `localDefLinks.ts`, `buildDefinitionPreviewEdges.ts`, `controlFlowPreviewEdges.ts` |
| `token-interactions.md` "no stub wire" vs code | Aligned: stub wire + menu coexist; pill removed |
| Module import toggle location | AC updated: `ConnectionLegend` canvas overlay, not graph header |
| Missing graph chrome spec | Added `component/graph-chrome.md` |
| `ego-graph-model.md` thin on history + path | Added Last/Next graph, path scope note |
| Parent preview-edges AC unchecked | Marked [x] per child AC + implementation |
| `connection-taxonomy.md` said structural edges were "not yet implemented" / `extends`/`implements` "never emitted" | Stale — `addExtendsEdges`/`addImplementsEdges`/`addCompositionEdges` are implemented in `server/src/parser.ts` and rendered via `PreviewEdgeOverlay`'s structural layer, matching the child `connection-taxonomy.acceptance-criteria.md` (which already correctly listed these as `Status: implemented`). Corrected "What It Is" and "Where It Lives" in the parent spec. |
| Wires froze during node drag/resize | `onNodesChange` was passed raw, so dragging/resizing a card (nodes are `nodesDraggable`) never nudged the wire engine — wires stayed stale until the next viewport move. `GraphFlowCanvas` now notifies the engine on `position`/`dimensions` changes, completing the re-measure trigger set (documented in `preview-edges.anchoring.supplement.md`, split from `preview-edges.interactions.supplement.md` 2026-07-17). |
| Local param wires lit but did not render in expanded bodies | `refinePreviewEdge` re-resolved `liveFrom` definition hints through `resolveDefinitionSiteAnchor`, which ignored `traceKey` and used snippet-relative line numbers for handle fallbacks. Fixed: traceKey-first resolution, file-absolute line numbers via `memberFileLine.ts`, and `liveFromDefEl` now carries `lineNumber`. |
| Simulation mode cleared in-body preview wires on entry | Removed `endHoverPreview()` on `simActive` — local Usage traces now coexist with simulation chrome. |
| Reveal re-lit only the wire, not the keywords | `computeTraceLit` recomputed on `revealRevision` (which bumps during render, before revealed chips mount), so it resolved against stale DOM and lit nothing while the wire's rAF loop self-healed. Made the element registry observable (`subscribeRegistry`, rAF-coalesced) and added `registryRevision` to the lit memos, so lit recomputes after chips mount. Fulfils the `preview-edges.md` AC "expand callee: usage TokenChip gets lit/on (not wire-only)". |
| Load pill removed; menu is sole load **action** surface | Deleted `LoadConnector` floating pill. `buildHoverLoadMenu` shows for N=1. **Dashed Load stub wires remain** for off-canvas targets (locality signal). `token-interactions.md` + supplement updated. |
| Static-walk scope indexing | `scopeAtStep` now selects by source line number and walks the whole body from line 1; per-step values are correct at any trace start line. Regression test added (`staticWalk.test.ts`). |
| Value-flow pulse was degenerate | Pulse resolves the callee via `resolveVisibleTarget` and travels line→callee (returns → node header); unresolved steps emit no pulse instead of a self-edge. |
| Loop cap mislabeled | Removed the bogus 100-tick cap; finite walk stops at the last recorded step. Spec AC reworded; per-iteration cap deferred with loop-aware walk. |
| ThemeToggle relocated to explorer footer | Code moved toggle out of graph header into `FileExplorer`; `app-shell.md` + `CLAUDE.md` updated to match. |
| Execution simulator "not yet implemented" (index README) | Option A static walk is shipped — index + cross-references corrected. |
| "No test suite yet" claim | Vitest suite exists (`npm test`); `CLAUDE.md` updated. |
| Shift+click accumulate pins (multi-pin) | `pinnedTraces[]` + Shift+click accumulate/toggle; breadcrumb chips in `TokenContextBar` |
| Long-hover info box (transient) | `INFO_DELAY_MS` + transient `TokenContextBar` mode |
| Brand accent gold vs cyan | Code + docs aligned on gold (`--brand` hue ~88). |
| Pin trigger Ctrl-click vs plain click | **Plain click** pins; Ctrl is reveal-only (dims keywords, instant hover). |
| Per-edge wire tooltips | **Superseded 2026-07-17** — the jump tip on wire hit-zone is removed; jump-to-endpoint lives exclusively in `TokenConnectionMenuPanel` (right-click either endpoint token), which already covered the same targets. Wire click now opens the data inspector instead. See [signal-wire-port-plan.md](../project/signal-wire-port-plan.md). |
| Wire reveal/retire timing said 240ms draw / 100ms hop stagger / 25ms fan tie / 80ms retire fade in specs, but shipped code used 120ms/120ms/14ms and an opacity fade, not the numbers or mechanism the specs described | **Resolved 2026-07-17** — both were replaced together: new value is 420ms (`wireRevealMs` = `wireHopStaggerMs`), fan tie stays 14ms, and retire is now a consume sweep (see [signal-window supplement](system/preview-edges.signal-window.supplement.md)), not a fade at any duration. Caught by hovering the real app with Playwright and measuring actual `stroke-dasharray`/`opacity` over time rather than trusting either the old spec prose or a read of the code alone — worth remembering as a class of bug: **spec says X, code does Y, and code review alone won't catch it.** |
| Keyboard focus trace | Focus on indexed token fires instant trace (no dwell); Enter pins. |
| Trace strength stack undocumented (session/emphasis/backdrop) | **Resolved 2026-07-12** — dual curve (focus vs hover) in trace-strength supplement + playbook. Backdrop layer removed from code. |
| Chip strength emission | **Resolved 2026-07-12** — `--trace-strength` + `color-mix` in `traceLitApply.ts`; not element opacity. |
| Fixed trace-strength steps vs dynamic curves | **Resolved 2026-07-12** — docs use **hop** / **graph distance** + `tracePathOpacity` / `traceEmphasisPathOpacity`. |
| Pending dwell / motion clock / wire glow ownership | **Resolved 2026-07-12** — `graph-trace-pending`, `--motion-trace` (120ms), visual commit timeline in interactions supplement; glow+path dash in `wireReveal.ts`; load stub `data-load-stub-ready`. |

---

## Open refactor (code, not product decision)

Tracked in [trace-strength-refactor-plan.md](../project/trace-strength-refactor-plan.md):

| PR | Topic | Status |
| -- | ----- | ------ |
| 1 | Spec + playbook dual-curve model | Done |
| 2 | Glow single authority | Partial |
| 7 | Chip `--trace-strength` emission | Done (chips); wire unify open |
| 8 | Fragile-path fixes (hover-preview depth, sibling CSS) | Open |
| 3–6 | Context split, boost merge, subgraph emphasis | Open (optional) |
| 9 | Manual visual AC | Open |

---

When a row is open, delete it from this file and land the matching doc + code change in one PR.
