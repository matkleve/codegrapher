# Project Bootstrap from codegrapher

**For agents:** when the user says *"copy from codegrapher"*, use this playbook to scaffold a new Vite + React + Express TypeScript repo. Patterns originate in **feldpost** (`/home/matthias/Projects/feldpost`); codegrapher is the slimmed React fork (`/home/matthias/Projects/codegrapher`).

---

## 1. Purpose

codegrapher encodes a repeatable bootstrap: small files agents can load whole, shared lint across client and server, spec contracts beside code, and design tokens with lint gates. Copy the **mechanics**, not the domain (graph explorer, parser, preview edges). Adapt folder names to the product; keep the quality gates.

---

## 2. Folder strategy

### Recommended tree

```
<project>/
  package.json              ← dev, lint, test, lint:specs, lint:tokens
  eslint.shared.mjs
  client/
    eslint.config.js
    src/
      App.tsx, index.css      ← token emission (:root + .dark)
      components/           ← UI by domain (graph/, nodes/, explorer/, ui/)
      context/              ← React providers
      hooks/                ← useXxx.ts extracted from fat components
      lib/                  ← pure logic — unit tests here
      styles/               ← domain CSS (imported from index.css)
      types/
  server/
    eslint.config.mjs
    src/index.ts
  scripts/                  ← lint-specs.mjs, lint-tokens.mjs
  docs/                     ← glossary, design/, specs/, agent-playbook/, project/
  fixtures/                 ← sample data for manual / headless testing
  .cursor/rules/
  .claude/launch.json
  CLAUDE.md
```

### Bucket ownership

| Bucket | Owns | Not |
| ------ | ---- | --- |
| `lib/` | Pure functions, layout, parsers | JSX, hooks, CSS |
| `hooks/` | Stateful UI logic | App-wide providers → `context/` |
| `context/` | Providers, orchestration | One-off component state |
| `components/` | Render + thin wiring | Business rules → `lib/` |
| `styles/` | Domain CSS files | One-off colors → `index.css` |
| `server/src/` | HTTP API, indexing | React/canvas logic |

**Split rule:** eslint warns at **200 code lines** — see
[`agent-playbook/core/file-split-policy.md`](../agent-playbook/core/file-split-policy.md)
and [`frameworks/react.md`](../agent-playbook/frameworks/react.md).

### `components/` domain folders (codegrapher)

| Folder | Owns |
| ------ | ---- |
| `code/` | Source lines, token chips, context bar |
| `explorer/` | File tree, recent files |
| `graph/` | Canvas, overlay, legend |
| `nodes/` | Class/file nodes, member rows |
| `simulation/` | Sim panel, gutter, ledger |
| `ui/` | Shared primitives |

Hooks: `hooks/` when shared across domains; `components/<domain>/use*.ts` when
domain-local; `context/use*Controller.ts` for providers.

### Feldpost vs codegrapher

| | Feldpost | codegrapher |
| - | -------- | ----------- |
| Shape | `apps/web/` + `supabase/` + `worker/` | `client/` + `server/` |
| Stack | Angular (`core/`, `features/`, `shared/`) | React 19 + Vite |
| Agent entry | `AGENTS.md` (+ package copies) | `CLAUDE.md` |
| Backend | Supabase migrations/RLS | Express |

---

## 3. Lint & quality gates

### Shared eslint (copy from `eslint.shared.mjs`)

Exports `maintainabilityRules` + `codeQualityRules`, spread into both client and server configs:

- `max-lines` **200**, `max-lines-per-function` **60**, `complexity` **15**
- Errors: `no-explicit-any`, `consistent-type-imports`, `unused-imports`
- Warns: `explicit-function-return-type`, `no-magic-numbers` (shared ignore list)

Client adds React plugins (`react-hooks`, `react-refresh`); server uses `globals.node`.

### Root scripts

```json
"dev": "concurrently \"npm run dev --prefix server\" \"npm run dev --prefix client\"",
"lint": "npm run lint --prefix client && npm run lint --prefix server",
"lint:specs": "node scripts/lint-specs.mjs",
"lint:tokens": "node scripts/lint-tokens.mjs",
"test": "npm run test --prefix client"
```

| Script | Add when |
| ------ | -------- |
| `lint:specs` | `docs/specs/` exists |
| `lint:tokens` | Size scale in `index.css` |

Feldpost runs `--max-warnings 0` and adds `design-system:check`, `i18n:check`, Angular template rules — adopt only if needed.

---

## 4. Agent instructions (day one)

### `CLAUDE.md` sections

1. Product one-liner
2. Spec index + `docs/agent-playbook/core/spec-format.md` + `GOVERNANCE-MATRIX.md`
3. Architecture (entries, ports, `npm run dev`)
4. Conventions (lint caps, test focus, file-split rule)
5. Domain pitfalls (product-specific)
6. Link to **this doc** for bootstrapping siblings
7. Link to **`docs/agent-playbook/README.md`** (portable agent kit)

