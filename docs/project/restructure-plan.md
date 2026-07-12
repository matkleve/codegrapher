# Component Restructure Plan (codegrapher)

**Status:** planned — not started  
**Playbook:** [agent-playbook/frameworks/react.md](../agent-playbook/frameworks/react.md) · [file-split-policy.md](../agent-playbook/core/file-split-policy.md)  
**Last updated:** 2026-07-12

Project-specific backlog. Not part of the portable `agent-playbook/` kit.

Phased splits to clear ESLint `max-lines` / `max-lines-per-function` / `complexity`
warnings on TSX and context files. Each phase is a self-contained PR.

---

## Inventory (TSX / context — priority)

| File | Code lines | Function lines | Complexity |
| ---- | ---------- | -------------- | ---------- |
| `graph/GraphFlowInner.tsx` | 662 | 580 | 19 |
| `nodes/CollapsibleMemberRow.tsx` | 427 | 379 | 30 |
| `code/TokenContextBar.tsx` | 325 | 297 | 37 |
| `context/GraphInteractionContext.tsx` | 303 | 172 | — |
| `nodes/NodeCardHeader.tsx` | 272 | 240 | 21 |
| `ui/InteractiveListRow.tsx` | 223 | — | — |
| `context/useSimulationController.ts` | 221 | — | — |
| `code/TokenConnectionMenu.tsx` | 219 | — | — |

`lib/` has ~20 additional files over 200 code lines — **Phase F** (separate effort).

---

## Phase A — Documentation ✅

- [x] `docs/agent-playbook/` (portable kit)
- [x] This restructure plan
- [x] Agent files + GOVERNANCE-MATRIX updated
- [x] `.cursor/rules/component-split-gate.mdc`

---

## Phase B — `GraphFlowInner.tsx` (highest impact)

**Target:** `GraphFlowInner.tsx` ≤ 120 code lines; no function > 60.

### Extract hooks

| New file | Responsibility |
| -------- | -------------- |
| `graph/useGraphFlowController.ts` | nodes/edges state, history stack, `syncFromGraphData`, layout + fit |
| `graph/useGraphPathMode.ts` | path-from pick, `findShortestPath`, highlight apply/clear |
| `graph/useGraphReadingFocus.ts` | URL `?focus=`, reading width, scroll-into-view effects |
| `graph/useGraphMapControls.ts` | grid toggle, fit/center, control flash timer |

### Extract components

| New file | Responsibility |
| -------- | -------------- |
| `graph/GraphToolbar.tsx` | Header: title, subtitle, history nav, sim toggle, loading |
| `graph/GraphEmptyState.tsx` | Empty canvas overlay |
| `graph/GraphMapControls.tsx` | Floating stack: legend, grid, reading focus, center, fit |
| `graph/GraphNodeContextMenu.tsx` | Right-click node menu (if still inline) |

### Acceptance

- [ ] `GraphFlowInner` is provider composition + layout shell only
- [ ] `npx eslint graph/GraphFlowInner.tsx` — no max-lines warnings
- [ ] Manual: file click, drag-merge, path mode, reading focus, grid toggle, history nav
- [ ] Update `docs/specs/page/app-shell.md` File Map

---

## Phase C — Member row + header (shared trace)

**Problem:** `CollapsibleMemberRow` and `NodeCardHeader` duplicate definition-trace
setup (~150 lines each).

### Extract shared hook

| New file | Responsibility |
| -------- | -------------- |
| `hooks/useDefinitionTrace.ts` | defTokenKey, `fireDefPreview`, hover/pin, context menu for defs |

### Split member row

| New file | Responsibility |
| -------- | -------------- |
| `nodes/MemberRowHeader.tsx` | Chevron, label, signature tags, toggle button |
| `nodes/MemberRowBody.tsx` | Expanded `CodeLine` list |
| `nodes/CollapsibleMemberRow.tsx` | Thin: `useDefinitionTrace` + locals + compose |

### Thin header

| File | Target |
| ---- | ------ |
| `nodes/NodeCardHeader.tsx` | ≤ 120 code lines via `useDefinitionTrace` |

### Acceptance

- [ ] Both files under 200 code lines; functions under 60
- [ ] Manual: def hover/pin on class title and member label; context menu; row expand
- [ ] Update `docs/specs/component/class-node.md` File Map

---

## Phase D — `GraphInteractionContext.tsx`

Mirror `SimulationContext` pattern.

| New file | Responsibility |
| -------- | -------------- |
| `context/useGraphInteractionController.ts` | All state, callbacks, memoized context value |
| `context/GraphInteractionContext.tsx` | ~40 lines: Provider + `useGraphInteraction` |

### Acceptance

- [ ] Context file ≤ 60 code lines
- [ ] Manual: Ctrl preview, connection menu, trace dim, pin across graph

---

## Phase E — Remaining TSX

| File | Split approach |
| ---- | -------------- |
| `code/TokenContextBar.tsx` | `useTokenContextBar.ts` + `TokenContextBarSection.tsx` if needed |
| `code/TokenConnectionMenu.tsx` | Extract row component if markup-heavy |
| `ui/InteractiveListRow.tsx` | Extract list item sub-component |

---

## Phase F — `lib/` modules (lower priority)

Split pure modules by domain when touched — not JSX child components.

Only split when editing the file for other reasons, unless lint warnings block CI.

---

## Execution order

```
A (docs) → B (GraphFlowInner) → C (member/header) → D (context) → E (remainder) → F (lib, opportunistic)
```

**Do not combine B + C in one PR** — graph shell and member trace are independent
test surfaces.

---

## Verification (every phase)

```bash
npm run lint
npm test
# Manual via .claude/launch.json — fixtures/demo/
```
