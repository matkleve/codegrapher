# Execution simulator — engine options (supplement)

Supplement to [execution-simulator.md](execution-simulator.md). Non-normative for MVP; Options B and C require a separate investment decision before implementation.

---

## Option A: Static walk (MVP — normative AC in parent)

| Aspect | Detail |
| ------ | ------ |
| Mechanism | AST/lexical walk of method `code` string; build ordered statement list |
| Values | Literals shown as-is; expressions shown as unevaluated source text |
| Calls | Step-into descends if callee on canvas; return value `unknown` unless literal |
| Safety | No code execution — fully deterministic |
| Cost | Low — reuses ts-morph or lightweight parse of method body snippet |

## Option B: Sandboxed real execution (deferred)

| Aspect | Detail |
| ------ | ------ |
| Mechanism | `node:vm` or isolated worker; user-supplied inputs from pre-flight |
| Values | Real computed primitives; objects stubbed |
| Calls | Dependencies auto-stubbed as recording proxies |
| Safety | Runs user code from opened folder — requires explicit trust/consent UI |
| Cost | Medium — harness generation per class, stub graph for DI |

## Option C: DAP debugger attach (deferred)

| Aspect | Detail |
| ------ | ------ |
| Mechanism | Debug Adapter Protocol to running Node/process |
| Values | Fully real runtime values |
| Calls | Native step-into/over |
| Safety | Requires target app running and debuggable |
| Cost | High — full DAP client, breakpoint protocol, process lifecycle |

## Decision record

- **2026-07-11:** Option A selected for first implementation. B/C documented here only; no acceptance criteria until a follow-on spec amendment.

## When to revisit

- If static walk fails user testing for "debugging wrong value" scenarios (U3/U4 in [token-interaction-use-cases.md](../../design/token-interaction-use-cases.md))
- If ego-graph users routinely need real async/loop semantics beyond static caps
