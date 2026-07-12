# File Split Policy

Framework-agnostic rules for keeping source files agent-loadable.

**Stack-specific placement:** [../frameworks/README.md](../frameworks/README.md)

---

## Lint caps

Typical defaults (from shared ESLint config):

| Rule | Cap |
| ---- | --- |
| `max-lines` | **200** code lines (skip blanks + comments) |
| `max-lines-per-function` | **60** code lines |
| `complexity` | **15** |

At **150** code lines: stop adding logic; extract before growing.

---

## Three-bucket rule

Every UI feature decomposes into three non-overlapping buckets:

| Bucket | Owns | Must not own |
| ------ | ---- | ------------ |
| **Render** | Template / JSX, layout composition, presentation bindings | Business rules, parsers, layout math |
| **Stateful UI** | Hooks, signals, effects, callbacks, provider values | Pure transforms |
| **Pure logic** | Layout math, parsers, builders, unit tests | DOM, framework lifecycle, markup |

Lint caps apply to **all three** — a 300-line hook or service facade is still a split candidate.

---

## Split decision tree

```
File over 200 code lines OR function over 60?
├─ YES → Is it mostly markup (template/JSX)?
│   ├─ YES → Extract child components / external template (see framework doc)
│   └─ NO  → Is it a provider, shell, or top-level orchestrator?
│       ├─ YES → Extract controller hook or service; keep shell thin
│       └─ NO  → Is logic reusable across features?
│           ├─ YES → Move to shared hooks/ or pure lib/
│           └─ NO  → Colocate next to the single consumer
└─ NO  → Stop; do not preemptively split
```

---

## Split order (same PR)

1. Extract **pure** helpers (no behavior change).
2. Extract **stateful** logic (controller, hook, service methods).
3. Extract **markup** slices (child components or `.html`).
4. Leave parent as **composition only**.
5. Update owning spec **File Map** section.
6. Remove dead exports and stale references.

---

## What not to do

- Grow a file “just a bit more” when already over 150 code lines.
- Put business rules in render/template files.
- Split pure modules by copying markup patterns — extract functions only.
- Leave dead code after a split.

---

## Agent checklist

- [ ] No touched file over **200** code lines (or split planned in project backlog).
- [ ] No function over **60** code lines.
- [ ] Parent is **composition + thin wiring** only.
- [ ] New files in correct bucket per framework doc.
- [ ] Spec File Map updated.
- [ ] Lint — no new max-lines warnings on touched files.
