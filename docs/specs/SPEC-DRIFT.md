# Known spec ↔ code drift

**Status:** Open — requires human decision before docs or code are changed.

Last updated: 2026-07-10

Per [GOVERNANCE-MATRIX.md](GOVERNANCE-MATRIX.md), implementation and specs must not diverge silently. These items are flagged intentionally; do not "fix" one side without updating the other.

---

## 1. Pin trigger: Ctrl-click vs plain click

| Source | Says |
| ------ | ---- |
| `docs/glossary.md` | "Ctrl-click or wire hit-zone click locks…" |
| `docs/specs/system/preview-edges.md` | Action 5: "Ctrl-click token" → pin |
| `docs/specs/system/preview-edges.interactions.supplement.md` | State machine: "Ctrl-click token / wire end" |
| **Code** | `CodeLine.tsx` `onIdentifierClick` — no `isCtrlPreviewMode` guard; any click on an interactive token pins and opens `TokenContextBar` |

**Decision needed:** Revert code to Ctrl-only pin (match specs + prototype), or update all specs/glossary to "click token to pin".

---

## 2. Brand accent: gold (docs) vs cyan (code)

| Source | Says |
| ------ | ---- |
| `docs/design/tokens.md`, `interaction-emphasis.md`, `glossary.md` | "brand **gold**" in both themes |
| `client/src/lib/controlTokens.ts` | Comment: "Brand-**cyan** hover" |
| `client/src/index.css` `:root` / `.dark` | `--brand: oklch(… 220)` — sky-cyan hue in **both** themes |

**Decision needed:** Revert `--brand` to gold (oklch ~86–98 hue) and keep docs, or rename docs/design tokens to "brand cyan" and treat gold as superseded.

---

## Resolution

When a row is resolved, delete it from this file and land the matching doc + code change in one PR.
