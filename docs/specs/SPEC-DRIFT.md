# Known spec ↔ code drift

**Status:** No open drift items.

Last updated: 2026-07-11

Per [GOVERNANCE-MATRIX.md](GOVERNANCE-MATRIX.md), implementation and specs must not diverge silently. Flag mismatches here until resolved in the same PR as the doc or code change.

---

## Recently resolved

| Item | Resolution |
| ---- | ---------- |
| Static-walk scope indexing | `scopeAtStep` now selects by source line number and walks the whole body from line 1; per-step values are correct at any trace start line. Regression test added (`staticWalk.test.ts`). |
| Value-flow pulse was degenerate | Pulse resolves the callee via `resolveVisibleTarget` and travels line→callee (returns → node header); unresolved steps emit no pulse instead of a self-edge. |
| Loop cap mislabeled | Removed the bogus 100-tick cap; finite walk stops at the last recorded step. Spec AC reworded; per-iteration cap deferred with loop-aware walk. |
| ThemeToggle relocated to explorer footer | Code moved toggle out of graph header into `FileExplorer`; `app-shell.md` + `CLAUDE.md` updated to match. |
| Execution simulator "not yet implemented" | Index (`README.md`) said not implemented; Option A static walk is shipped — index + cross-references corrected. |
| "No test suite yet" claim | Vitest suite exists (`npm test`); `CLAUDE.md` updated. |
| Shift+click accumulate pins (multi-pin) | `pinnedTraces[]` + Shift+click accumulate/toggle; breadcrumb chips in `TokenContextBar` |
| Load connector (external symbol → load) | `LoadConnector` + `buildLoadPreviewEdge` on external hover |
| Long-hover info box (transient) | `INFO_DELAY_MS` + transient `TokenContextBar` mode |
| Brand accent gold vs cyan | Code + docs aligned on gold (`--brand` hue ~88). |
| Pin trigger Ctrl-click vs plain click | **Plain click** pins; Ctrl is reveal-only (dims keywords, instant hover). |

---

When a row is open, delete it from this file and land the matching doc + code change in one PR.
