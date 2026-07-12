# Visual strength stacks

**Terminology:** **graph distance** from the focus token. Walk caps: `TRACE_DEPTH_DOWN` / `TRACE_DEPTH_UP` (or project equivalent). **Brightness:** two power curves in `traceDepth.ts` — **focus/rest** vs **pointer hover** — plus hop-1 snaps.

Copy with the agent playbook. Constants live in project `traceDepth.ts` (or equivalent).

---

## Canonical model

```
focus token = distance 1
     │
     ├─► child direction  (maxDepth downstream)
     └─► parent direction (maxDepth upstream)
     │
     ▼
every summoned wire / chip / socket / lit line gets distance d
     │
     ├─► focus/rest     → tracePathOpacity(d)          [steep; floor ~0.2]
     └─► pointer hover  → traceEmphasisPathOpacity(d)  [flatter; floor ~0.58]
```

| State | When | Brightness |
| ----- | ---- | ---------- |
| **Idle** | No trace | Resting semantic ink; wires hidden |
| **Focus** | `traceTokenKey` set; pointer not on this element | Focus curve + hop-1 snaps |
| **Hover** | `token-chip-hover-preview` or wire `emphasized` | Hover curve + hop-1 snaps |
| **Non-lit syntax** | Trace on, line not in `litLineDepth` | `--faint` (binary; off-curve) |

**Session rule:** committed trace brightness MUST NOT drop when the pointer leaves a panel (`isTraceSessionActive`).

**Hover > focus invariant:** at every distance `d`, hover brightness MUST exceed focus brightness on the same surface.

**Hop-1 snaps** are intentional — they create a clear gap between resting trace and pointer emphasis without a third parallel system (no backdrop layer, no CSS filter boost).

---

## Emission paths (codegrapher)

Same numbers, two mechanisms — main source of implementation complexity:

| Surface | Distance from | Emission | File |
| ------- | ------------- | -------- | ---- |
| Preview wire path + glow | `PreviewEdgeSpec.hop` | SVG `opacity` | `previewEdgeDom.ts` |
| Token chip + socket | `traceDepth` map | `--trace-strength` + `color-mix` | `traceLitApply.ts`, `trace-chip-lit.css` |
| Lit `.code-line` | `litLineDepth` map | `--trace-strength` | `traceLitApply.ts` |
| Load stub | `edge.hop` | `--trace-strength` | stub host |
| Non-lit keywords | — | `--faint-*` CSS | `trace-syntax.css` |

**Hue** comes from connection kind / token kind (`--edge-usage`, `--token-surface-*`). **Brightness** comes from distance + situation (focus vs hover).

**Lit chips:** never use element `opacity` for distance — only `--trace-strength` tints fill and ink. Keeps sockets and text crisp.

---

## Tuning knobs (template)

| If you want… | Knob |
| ------------ | ---- |
| Dimmer distant focus hops | ↓ focus floor or ↑ focus curve exponent |
| Brighter distant hover hops | ↑ hover floor or ↓ hover curve exponent |
| Bigger hover-vs-focus gap at hop 1 | ↓ hop-1 focus snap (wire/chip) |
| Wires louder than chip fill | ↓ chip provenance ratio or hop-1 chip snap |
| Less wire halo | ↓ glow path ratio |
| Trace walks further | ↑ `maxDepth` upstream/downstream (separate from curve) |

Consolidate constants in one `TRACE_TUNING` object when refactoring — avoids hunting 12 exports.

---

## Invariants

1. **Two curves** — focus/rest and pointer hover; same formula, different floor/curve/snaps.
2. **Distance is continuous** 1…maxDepth — not a fixed 3-step enum.
3. **Dim non-participants via ink** (`--faint`), not container wash or element opacity on lit chips.
4. **Glow = path × ratio** — glow always weaker than path at the same distance.
5. **Hover > focus** at every hop for wires and chips.
6. **Wire-under-cursor** uses hover curve (`emphasized=true`); may also add stroke-width.

---

## Anti-patterns

| Anti-pattern | Why it fails |
| ------------ | ------------ |
| Backdrop snap (e.g. non-emphasized wires → 0.36) | Relatives look wrong; fights distance curve |
| `filter: brightness()` boost layer | Duplicates curve; hard to tune with wires |
| Element `opacity` on lit chips | Dims sockets/text; use `--trace-strength` instead |
| Different distance maps for pointer vs session | Same `d` must mean same graph step everywhere |
| CSS glow default fighting inline wire opacity | Glow reads as "shadow" not line strength |
| `token-chip-endpoint-sibling` fixed % fighting `--trace-strength` | Two sources of truth for same chip |

---

## Known gaps (codegrapher, 2026-07)

- Dual emission (SVG opacity vs CSS var) — unify under `--trace-strength` when refactoring.
- `CHIP_HOVER_PREVIEW` in `applyEndpointHost` only at depth 1 — hop 2+ relies on boost pass (fragile order).
- Strength CSS requires `.token-chip-lit.token-chip-on` — lit non-endpoint tokens may miss fill rules.
- Module globals in `wireHoverBoost.ts` — target `TraceStrengthContext` (see refactor plan).

---

## Spec checklist

- [x] Document `maxDepth` upstream/downstream knobs
- [x] Focus + hover curves documented with constants table
- [x] Table: surface → distance source → emission file
- [ ] AC verified: hover wire/chip brighter than focus at same hop
- [ ] AC verified: session survives pointer leaving card
- [ ] Single `TRACE_TUNING` object in code (optional refactor)

---

## References (codegrapher)

- Spec: `docs/specs/system/preview-edges.trace-strength.supplement.md`
- Implementation: `client/src/lib/traceDepth.ts`, `traceLitApply.ts`, `previewEdgeDom.ts`
- Walk: `client/src/lib/lexicalGraph.ts`
- Refactor plan: `docs/project/trace-strength-refactor-plan.md`
