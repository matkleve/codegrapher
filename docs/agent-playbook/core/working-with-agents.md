# Working with Agents

Universal protocols for human + AI collaboration. Applies to any stack.

---

## Before you edit

1. **Read the spec** for the surface you touch (`docs/specs/`).
2. **Read the framework file** (`docs/agent-playbook/frameworks/<stack>.md`) for folder placement.
3. **Check file size** — if the target file is over 150 code lines, split before adding logic ([file-split-policy.md](./file-split-policy.md)).

---

## Operating rules

### Simple fix gate

If the fix is ≤3 lines, one conditional, or one scoped constraint: implement it.
Do not expand into refactors or discovery spirals.

### Anti-loop guard

- If the same search repeats without new signal, switch tactic or ask one precise question.
- After 4 exploratory calls with no write path: state findings + one blocking question.

### SPEC GAP

If ownership, naming, or behavior is ambiguous in specs: stop and record
`⚠ SPEC GAP: [description]` — do not invent domain rules.

### Change completeness

A change is not done until replaced artifacts are removed: dead code, stale spec
references, unused exports — in the **same** change.

### Minimize scope

Match surrounding code. Reuse existing abstractions. No drive-by refactors.

---

## Explaining behavior (responses)

**Do not restate specs in chat.** Point to the contract; answer in a few sentences or a small table.

1. **Start at the atlas** (if the project has one) — e.g. `docs/specs/system/token-hover.atlas.supplement.md`.
2. **Link the owning spec** for detail — one line per layer (gesture / clock / pixels).
3. **Cap prose** — prefer ≤6 bullets or one short table; skip mermaid, file maps, and "reading order" unless asked.
4. **Code citations** only for the exact line under discussion — not whole subsystems.
5. **SPEC GAP** when the atlas and specs disagree with code — don't invent a third story.

When behavior changes, update the **spec** (and atlas if the map changed), not a long chat summary.

---

## What agents need from the repo

| Artifact | Why |
| -------- | --- |
| Small files (≤200 code lines) | Agent loads one file whole |
| Specs beside code | Behavior contract without reading entire codebase |
| Glossary | Canonical names — no invented terminology |
| Lint gates | Objective split triggers |
| Fixtures / sample data | Headless verification without native OS dialogs |

---

## Verification before merge

- [ ] Lint passes on touched paths
- [ ] Build / test command for the stack passes
- [ ] Owning spec updated if behavior changed
- [ ] No new max-lines warnings on touched files
- [ ] Manual smoke on the changed surface (when no automated UI tests)

---

## Project-specific docs (not in this kit)

Keep these **outside** `agent-playbook/` — they vary per product:

- `docs/specs/` — behavior contracts
- `docs/glossary.md` — domain terms
- `docs/project/` — restructure backlogs, bootstrap notes
- `CLAUDE.md` / `AGENTS.md` — entry point + pitfalls
