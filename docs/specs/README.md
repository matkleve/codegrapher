# Specs Index

Authoritative contracts for codegrapher behavior, interaction, and ownership.

Last updated: 2026-07-11

---

## Quick orientation

| Resource | Purpose |
| -------- | ------- |
| [docs/glossary.md](../glossary.md) | Canonical terminology |
| [docs/agent-playbook/README.md](../agent-playbook/README.md) | Portable agent kit (copy to new projects) |
| [docs/agent-playbook/core/spec-format.md](../agent-playbook/core/spec-format.md) | Spec template |
| [docs/agent-playbook/frameworks/react.md](../agent-playbook/frameworks/react.md) | React component folders |
| [docs/project/restructure-plan.md](../project/restructure-plan.md) | Phased TSX split backlog |
| [docs/design/tokens.md](../design/tokens.md) | Color/motion tokens |
| [docs/design/brand-book.md](../design/brand-book.md) | Brand identity, accent matrix, consistency audit |
| [docs/design/state-visuals.md](../design/state-visuals.md) | Hover/focus contract |
| [docs/design/accessibility.md](../design/accessibility.md) | WCAG 1.4.1 wire differentiation, connection kind matrix |
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

Split strategy: specs → [spec-format.md](../agent-playbook/core/spec-format.md); code → [file-split-policy.md](../agent-playbook/core/file-split-policy.md) + [react.md](../agent-playbook/frameworks/react.md).

---

## Cross-cutting contracts

- **Preview edges:** [system/preview-edges.md](system/preview-edges.md) · [interactions supplement](system/preview-edges.interactions.supplement.md) (mermaid)
- **Ego-graph philosophy:** [system/ego-graph-model.md](system/ego-graph-model.md)
- **Brand hover + trace dim:** [system/interaction-emphasis.md](system/interaction-emphasis.md)
- **Keyword interactions:** [system/token-interactions.md](system/token-interactions.md) · use cases: [design/token-interaction-use-cases.md](../design/token-interaction-use-cases.md)
- **Graph chrome:** [component/graph-chrome.md](component/graph-chrome.md) — legend, connection menu, path highlight
- **Symbol index:** [service/parser-index.md](service/parser-index.md)
- **Connection taxonomy:** [system/connection-taxonomy.md](system/connection-taxonomy.md) — usage, binding, **typesetting**, control flow, inheritance, composition, transitive reach, … · [per-kind AC](system/connection-taxonomy.acceptance-criteria.md) · [accessibility](../../design/accessibility.md)
- **Execution simulator (Option A static walk — MVP implemented):** [system/execution-simulator.md](system/execution-simulator.md) · [interactions index](system/execution-simulator.interactions.supplement.md) · engine: `client/src/lib/staticWalk/`, orchestration: `SimulationContext`

---

## Prototypes (non-normative)

- [docs/prototypes/connectors-proto.html](../prototypes/connectors-proto.html) — visual/motion reference for preview edges
