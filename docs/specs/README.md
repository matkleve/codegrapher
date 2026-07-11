# Specs Index

Authoritative contracts for codegrapher behavior, interaction, and ownership.

Last updated: 2026-07-11

---

## Quick orientation

| Resource | Purpose |
| -------- | ------- |
| [docs/glossary.md](../glossary.md) | Canonical terminology |
| [docs/agent-workflows/element-spec-format.md](../agent-workflows/element-spec-format.md) | Spec template |
| [docs/design/tokens.md](../design/tokens.md) | Color/motion tokens |
| [docs/design/brand-book.md](../design/brand-book.md) | Brand identity, accent matrix, consistency audit |
| [docs/design/state-visuals.md](../design/state-visuals.md) | Hover/focus contract |
| [GOVERNANCE-MATRIX.md](GOVERNANCE-MATRIX.md) | Who owns what |
| [SPEC-DRIFT.md](SPEC-DRIFT.md) | Open spec ↔ code mismatches (human decision) |

**Before editing a spec:** read the folder README for that area.

---

## Folder taxonomy

| Folder | Owns |
| ------ | ---- |
| [system/](system/README.md) | Cross-cutting behavior (ego-graph, preview edges, interaction emphasis) |
| [component/](component/README.md) | Reusable UI contracts (class node, overlay, explorer rows) |
| [page/](page/README.md) | App shell and route-level composition |
| [service/](service/README.md) | Server parser and API contracts |

---

## Lint & split policy

```bash
npm run lint:specs
```

- Parent specs: max **180** lines (warn at **150**)
- Required sections: What It Is, What It Looks Like, Where It Lives, Actions, Component Hierarchy, Acceptance Criteria
- Excluded from lint: `README.md`, `GOVERNANCE-*.md`, `SPEC-*.md`, `*.supplement.md`, `*.acceptance-criteria.md`

Split strategy: see [element-spec-format.md](../agent-workflows/element-spec-format.md).

---

## Cross-cutting contracts

- **Preview edges:** [system/preview-edges.md](system/preview-edges.md) · [interactions supplement](system/preview-edges.interactions.supplement.md) (mermaid)
- **Ego-graph philosophy:** [system/ego-graph-model.md](system/ego-graph-model.md)
- **Brand hover + trace dim:** [system/interaction-emphasis.md](system/interaction-emphasis.md)
- **Keyword interactions:** [system/token-interactions.md](system/token-interactions.md) · use cases: [design/token-interaction-use-cases.md](../design/token-interaction-use-cases.md)
- **Symbol index:** [service/parser-index.md](service/parser-index.md)
- **Connection taxonomy (design, not yet implemented):** [system/connection-taxonomy.md](system/connection-taxonomy.md) · [per-kind AC](system/connection-taxonomy.acceptance-criteria.md)
- **Execution simulator (design, not yet implemented):** [system/execution-simulator.md](system/execution-simulator.md)

---

## Prototypes (non-normative)

- [docs/prototypes/connectors-proto.html](../prototypes/connectors-proto.html) — visual/motion reference for preview edges
