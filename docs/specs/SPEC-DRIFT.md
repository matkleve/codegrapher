# Known spec ↔ code drift

**Status:** Doc sync PR 2026-07-11 — see "Recently resolved". **Open product decisions** below need your call.

Per [GOVERNANCE-MATRIX.md](GOVERNANCE-MATRIX.md), implementation and specs must not diverge silently. Flag mismatches here until resolved in the same PR as the doc or code change.

---

## Open questions (needs product decision)

| # | Question | Current state | Options |
| --- | -------- | ------------- | ------- |
| 1 | **Simulation step-into / step-over** | Spec'd in `execution-simulator.md` AC; not implemented | **A)** Build next (loop-aware walk + callee descent) · **B)** Demote AC to deferred and hide menu items until built |
| 2 | **Per-edge wire tooltips** | `connection-taxonomy.md` AC open; `ConnectionLegend` covers kinds | **A)** Add hover tooltip on wire hit-zones · **B)** Legend-only is enough — close AC |
| 3 | **Path highlight scope** | Shortest path over React Flow structural edges only | **A)** Keep (module/DI graph) · **B)** Extend to include usage preview relationships (much harder) |

**Resolved in this pass (no further action):** Load stub wires **stay** alongside `TokenConnectionMenu` (dashed = elsewhere; menu = load action). Floating Load pill stays removed.

---

## Recently resolved

| Item | Resolution |
| ---- | ---------- |
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
| Wires froze during node drag/resize | `onNodesChange` was passed raw, so dragging/resizing a card (nodes are `nodesDraggable`) never nudged the wire engine — wires stayed stale until the next viewport move. `GraphFlowCanvas` now notifies the engine on `position`/`dimensions` changes, completing the re-measure trigger set (documented in `preview-edges.interactions.supplement.md`). |
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

---

When a row is open, delete it from this file and land the matching doc + code change in one PR.
