# Visual strength stacks

**Terminology:** **graph distance** from the focus token. Walk caps: `TRACE_DEPTH_DOWN` / `TRACE_DEPTH_UP` (or project equivalent). Brightness: **one curve** `tracePathOpacity(distance, maxDepth)`.

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
     ▼
brightness(d) = tracePathOpacity(d, maxDepth)   // ONE curve, ALL lit surfaces
```

| State | When | Brightness |
| ----- | ---- | ---------- |
| **Idle** | No trace | Resting semantic ink; wires hidden |
| **Trace** | `traceTokenKey` set (dwell or pin) | `tracePathOpacity(d)` per element distance |
| **Non-lit syntax** | Trace on, line not in `litLineDepth` | `--faint` (binary; off-curve) |

**Session rule:** committed trace brightness MUST NOT drop when the pointer leaves a panel (`isTraceSessionActive`).

**Do not** add parallel snap opacities (backdrop, emphasis-to-1.0, session-at-0.8) — they break the curve.

---

## Surface map (template)

| Surface | Distance from | Emission |
| ------- | ------------- | -------- |
| Preview wire path + glow | `PreviewEdgeSpec.hop` | `traceWireOpacity(d)` inline |
| Token chip + socket | `traceDepth` map | `traceLitApply.applyDepth` |
| Lit `.code-line` | `litLineDepth` map | same `applyDepth` (syntax inherits) |
| Load stub | `edge.hop` | inline opacity |
| Non-lit keywords | — | `--faint-*` CSS |

**Hue** comes from connection kind / token kind (`--edge-usage`, `--token-surface-*`). **Brightness** comes only from distance on the curve.

---

## Invariants

1. **One function** for lit-surface opacity — wires, chips, sockets, lit lines.
2. **Distance is continuous** 1…maxDepth — not a fixed 3-step enum.
3. **Dim non-participants via ink** (`--faint`), not container wash.
4. **Glow = path × ratio** — no separate snap glow table.
5. **Wire-under-cursor** may add stroke-width only; opacity stays on-curve.

---

## Anti-patterns

| Anti-pattern | Why it fails |
| ------------ | ------------ |
| `emphasized → opacity 1`, `backdrop → 0.36` | Snaps off the curve; relatives look wrong |
| Different curves for chips vs wires | Same distance reads different strength |
| `hoveredTokenKey` changes wire opacity without changing `hop` | Opacity must follow distance, not pointer |
| CSS glow default fighting inline opacity | Glow reads as "shadow" not line strength |

---

## Spec checklist

- [ ] Document `maxDepth` upstream/downstream knobs
- [ ] One `tracePathOpacity(depth)` owns lit brightness
- [ ] Table: surface → distance source → emission file
- [ ] AC: distance-2 wire brighter than distance-5 at same maxDepth
- [ ] AC: session survives pointer leaving card

---

## References (codegrapher)

- Spec: `docs/specs/system/preview-edges.trace-strength.supplement.md`
- Implementation: `client/src/lib/traceDepth.ts`, `traceLitApply.ts`, `previewEdgeDom.ts`
- Walk: `client/src/lib/lexicalGraph.ts`
