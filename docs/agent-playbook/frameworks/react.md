# React (Vite)

Stack-specific layout for React projects (codegrapher pattern).

**Universal rules first:** [../core/file-split-policy.md](../core/file-split-policy.md)

---

## Folder structure

```
client/src/
  App.tsx
  index.css                 ← token emission (:root + .dark)
  components/
    <domain>/               ← one folder per product area
      Foo.tsx               ← thin render (target ≤ ~120 code lines)
      FooHeader.tsx         ← extracted markup slice
      useFooController.ts   ← domain-local hook (optional)
    ui/                     ← cross-domain primitives
    FileExplorer.tsx        ← shell composers only
  hooks/                    ← hooks shared across ≥2 domains
  context/                  ← providers; logic → useXxxController.ts
  lib/                      ← pure functions; Vitest here
  styles/                   ← domain CSS imported from index.css
  types/
```

---

## Markup split (no `.html` files)

React has no `templateUrl`. Extracting markup means **child `.tsx` components**,
not external HTML files.

| Instead of | Use |
| ---------- | --- |
| One 400-line component | Parent + `FooToolbar.tsx` + `FooBody.tsx` |
| Inline 80-line JSX block | Named child component in same domain folder |

---

## Hook placement

| Location | When |
| -------- | ---- |
| `hooks/use*.ts` | Used by **two or more** domains |
| `components/<domain>/use*.ts` | Used **only** in that domain |
| `context/use*Controller.ts` | Provider value composition |

---

## Domain folders (codegrapher example)

Adapt names to your product; keep the **domain subfolder** rule.

| Folder | Owns |
| ------ | ---- |
| `code/` | Source lines, token chips, context bar |
| `explorer/` | File tree, recent files |
| `graph/` | Canvas, overlay, legend, map controls |
| `nodes/` | Compound nodes, member rows |
| `simulation/` | Debugger / sim panel |
| `ui/` | Button, Container, ThemeToggle, … |

**Root `components/*.tsx`** — shell composers only (e.g. `FileExplorer` wires `explorer/`).

---

## Reference implementations (codegrapher)

| Pattern | Render | Controller |
| ------- | ------ | ---------- |
| Class node | `ClassNode.tsx` | `useClassNodeController.ts` |
| Simulation | `SimulationContext.tsx` (~30 lines) | `useSimulationController.ts` |
| Code line | `CodeLine.tsx` | `useCodeLineController.ts` + slices |
| **Anti-pattern** | `GraphFlowInner.tsx` (~660 code lines) | *(none — split backlog)* |

---

## Naming

| Artifact | Pattern |
| -------- | ------- |
| Component | `PascalCase.tsx` |
| Hook | `usePascalCase.ts` |
| Pure module | `camelCase.ts` in `lib/` |

---

## Styling

- Tokens in `index.css` (`:root`, `.dark`, `@theme inline`)
- Domain CSS in `styles/*.css`
- No one-off CSS custom properties — use existing tokens
- JS/SVG colors via `var(--…)` in `style`, never hex literals

---

## Cursor rule

Copy [../templates/component-split-gate.mdc](../templates/component-split-gate.mdc) to `.cursor/rules/`.
