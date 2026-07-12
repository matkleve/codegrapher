# Project Layout (generic)

Framework-agnostic repo buckets. Adapt folder names to your stack; keep the **separation of concerns**.

---

## Recommended top-level

```
<project>/
  package.json
  eslint.shared.mjs          ← shared lint caps (optional but recommended)
  docs/
    agent-playbook/          ← copy portable kit (this folder)
    specs/                   ← behavior contracts (per project)
    glossary.md
    design/                  ← tokens, state-visuals
    project/                 ← restructure backlogs, bootstrap notes (per project)
  scripts/                   ← lint-specs, lint-tokens, etc.
  .cursor/rules/
  CLAUDE.md or AGENTS.md
```

---

## Universal buckets

| Bucket | Owns | Must not own |
| ------ | ---- | ------------ |
| **Pure logic** | Parsers, layout math, transforms, unit tests | UI markup, framework lifecycle |
| **Stateful UI** | Hooks, signals, provider controllers | App-wide security boundaries |
| **Render** | Components, templates, thin wiring | Business rules |
| **Specs** | What the system does | Implementation detail dumps |
| **Design** | Tokens, motion, interaction emphasis | One-off component colors |
| **Server / API** | HTTP, indexing, persistence | Canvas/UI logic |

UI folder names differ by framework — see [../frameworks/README.md](../frameworks/README.md).

---

## Quality gates (typical)

| Script | Purpose |
| ------ | ------- |
| `npm run lint` | ESLint (file size, types, imports) |
| `npm run lint:specs` | Spec section + line caps |
| `npm run lint:tokens` | Design token / size scale |
| `npm test` | Unit tests (focus pure logic first) |

---

## Agent entry file

Every project needs **one** agent entry document:

| Stack | Typical file |
| ----- | ------------ |
| codegrapher-style | `CLAUDE.md` |
| feldpost-style | `AGENTS.md` (+ package copies) |

Minimum sections:

1. Product one-liner
2. Link to `docs/agent-playbook/README.md`
3. Link to framework file (`frameworks/react.md` or `frameworks/angular.md`)
4. Link to `docs/specs/README.md`
5. Architecture (ports, dev command, key entry files)
6. Domain pitfalls (project-specific)
