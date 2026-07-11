# Preview edges — philosophy & roadmap

Supplement to [preview-edges.md](preview-edges.md). Non-normative background; constraints marked MUST are binding.

---

## Ego-centric explorer

codegrapher shows the **neighborhood** of current attention, not the whole codebase. Permanent call-graph edges are intentionally avoided.

1. **Edges are a question, not a fact.** Relationships are summoned on demand by pointing at a token. Ctrl is the "explain this" modifier. Structural kinds (extends, DI, …) are a named exception — see [connection-taxonomy.md](connection-taxonomy.md).
2. **Anchor to attention.** Target resolves to class → member → line so the answer matches zoom level.
3. **Fixed direction.** Definition always feeds usage (binding and control-flow have their own directions per kind).
4. **Scoped identity.** Symbol index uses `(filePath, enclosingSymbol, name)` so same-named members across classes don't collide.

## Indexed vs interactive (verified)

Fixture: `fixtures/demo`, `OrderService.checkout` expanded:

| Token | Kind | Behavior |
| ----- | ---- | -------- |
| `checkout` | method (self) | interactive chip |
| `charge` | method (other) | usage edge → `PaymentGateway.charge` |
| `PaymentGateway` | class | usage edge → class node |
| `gateway` | property (indexed) | usage edge to property row / read sites |
| `addr`, `field` | param / local | binding + usage via `localSymbolLinks.ts` |
| `switch`, `case` | control flow | branch fan-out via `controlFlowLinks.ts` |
| Non-indexed identifiers | — | inert unless member-access cascade reaches an indexed receiver |

Parser indexes classes, methods, properties, params, locals, and types with scoped identity — see [parser-index.md](../service/parser-index.md). Client-local lexical links supplement params/locals for binding wires.

## Use cases (today)

1. Trace call to definition inside ego-graph
2. Cross-file load via dashed stub + `TokenConnectionMenu` → `/api/focus`
3. Ctrl sweep for impact preview before refactor
4. Onboarding hop-by-hop from one entry point
5. Binding trace: where a local gets its initializer value
6. Control-flow trace: which branches a `switch`/`if` can take
7. Structural survey: inheritance and DI once both classes are on canvas

## Known gaps (honest limits)

- Receiver disambiguation (`a.charge()` vs `b.charge()` without type info) — needs type-checking, not just scoping
- `type T = { foo: string }` object-literal members — interfaces only for now
- Ternary and multi-line `switch`/`if` headers for control flow — deferred
- Simulation step-into/out — spec'd, not built

**Constraint:** Even with broader index, usage/binding/control-flow edges MUST stay on-demand preview — never a standing call-graph layer.

## Design constraints (normative)

- **Scope before connect** — qualified identity for locals/properties
- **Stay on-demand** — calm default, hover-summoned edges only (except structural exception)
- **Anchor to attention** — finest revealed anchor wins
- **Fixed direction** — definition → usage for usage kind; fan-out from definitions
- **Locality is legible** — solid wire = on canvas; dashed Load stub = off canvas (menu offers load action)
