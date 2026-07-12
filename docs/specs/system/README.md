# System Specs

Cross-cutting orchestration and multi-surface behavior. System specs reference component/service specs but MUST NOT duplicate local ownership detail.

## Contracts

- [ego-graph-model](ego-graph-model.md) — incremental graph philosophy and loading semantics
- [preview-edges](preview-edges.md) — token hover, Ctrl reveal, pinning, timing
- [preview-edges.interactions.supplement](preview-edges.interactions.supplement.md) — **mermaid:** state machine, anchors, pin lock, live retarget
- [preview-edges.trace-strength.supplement](preview-edges.trace-strength.supplement.md) — provenance hop decay (usage → param → type), sibling endpoint emphasis
- [interaction-emphasis](interaction-emphasis.md) — brand gold hover + trace dim modes
- [token-interactions](token-interactions.md) — keyword gesture vocabulary (hover, Ctrl reveal, pin, jump, load) + use-case map
- [connection-taxonomy](connection-taxonomy.md) — connection kinds (usage, binding, control flow, structural, transitive, …) and visual language · [per-kind AC](connection-taxonomy.acceptance-criteria.md)
- [execution-simulator](execution-simulator.md) — **Option A static walk implemented** (step-into/out deferred) · variable panel, playback controls
- [execution-simulator.interactions.supplement](execution-simulator.interactions.supplement.md) — interaction index · [modes](execution-simulator.modes.supplement.md) · [surfaces](execution-simulator.surfaces.supplement.md) · [AC](execution-simulator.interactions.acceptance-criteria.md)

## Rules

- Usage and transitive preview connections are **on-demand only** — never a persistent edge layer. **Binding** (initializer → local/param) and **Control flow** (`switch`/`if` → branch) are also on-demand. This applies to preview kinds in [connection-taxonomy.md](connection-taxonomy.md); it does not extend to structural kinds.
- **Structural** connections (inheritance, implementation, composition/DI) are a deliberate, named exception: they render persistently once both endpoint classes are loaded, because they represent a permanent fact of the code rather than a question asked on hover. See [connection-taxonomy.md](connection-taxonomy.md).
- Usage edge direction is always **definition → usage**. Structural edge direction is relationship-specific (e.g. child → parent for inheritance) — see the taxonomy's Data table.
- Usage/transitive/binding/control-flow preview rendering is **overlay-only** (`PreviewEdgeOverlay`), not React Flow edges. Structural wires use the same overlay's structural layer — see [connection-taxonomy.md](connection-taxonomy.md) Where It Lives.
