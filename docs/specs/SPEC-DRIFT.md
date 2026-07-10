# Known spec ↔ code drift

**Status:** Open — planned features not yet in code.

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

## 2. Load connector (external symbol → load into graph)

| Source | Says |
| ------ | ---- |
| `token-interactions.md` (⚠ rows), `docs/prototypes/connectors-proto.html` | Hovering an indexed token whose definition is **not** in the graph shows a dashed **Load** pill wired to the token; clicking it calls `onLoadFile` → `/api/focus` and pulls the definition in |
| **Code** | `resolveVisibleTarget` returns `mode:"external"`; surfaced only via the bottom `TokenContextBar`, not as an inline connector |

**Implementation notes when building:**

- Render the Load pill as an overlay peer of the preview wire (socket + short dashed stub), positioned beside the token, overflow-aware (flip to the left when no room)
- Kind-colored, **dashed** border = "not yet in graph"
- Click → `onLoadFile(entry.filePath)`; on success the new node appears and the trace re-resolves to a normal in-graph edge

## 3. Long-hover info box (transient)

| Source | Says |
| ------ | ---- |
| `token-interactions.md` (Action 9), prototype | An extended dwell (no click) opens the info box transiently; it closes on leave unless pinned |
| **Code** | Info box opens on **pin** (click) only |

---

## Recently resolved

| Item | Resolution |
| ---- | ---------- |
| Brand accent gold vs cyan | Code + docs aligned on gold (`--brand` hue ~88). |
| Pin trigger Ctrl-click vs plain click | **Plain click** pins; Ctrl is reveal-only (dims keywords, instant hover). |

---

## Resolution

When a row is open, delete it from this file and land the matching doc + code change in one PR.
