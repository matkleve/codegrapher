# Known spec ↔ code drift

**Status:** Open — one planned feature not yet in code.

Last updated: 2026-07-10

Per [GOVERNANCE-MATRIX.md](GOVERNANCE-MATRIX.md), implementation and specs must not diverge silently. Flag mismatches here until resolved in the same PR as the doc or code change.

---

## 1. Shift+click accumulate pins (multi-pin)

| Source | Says |
| ------ | ---- |
| `docs/glossary.md`, `preview-edges.md`, interactions supplement | **Shift+click** adds a pin without clearing prior pins; plain click replaces pin set |
| **Code** | Single `pinnedTokenKey` + `pinnedPreviewEdges`; `pinTrace` always replaces |

**Implementation notes when building:**

- Store `pinnedTokenKeys: string[]` (or set) + merged `pinnedPreviewEdges`
- `mergeTraceLit` across all pinned keys for dim/lit paint
- Context bar: show most recently pinned token until multi-pin UI exists
- Shift+click an already-pinned token: toggle that pin off (recommended)

---

## Recently resolved

| Item | Resolution |
| ---- | ---------- |
| Brand accent gold vs cyan | Code + docs aligned on gold (`--brand` hue ~88). |
| Pin trigger Ctrl-click vs plain click | **Plain click** pins; Ctrl is reveal-only (dims keywords, instant hover). |

---

## Resolution

When a row is open, delete it from this file and land the matching doc + code change in one PR.
