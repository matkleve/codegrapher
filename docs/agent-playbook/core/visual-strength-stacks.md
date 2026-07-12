# Visual strength stacks

**Terminology:** **hop** / **graph distance**. `PreviewEdgeSpec.hop` is omitted at distance 1; opacity from `tracePathOpacity(depth)` in `traceDepth.ts`.

Copy this doc with the agent playbook. Project-specific constants live in that
project's specs and `traceDepth.ts` (or equivalent).

---

## Problem this solves

A single "opacity from distance" function breaks when you add:

- **Committed selection** (pin, dwell trace) that must survive pointer leaving a panel
- **Pointer emphasis** (hover on one branch) within an active selection
- **Backdrop recede** (non-emphasized items dim while one branch pops)

Without a documented stack, each bugfix adds a branch (`if lit`, `if hovered`,
`if left card`) and specs drift from code.

---

## Canonical model (three axes)

Strength is **not** one enum. It is the combination of:

| Axis | Question | Typical states |
| ---- | -------- | -------------- |
| **Session** | Is a trace/selection committed? | `idle` \| `active` |
| **Pointer** | Is the pointer emphasizing a specific member? | `none` \| `token` \| `edge` |
| **Distance** | Graph hops from focus | `1` … `maxDepth` |

**Derived modes** (use these names in specs and code comments):

| Mode | Session | Pointer | Distance applies? |
| ---- | ------- | ------- | ----------------- |
| **Idle** | off | — | no |
| **Trace** | on | none | yes — hop decay |
| **Emphasis** | on | token or edge | yes — flatter curve + backdrop |

### Invariants (normative)

1. **Session independence:** committed trace strength MUST NOT change when the
   pointer moves between panels (e.g. leaving a card while pin/dwell is active).
2. **Lit member protection:** endpoints already lit by the trace MUST NOT drop
   below trace baseline when pointer emphasizes another branch.
3. **Single emission path:** each surface (chip, wire, row) has one function that
   maps `(session, pointer, distance)` → opacity/classes — not parallel CSS and
   inline logic fighting each other.
4. **Dim non-participants via ink, not wash:** inactive text uses semantic faint
   tokens (`--faint`, `--faint-ctrl`); avoid `opacity` on containers during trace.
5. **Glow authority:** wire/path glow opacity is set in one place (prefer JS inline
   or one CSS custom property). Do not leave a low default in CSS that JS must
   override with `!important`.

---

## Surface rules (template)

Fill in project tokens; keep the shape.

| Surface | Idle | Trace (session) | Emphasis (pointer on branch) |
| ------- | ---- | ----------------- | ---------------------------- |
| Non-lit text | normal ink | `--faint` | `--faint` |
| Lit endpoint chip | — | semantic fill + full ink | pointer endpoint: `hover-preview`; other lit: **trace baseline** |
| Provenance chip (hop ≥ 2) | — | `trace-depth-faded` + hop opacity | same baseline unless pointer is on that chip |
| Wire (direct to pointer) | — | hop opacity | full path + strong glow |
| Wire (other, trace active) | — | hop opacity | backdrop (~50% path) |
| Control-flow wire | — | distance 1, kind hue | distance 1 (no hop decay) |

---

## Architecture (recommended)

```text
TraceStrengthContext          ← single source of truth
  sessionActive: boolean
  pointerTokenKey: string | null
  pointerWireId: string | null
        │
        ├─► traceLitApply (chips, sockets, lines)
        ├─► previewEdgeDom (wires, rAF)
        └─► LoadStubAnchor / other overlays
```

### Anti-patterns

| Anti-pattern | Why it fails |
| ------------ | ------------ |
| One React state key for dwell **and** pointer emphasis | Every dwell becomes "emphasis"; hover ≈ focus |
| Module globals synced from React | rAF and React get out of phase; skip optimizations miss updates |
| `--my-opacity` in spec but inline `style.opacity` in code | Agents add the wrong mechanism |
| Per-bug `TRACE_*` constants | 10+ tunables with no model; regressions compound |
| CSS `opacity: 0.12` default + JS override + `!important` | Glow looks identical across modes |

### Refactor order (when cleaning up)

1. **Document** the stack in the owning spec (session × pointer × distance).
2. **Introduce** `TraceStrengthContext` (or equivalent) — pass to lit + wire paths.
3. **Split** `dwellToken` vs `pointerToken` if they share one key today.
4. **Unify** opacity emission (`--trace-strength` per element or inline only).
5. **Merge** duplicate boost/apply functions in the lit controller.
6. **Wire emphasis** by subgraph (BFS 1–2 hops), not only edges touching pointer.
7. **Add** visual regression AC (pin + leave panel, direct vs indirect wire hover).

---

## Spec checklist (new project)

When adding trace/highlight behavior to a spec:

- [ ] Name the three axes (session, pointer, distance)
- [ ] Table per surface: idle / trace / emphasis
- [ ] State invariants (session survives pointer leave)
- [ ] Opacity mechanism: CSS var name **or** inline — pick one and document
- [ ] AC: pointer leaves container while session active — strength unchanged
- [ ] AC: pointer on branch — direct vs indirect visually distinct
- [ ] AC: lit endpoints not dimmed below trace baseline during emphasis
- [ ] File map: single `*Depth.ts` or `*Strength.ts` owns curves and constants

---

## Testing

| Test type | What to assert |
| --------- | -------------- |
| Unit | `tracePathOpacity`, `traceWireOpacity` at depth 1…N in baseline vs emphasis |
| Unit | `edgeTouchesHoveredToken` / subgraph membership |
| Manual | Pin trace, move pointer out of card — wires/chips stay at trace strength |
| Manual | Hover token A, then token B in same trace — A stays lit, B gets preview, wires backdrop |
| Manual | Wire hover — glow on wire + endpoints; non-touching wires recede |

Prefer pure functions in `lib/` for curves; Vitest on those. Interaction stacking
is still manual until component tests exist.

---

## References (codegrapher)

- Spec: `docs/specs/system/preview-edges.trace-strength.supplement.md` § Strength stack
- Spec: `docs/specs/system/interaction-emphasis.md` § Pointer emphasis within trace
- Implementation: `client/src/lib/traceDepth.ts`, `wireHoverBoost.ts`, `traceLitApply.ts`
- Refactor plan: `docs/project/trace-strength-refactor-plan.md`
