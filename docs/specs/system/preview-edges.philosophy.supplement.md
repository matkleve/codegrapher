# Preview edges — philosophy & roadmap

Supplement to [preview-edges.md](preview-edges.md). Non-normative background; constraints marked MUST are binding.

---

## Ego-centric explorer

codegrapher shows the **neighborhood** of current attention, not the whole codebase. Permanent call-graph edges are intentionally avoided.

1. **Edges are a question, not a fact.** Relationships are summoned on demand by pointing at a token. Ctrl is the "explain this" modifier.
2. **Anchor to attention.** Target resolves to class → member → line so the answer matches zoom level.
3. **Fixed direction.** Definition always feeds usage.
4. **Meaningful nodes only.** Symbol index holds addressable units (classes, methods) — signal over noise.

## Indexed vs inert (verified)

Fixture: `fixtures/demo`, `OrderService.checkout` expanded:

| Token | Kind | Behavior |
| ----- | ---- | -------- |
| `checkout` | method (self) | interactive chip |
| `charge` | method (other) | edge → `PaymentGateway.charge` |
| `PaymentGateway` | class | edge → class node |
| `orders`, `gateway` | property | inert |
| `amount`, `id` | local/param | inert |

Parser only indexes class and method names today (`server/src/parser.ts`).

## Use cases (today)

1. Trace call to definition inside ego-graph
2. Cross-file load via reference card (`/api/focus`)
3. Ctrl sweep for impact preview before refactor
4. Onboarding hop-by-hop from one entry point

## Roadmap (variables/properties)

Enabling data-flow edges requires scoped identity in the index — now specified as a normative contract in [parser-index.md § Scoped identity contract](../service/parser-index.md#scoped-identity-contract-normative), not just this roadmap note:

- Index properties, parameters, scope-aware locals in `parser.ts` / `indexer.ts`
- Identity MUST be `(filePath, enclosingSymbol, name)` — never bare `name`
- Rendering already supports line anchors (`previewLineHandle`)

**Constraint:** Even with broader index, edges MUST stay on-demand preview — never a persistent layer.

## Design constraints (normative)

- **Scope before connect** — qualified identity for locals/properties
- **Stay on-demand** — calm default, hover-summoned edges only
- **Anchor to attention** — finest revealed anchor wins
- **Fixed direction** — definition → usage; fan-out from definitions