Feldpost adds: instruction-precedence stack, change classification (Trivial/Standard/Sensitive), RLS-first rules, `docs/ai-diary/`.

### `.cursor/rules/*.mdc`

Start with one always-applied token rule — copy `tailwind-tokens-only.mdc` pattern: inventory in `docs/design/tokens.md`, emission in `index.css`, no one-off CSS vars.

Add more as complexity grows (feldpost: `token-usage-gate`, `ui-state-machine`, `scss-ownership`, `component-reuse-gate`, `i18n-workflow`). codegrapher: `component-split-gate` (always-applied; points at split playbook).

### `docs/agent-playbook/` (copy to every new project)

Portable kit — framework-agnostic core + per-stack guides. See `README.md` inside.

### `docs/agent-workflows/` (optional, project-specific)

- `project-bootstrap-from-codegrapher.md` — this file

### `docs/project/` (per-repo backlog)

- `restructure-plan.md` — phased file splits for this codebase

Feldpost optional: `agent-quick-reference.md`, `implementation-checklist.md` (exist in feldpost repo).

### `.claude/launch.json`

```json
{ "version": "0.0.1", "configurations": [{
  "name": "<project>-dev", "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "dev"], "port": 5173
}]}
```

---

## 5. Specs & governance

```
docs/glossary.md
docs/specs/README.md
docs/specs/GOVERNANCE-MATRIX.md   ← code path → spec folder
docs/specs/{system,component,page,service}/README.md
docs/agent-playbook/          ← portable kit (copy whole folder)
docs/agent-workflows/element-spec-format.md  ← redirect stub; real file in agent-playbook
```

**`npm run lint:specs`:** parent specs max **180** lines (warn **150**); required sections: What It Is, What It Looks Like, Where It Lives, Actions, Component Hierarchy, Acceptance Criteria. Splits → `*.supplement.md` / `*.acceptance-criteria.md`.

**GOVERNANCE-MATRIX:** one table mapping scopes (e.g. `client/src/lib/` → `system/`, `service/`). Behavior change → update owning spec in same PR.

Feldpost adds `docs/specs/ui/`, JSON governance registries, and automated traceability reports — only when spec count justifies it.

---

## 6. Design tokens

| Piece | Location |
| ----- | -------- |
| Inventory | `docs/design/tokens.md` |
| Emission | `client/src/index.css` (`:root`, `.dark`, `@theme inline`) |
| Domain CSS | `client/src/styles/*.css` |
| JS/SVG | `var(--…)` via `style`, never hex |
| Lint + rule | `lint:tokens` + `.cursor/rules/tailwind-tokens-only.mdc` |

Add `docs/specs/system/interaction-emphasis.md` when brand-hover vs action-primary matters.

---

## 7. Testing

- **Vitest** in `client/` — focus `client/src/lib/**`
- No component/server/e2e tests initially
- Manual verification via `fixtures/` + dev server (`.claude/launch.json`)

Feldpost adds `ng test`, Playwright e2e, and `*.service.spec.ts` beside each service module.

---

## 8. Bootstrap checklist

1. Init `client/` (Vite React TS) + `server/` (Express TS)
2. Root `package.json`: `dev`, `lint`, `test`, `concurrently`
3. Copy `eslint.shared.mjs`; wire client + server eslint configs
4. Create `client/src/` buckets: `components/`, `context/`, `hooks/`, `lib/`, `styles/`, `types/`
5. Add `docs/glossary.md`, `docs/specs/README.md`, `GOVERNANCE-MATRIX.md`
6. Copy entire `docs/agent-playbook/` folder; add `scripts/lint-specs.mjs`; add `lint:specs`
7. Write `CLAUDE.md` (link this doc)
8. Token rule + `index.css` emission when styling starts; add `lint:tokens`
9. Vitest in client; first tests under `lib/`
10. `.claude/launch.json` + `fixtures/` for headless agent testing
11. Vite proxy `/api/*` → server; document ports
12. `npm run lint && npm run lint:specs && npm test` — green before features

---

## Gaps to fill later

| Topic | Feldpost | codegrapher |
| ----- | -------- | ----------- |
| Change classification | Trivial / Standard / Sensitive | Informal |
| Agent precedence | `AGENTS.md` stack | Single `CLAUDE.md` |
| Service symmetry | `core/<name>/` ↔ `specs/service/<name>/` | Lighter service specs |
| i18n / e2e | Full gates + Playwright | None |
| AI diary | `docs/ai-diary/` | None |
| Governance automation | JSON registries | Manual `SPEC-DRIFT.md` |

When in doubt: feldpost for full ceremony; codegrapher for minimal React + Express spine.
