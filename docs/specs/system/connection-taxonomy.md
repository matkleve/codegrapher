# Connection taxonomy

## What It Is

**Design spec — target state, not yet implemented** (except kind 1, which is today's preview edge). Defines the distinct *kinds* of relationship two graph elements can have, and the visual language (line style, color family, arrowhead, opacity) that keeps multiple kinds legible on one canvas at once.

## What It Looks Like

Four independent visual dimensions combine per kind, so kinds never have to fight over a single signal:

| Dimension | Values |
| --------- | ------ |
| Line style | solid · dashed · dotted |
| Color family | per-relationship-category hue (distinct from today's per-token-kind hue) |
| Arrowhead | none · open · filled · hollow triangle (UML is-a) · filled diamond (UML has-a) |
| Opacity / thickness | full for 1-hop; stepped decay for 2+ hop (transitive) relationships |

Today's usage preview edge (dashed, per-token-kind color, open arrowhead, hover-summoned) is **kind 1** below and stays exactly as specified in [preview-edges.md](preview-edges.md) — this spec only adds new kinds alongside it, it does not change kind 1's contract.

## Where It Lives

- **Existing rendering:** `PreviewEdgeOverlay`, `styles/preview-wires.css` (kind 1 only)
- **New rendering (structural kinds):** not yet built — likely a sibling overlay or a `persistent: true` edge variant on the existing overlay; implementation TBD
- **Data (new edge emission):** `server/src/parser.ts` (`extends`/`implements` — declared in the `GraphEdge` type union today, never emitted), `server/src/indexer.ts`

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
| 8 | "Show imports" toggle enabled | Thin dotted class-header-to-class-header wire | Module import |

## Component Hierarchy

```text
Connection kinds
├── Preview (on-demand, hover-gated — existing contract, unchanged)
│   ├── Usage            — dashed, token-kind color, open arrow
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

| Kind | Direction | Persistent? | Reuses token-kind color? |
| ---- | --------- | ----------- | ------------------------- |
| Usage | definition → usage | No (hover-gated) | Yes |
| Transitive | definition → N-hop usage | No (hover-gated) | Yes, decayed opacity |
| Inheritance | child → parent | **Yes** | No — dedicated hue |
| Implementation | class → interface | **Yes** | No — dedicated hue |
| Composition/DI | owner → dependency | **Yes** | No — dedicated hue |
| Module import | importer → imported | Yes, toggle-gated | No — dedicated hue |
| Override | n/a (badge, not edge) | n/a | n/a |
| Shared-dependency | n/a (highlight, not edge) | n/a | Uses the shared token's color |

## State

| State | Type | Default | Effect |
| ----- | ---- | ------- | ------ |
| `visibleEdgeKinds` | `Set<ConnectionKind>` | Usage only | Which structural kinds render without a hover; module import off by default |
| `transitiveHopDepth` | number | 2 | Max hop distance shown as decayed-opacity wires |

## File Map

| File | Purpose |
| ---- | ------- |
| `server/src/parser.ts` | Would emit `extends`/`implements` edges (currently declared, unused) |
| `client/src/lib/tokenColors.ts` | Existing per-token-kind color map; needs a parallel per-relationship-kind map |
| `client/src/components/graph/PreviewEdgeOverlay.tsx` | Existing hover-gated rendering; structural kinds need a persistent counterpart |
| `client/src/styles/preview-wires.css` | Add line-style/arrowhead variants per kind |

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
- [ ] A legend or per-edge tooltip lets a user identify what a given line style/arrowhead means without consulting this spec

## Child specs

- Per-kind acceptance criteria: [connection-taxonomy.acceptance-criteria.md](connection-taxonomy.acceptance-criteria.md)

## Open questions

- Does introducing always-on structural edges need an amendment to the on-demand rule in [system/README.md](README.md), or should it stay scoped as a named, deliberate exception (current framing)?
- Do transitive edges compute eagerly for the whole visible graph, or only fan out from the currently hovered/pinned token (consistent with the existing `usageSiteIndex` precompute pattern)? **Resolved:** on-demand from active token only — see [acceptance-criteria child](connection-taxonomy.acceptance-criteria.md) §2 Transitive.
- Should override badges link to the parent definition (mini preview edge on click) or stay static text? **Resolved:** click summons ephemeral wire — see [acceptance-criteria child](connection-taxonomy.acceptance-criteria.md) §5 Override.

## References

- Preview edge contract (kind 1, unchanged): [preview-edges.md](preview-edges.md)
- Philosophy for why usage stays on-demand: [preview-edges.philosophy.supplement.md](preview-edges.philosophy.supplement.md)
- Design tokens for color assignment: [docs/design/tokens.md](../../design/tokens.md)
