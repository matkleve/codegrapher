# Token hover — atlas (start here)

**Agents:** read this once, then open **one** layer spec. Do not restate in chat ([working-with-agents.md](../../agent-playbook/core/working-with-agents.md)).

---

## Layers

| Layer | Spec | Code |
| ----- | ---- | ---- |
| Gesture | [token-interactions.md](token-interactions.md) | `useTokenTraceState`, edge builders |
| Clock | [preview-edges.interactions.supplement.md](preview-edges.interactions.supplement.md) | `hoverIntent.ts`, `beginTrace` |
| Pixels | [interaction-emphasis.md](interaction-emphasis.md) | see implementation supplement |
| Brightness | [preview-edges.trace-strength.supplement.md](preview-edges.trace-strength.supplement.md) | `traceDepth.ts`, `traceLitApply.ts` |
| Wire kind | [connection-taxonomy.md](connection-taxonomy.md) | edge builders |

**Implement trace CSS:** [interaction-emphasis.implementation.supplement.md](interaction-emphasis.implementation.supplement.md) (ownership table).

**Verify:** [interaction-emphasis.acceptance-criteria.md](interaction-emphasis.acceptance-criteria.md).

---

## Phases

| Phase | Surround | Chips | Commits |
| ----- | -------- | ----- | ------- |
| Pending | dim | ink unchanged; focal pending strength | — |
| Active | dim | off-path resting; path lit | wires, rows, sockets |
| Pin | merged lit | `token-chip-source` | Esc clears |

**Invariants:** emphasis on chips only **up**; dwell gates commit; no chip `color` in `trace-syntax.css`.

Ctrl = explore axis (`graph-ctrl-preview`). Timeline: interactions supplement § Visual commit timeline.

---

## Agent edit checklist

1. Atlas → pick layer spec  
2. Touch **one** CSS bucket per [implementation supplement](interaction-emphasis.implementation.supplement.md)  
3. Update spec if behavior changes  
4. Run `npm run lint:specs` + manual hover on `fixtures/demo`

---

## Not token hover

- App chrome: [graph-chrome.md](../component/graph-chrome.md)
- Simulation: [execution-simulator.atlas.supplement.md](execution-simulator.atlas.supplement.md)
