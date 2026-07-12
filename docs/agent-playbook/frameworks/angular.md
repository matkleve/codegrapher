# Angular (standalone)

Stack-specific layout for Angular projects (feldpost pattern).

**Universal rules first:** [../core/file-split-policy.md](../core/file-split-policy.md)

---

## Folder structure

```
apps/web/src/app/
  core/<service>/           ← services, adapters, types, specs symmetry
    <name>.service.ts
    <name>.helpers.ts
    adapters/
  features/<feature>/       ← route-level surfaces
  shared/<primitive>/       ← reusable UI; check registry first
    foo.component.ts
    foo.component.html
    foo.component.scss
```

---

## Markup split (`.html` + `.scss`)

| File | Owns |
| ---- | ---- |
| `*.component.ts` | Class, signals, inputs/outputs, DI, thin glue |
| `*.component.html` | Template (default for non-trivial markup via `templateUrl`) |
| `*.component.scss` | Component-scoped styles (one file per component) |

- **External templates** — default when markup exceeds ~40 lines.
- **Inline templates** — trivial shells only; extract to `.html` when growing.
- When splitting inline → `.html`: strict 1:1 copy before deleting inline block.

---

## SCSS ownership

One SCSS file per component. See project `.cursor/rules/scss-ownership.mdc` when present:

- Layout containers own columns/gaps only
- No typography on `h1`–`h6` in component SCSS (global `styles.scss`)
- Intermediate wrappers carry zero styling unless documented exception

---

## Shared UI first

Before feature-local markup:

1. Check `shared/` and component registry
2. Use existing primitives (dialogs, dropdowns, buttons)
3. Only then add feature-local components

---

## Service symmetry (feldpost)

| Docs | Code |
| ---- | ---- |
| `docs/specs/service/<name>/` | `apps/web/src/app/core/<name>/` |

Per module: `*.service.ts`, `*.service.spec.ts`, `*.types.ts`, `*.helpers.ts`, `adapters/`, `README.md`.

Keep facade slim; delegate to adapters.

---

## Reference implementations (feldpost)

| Pattern | Files |
| ------- | ----- |
| Time field | `time-field-control.component.{ts,html,scss}` |
| Calendar | `calendar-dropdown.component.{ts,html}` |
| **Avoid** | Large inline `template:` strings in `.component.ts` |

---

## Naming

| Artifact | Pattern |
| -------- | ------- |
| Component | `kebab-case.component.*` |
| Service | `kebab-case.service.ts` |
| Helpers | `kebab-case.helpers.ts` |

---

## Build verification

```bash
cd apps/web && ng build
```

Run before submitting any template or component change.
