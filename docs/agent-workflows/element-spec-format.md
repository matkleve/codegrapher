# Element Spec Format

Practical template for specs in `docs/specs/`.  
Governance: [docs/specs/README.md](../specs/README.md).

---

## Source of truth hierarchy

1. `docs/specs/README.md` — scope, folders, lint policy
2. `docs/glossary.md` — canonical terminology
3. This file — section skeleton and writing notes
4. Individual specs — behavior contracts

If a name is ambiguous, stop and document: `⚠ SPEC GAP: [description]`

---

## Default spec template

Use this structure for every parent spec under `docs/specs/` (except README and governance files).

### 1. Title + What It Is

Plain English, 1–2 sentences.

### 2. What It Looks Like

Visual summary, 3–5 sentences. Move tables to Actions or supplements.

### 3. Where It Lives

Parent component, route, or service boundary; trigger conditions.

### 4. Actions

| # | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1 | … | … | … |

### 5. Component Hierarchy

ASCII tree of structural ownership. Conditional nodes in `[brackets]`.

### 6. Data (optional)

API endpoints, types, context providers.

### 7. State (optional)

| State | Type | Default | Effect |
| ----- | ---- | ------- | ------ |

### 8. File Map (optional)

| File | Purpose |
| ---- | ------- |

### 9. Wiring (optional)

Context, hooks, parent integration.

### 10. Acceptance Criteria

Testable checkboxes. Prefer Given–When–Then or EARS for interaction specs.

```markdown
## Acceptance Criteria
- [ ] Given …, when …, then …
```

### 11. Interaction emphasis (interactive components only)

```markdown
## Interaction emphasis
- Canonical: docs/design/state-visuals.md
- [ ] This component uses brand hover (or documents exception below)
```

---

## Split policy

- Parent spec cap: **180 lines** (enforced by `node scripts/lint-specs.mjs`)
- Move detail to child files:
  - `*.supplement.md` — extra tables, FSM, philosophy
  - `*.acceptance-criteria.md` — long AC lists
- Link children from parent; do not duplicate bodies.

---

## Writing notes

- Normative language: **MUST** / **SHOULD** / **MAY** for enforceable rules.
- Timing constants: cite the code file (e.g. `hoverIntent.ts`), not rounded prose alone.
- Colors: token names only — see [docs/design/tokens.md](../design/tokens.md).
- Preview edges: never spec React Flow edges for preview; overlay only.
