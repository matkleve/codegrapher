# Project-specific docs

Not part of the portable `docs/agent-playbook/` kit. Per-repo backlogs and notes.

| File | Purpose |
| ---- | ------- |
| [restructure-plan.md](./restructure-plan.md) | Phased TSX/component splits for codegrapher |
| [trace-strength-refactor-plan.md](./trace-strength-refactor-plan.md) | Ordered PRs: trace strength stack alignment |
| [trace-engine-consolidation-plan.md](./trace-engine-consolidation-plan.md) | Ordered PRs: one `TraceEngine` store to replace the scattered trace globals + pub/sub |
| [interaction-model-audit.md](./interaction-model-audit.md) | Runtime pipeline + per-function catalog (definition + callers) + code-quality report for hover/trace/wire |
| [execution-debugger-plan.md](./execution-debugger-plan.md) | Design-only: real tick-by-tick interpreter (edit variables, mock return values, step over/into, reverse) |
| [signal-wire-port-plan.md](./signal-wire-port-plan.md) | Design-only: visible wire growth, consume-on-release, data inspector — measured gaps, not a system replacement |
