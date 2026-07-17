# Connection taxonomy

## What It Is

Defines the distinct *kinds* of relationship two graph elements can have, and the visual language (line style, color family, arrowhead, opacity) that keeps multiple kinds legible on one canvas at once. All eleven kinds below are implemented — see the per-kind `Status` markers in [connection-taxonomy.acceptance-criteria.md](connection-taxonomy.acceptance-criteria.md) for exact scope/known gaps per kind.

## What It Looks Like

Four independent visual dimensions combine per kind, so kinds never have to fight over a single signal:

| Dimension | Values |
| --------- | ------ |
| Line style | solid · dashed · dotted |
| Path geometry | cubic (data/value) · orthogonal (control flow, typesetting) |
| Color family | per-relationship-category hue (distinct from today's per-token-kind hue) |
| Arrowhead | none · open · filled · hollow triangle (UML is-a) · filled diamond (UML has-a) |
| Opacity / thickness | full for 1-hop; stepped decay for 2+ hop (transitive **and** provenance — see [trace-strength supplement](preview-edges.trace-strength.supplement.md)) |

Today's usage preview edge (dashed, `--edge-usage` blue, open arrowhead, hover-summoned) is **kind 1** below — see [preview-edges.md](preview-edges.md) and [connection-taxonomy.acceptance-criteria.md](connection-taxonomy.acceptance-criteria.md) §1.

## Where It Lives

- **Rendering:** `PreviewEdgeOverlay` (both preview and structural layers), `styles/preview-wires.css`
- **Data (structural edge emission):** `server/src/parser.ts` (`addExtendsEdges`/`addImplementsEdges`/`addCompositionEdges`)
- **Data (client-side edge assembly):** `client/src/lib/buildStructuralEdges.ts`, `client/src/lib/buildTransitiveEdges.ts`

## Actions

| # | Trigger | System Response | Kind |
| --- | ------- | --------------- | ---- |
| 1 | Hover/Ctrl/pin a token (existing) | Dashed usage wire, def → usage | Usage |
| 2 | Both ends of an `extends` relationship on canvas | Solid wire always visible, no hover required | Inheritance |
| 3 | Both ends of an `implements` relationship on canvas | Dotted wire always visible | Implementation |
| 4 | Method row known to override a parent method | Small badge on the row ("↑ overrides X"), **no edge drawn** | Override |
| 5 | Constructor-injected dependency, both classes on canvas | Solid wire, filled-diamond arrowhead at owner end | Composition/DI |
| 6 | Hover/pin a token with 2+ hop reach | Stepped-opacity dashed wires beyond the 1-hop set | Transitive |
| 7 | Hover/pin a shared dependency of two unrelated siblings | Shared highlight color on both siblings, **no edge between them** | Shared-dependency |
| 8 | "Show imports" toggle in **ConnectionLegend** | Thin dotted class-header-to-class-header wire | Module import |
| 9 | Hover/pin a param/local binding or its initializer | Dotted binding wire, initializer → binding | Binding |
| 10 | Hover/pin a `switch`/`if` keyword or its discriminant/condition | Dash-dot wires fan out to every `case`/`else` branch; hovering one branch wires back to the head only | Control flow |
| 11 | Hover/pin param def or body usage with indexed sig-type | Rounded orthogonal dash-dot wire, sig-type chip → param def slot | Typesetting |

## Component Hierarchy

```text
Connection kinds
├── Preview (on-demand, hover-gated — existing contract, unchanged)
│   ├── Usage            — dashed, `--edge-usage` blue, open chevron (def → usage)
│   ├── Binding          — dotted, `--edge-binding` hue, bar cap (initializer → binding), forward dash flow
│   ├── Typesetting      — dash-dot, `--edge-typesetting` (type teal), rounded orthogonal, bracket caps (sig-type ↔ param def), forward dash flow
│   ├── Control flow      — dash-dot, dedicated green hue, filled triangle (condition → branch), junction disc at bus fork
│   └── Transitive        — dashed, stepped opacity, same color family as Usage
├── Structural (persistent once both ends loaded — new, deliberate exception)
│   ├── Inheritance        — solid, hollow triangle arrow
│   ├── Implementation    — dotted, hollow triangle arrow
│   ├── Composition/DI    — solid, filled diamond arrow
│   └── Module import     — thin dotted, toggle-gated
└── Annotation-only (no edge drawn)
    ├── Override          — badge on member row
    └── Shared-dependency  — shared highlight color, no line
```

## Data

| Kind | Direction | Persistent? | Path geometry | Reuses token-kind color? |
| ---- | --------- | ----------- | ------------- | ------------------------- |
| Usage | definition → usage | No (hover-gated) | cubic | No — `--edge-usage` |
| Binding | initializer → binding | No (hover-gated) | cubic | No — dedicated hue (`--edge-binding`), dotted |
| Typesetting | sig-type chip → param def | No (hover-gated) | **orthogonal (rounded corners)** | No — `--edge-typesetting` (type teal), dash-dot |
| Control flow | condition/keyword → branch | No (hover-gated) | **orthogonal** | No — dedicated hue (`--edge-control-flow`) |
| Transitive | definition → N-hop usage | No (hover-gated) | cubic | No — `--edge-usage`, decayed opacity |
| Inheritance | child → parent | **Yes** | No — dedicated hue |
| Implementation | class → interface | **Yes** | No — dedicated hue |
| Composition/DI | owner → dependency | **Yes** | No — dedicated hue |
| Module import | importer → imported | Yes, toggle-gated | No — dedicated hue |
| Override | n/a (badge, not edge) | n/a | n/a |
| Shared-dependency | n/a (highlight, not edge) | n/a | Uses the shared token's color |

## State

| State | Type | Default | Effect |
| ----- | ---- | ------- | ------ |
| `visibleEdgeKinds` | `Set<ConnectionKind>` | usage + binding + typesetting + control flow + structural (except module import) | Per-kind legend toggles; module import off by default |
| `transitiveHopDepth` | number | 2 | Max hop distance shown as decayed-opacity wires |

## File Map

| File | Purpose |
| ---- | ------- |
| `server/src/parser.ts` | Emits `extends`/`implements`/`composition` structural edges |
| `client/src/lib/buildStructuralEdges.ts` | Filters structural edges to mounted graph nodes + visible kinds |
| `client/src/lib/tokenColors.ts` | Per-token-kind color map + structural hues |
| `client/src/lib/localSymbolLinks.ts` | Lexical def/usage map; initializer span for binding wires |
| `client/src/lib/controlFlowLinks.ts` | Line-scanning switch/if-chain index — head keyword, condition identifiers, and case/else branch anchors per method body |
| `client/src/lib/wirePaths.ts` | Path geometry: cubic, orthogonal (branch), rounded orthogonal (typesetting) |
| `client/src/lib/controlFlowPreviewEdges.ts` | `buildControlFlowPreviewEdges` — condition/keyword hover fans out to branches, branch hover wires back to the head |
| `client/src/components/graph/PreviewEdgeOverlay.tsx` | Hover-gated preview + persistent structural wires |
| `client/src/styles/preview-wires.css` | Line-style/arrowhead variants per kind (`--binding` dotted, `--typesetting` dash-dot, `--branch` dash-dot) |

## Acceptance Criteria

Per-kind checklists and build-status markers: [connection-taxonomy.acceptance-criteria.md](connection-taxonomy.acceptance-criteria.md).

Summary (see child doc for full AC per kind):

- [ ] Usage and transitive edges remain purely on-demand (hover/Ctrl/pin) — no regression to `preview-edges.md`
- [ ] Inheritance and composition edges render without requiring a hover, once both endpoint classes are loaded on canvas
- [ ] Inheritance uses a hollow-triangle arrowhead and solid line; implementation uses the same arrowhead with a dotted line; the two are visually distinguishable from each other and from usage edges
- [ ] Composition/DI uses a filled-diamond arrowhead, distinguishable from both inheritance-family arrowheads
- [ ] Transitive (2+ hop) wires render at reduced opacity relative to their 1-hop counterpart, and never exceed `transitiveHopDepth`
- [ ] Override relationships render as a row badge, never as a canvas edge
- [ ] Shared-dependency relationships highlight both siblings in the dependency's color, never draw a line directly between the siblings
- [ ] Module-import wires are hidden by default and only appear when `visibleEdgeKinds` includes them
- [ ] Binding wires show initializer → binding for `const`/`let` declarations (e.g. `result.address` → `addr`)
- [ ] Typesetting wires show sig-type → param def for indexed signature types (e.g. `GeocoderSearchResult` → `result`) using rounded orthogonal paths
- [ ] Control-flow wires fan out from a `switch`/`if` keyword or its condition to every `case`/`else` branch, and wire back to the head only when hovering a single branch; `switch (field)` fans to every `case`/`default` at that switch's own nesting depth, not to nested switches/ifs inside a branch
- [ ] Ternary (`cond ? a : b`) control flow is not yet indexed — tracked as a follow-up, not a v1 gap in this AC list
- [ ] Hovering a property in a `a.b.c` chain (Usage kind) cascades leftward to wire its receiver(s) too; hovering a receiver alone never cascades forward to what it's accessed through — see [preview-edges.fanout.supplement.md](preview-edges.fanout.supplement.md) § Member-access cascade
- [x] Legend toggles are 1:1 with kinds — toggling **Inheritance** hides only `extends` structural wires, not local variable usage/binding preview wires
- [x] Per-edge hover tooltip — **not built**; **ConnectionLegend** + wire hit-zone jump tip are sufficient (see [SPEC-DRIFT.md](../SPEC-DRIFT.md) resolution)

## Child specs

- Per-kind acceptance criteria: [connection-taxonomy.acceptance-criteria.md](connection-taxonomy.acceptance-criteria.md)
- Accessibility (WCAG 1.4.1 / non-text contrast for wires): [../../design/accessibility.md](../../design/accessibility.md)

## Open questions

- Does introducing always-on structural edges need an amendment to the on-demand rule in [system/README.md](README.md), or should it stay scoped as a named, deliberate exception (current framing)?
- Do transitive edges compute eagerly for the whole visible graph, or only fan out from the currently hovered/pinned token (consistent with the existing `usageSiteIndex` precompute pattern)? **Resolved:** on-demand from active token only — see [acceptance-criteria child](connection-taxonomy.acceptance-criteria.md) §2 Transitive.
- Should override badges link to the parent definition (mini preview edge on click) or stay static text? **Resolved:** click summons ephemeral wire — see [acceptance-criteria child](connection-taxonomy.acceptance-criteria.md) §5 Override.

## References

- Preview edge contract (kind 1, unchanged): [preview-edges.md](preview-edges.md)
- Philosophy for why usage stays on-demand: [preview-edges.philosophy.supplement.md](preview-edges.philosophy.supplement.md)
- Design tokens for color assignment: [docs/design/tokens.md](../../design/tokens.md)
