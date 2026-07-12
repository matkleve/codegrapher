# Agent Playbook

**Copy this entire folder** (`docs/agent-playbook/`) into any new project. It is
framework-agnostic at the core; stack-specific rules live under `frameworks/`.

## What to copy

```
docs/agent-playbook/          ← this folder (portable)
docs/specs/                   ← per-project behavior contracts (not in kit)
docs/glossary.md              ← per-project terminology
CLAUDE.md or AGENTS.md        ← wire the playbook in (see below)
.cursor/rules/                ← copy from templates/ as needed
eslint.shared.mjs             ← lint caps referenced in core/
```

## Wire-up checklist (new project)

1. Copy `docs/agent-playbook/` unchanged.
2. Create `CLAUDE.md` or `AGENTS.md` with:
   - Product one-liner
   - Link: `docs/agent-playbook/README.md`
   - Link: your framework file (`frameworks/react.md` or `frameworks/angular.md`)
   - Link: `docs/specs/README.md`
3. Copy `templates/component-split-gate.mdc` → `.cursor/rules/` (adapt paths if needed).
4. Add `docs/specs/`, `docs/glossary.md`, and `scripts/lint-specs.mjs` when specs exist.
5. Add project-specific backlog under `docs/project/` (restructure plans, bootstrap notes).

## Contents

| Path | Audience | Purpose |
| ---- | -------- | ------- |
| [core/README.md](./core/README.md) | All projects | Index of universal rules |
| [core/working-with-agents.md](./core/working-with-agents.md) | Agents + humans | How to work with AI agents on this codebase |
| [core/file-split-policy.md](./core/file-split-policy.md) | All projects | Lint caps, three-bucket rule, split decision tree |
| [core/spec-format.md](./core/spec-format.md) | All projects | Element spec template |
| [core/project-layout.md](./core/project-layout.md) | All projects | Generic repo buckets (lib, specs, design, scripts) |
| [frameworks/README.md](./frameworks/README.md) | Per stack | Which framework file to read |
| [frameworks/react.md](./frameworks/react.md) | React / Vite | components/, hooks/, context/ |
| [frameworks/angular.md](./frameworks/angular.md) | Angular | .html/.scss split, core/features/shared |
| [templates/](./templates/) | Setup | Cursor rule templates |

## Instruction precedence (suggested)

1. Security / data boundaries (project-specific)
2. `CLAUDE.md` or `AGENTS.md`
3. `.cursor/rules/*.mdc`
4. `docs/specs/` (behavior contracts)
5. **`docs/agent-playbook/core/`** (universal mechanics)
6. **`docs/agent-playbook/frameworks/<stack>.md`** (UI file layout)
7. `docs/glossary.md`
