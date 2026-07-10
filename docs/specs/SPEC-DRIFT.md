# Known spec ↔ code drift

**Status:** No open drift items.

Last updated: 2026-07-10

Per [GOVERNANCE-MATRIX.md](GOVERNANCE-MATRIX.md), implementation and specs must not diverge silently. Flag mismatches here until resolved in the same PR as the doc or code change.

---

## Recently resolved

| Item | Resolution |
| ---- | ---------- |
| Shift+click accumulate pins (multi-pin) | `pinnedTraces[]` + Shift+click accumulate/toggle; breadcrumb chips in `TokenContextBar` |
| Load connector (external symbol → load) | `LoadConnector` + `buildLoadPreviewEdge` on external hover |
| Long-hover info box (transient) | `INFO_DELAY_MS` + transient `TokenContextBar` mode |
| Brand accent gold vs cyan | Code + docs aligned on gold (`--brand` hue ~88). |
| Pin trigger Ctrl-click vs plain click | **Plain click** pins; Ctrl is reveal-only (dims keywords, instant hover). |

---

When a row is open, delete it from this file and land the matching doc + code change in one PR.
